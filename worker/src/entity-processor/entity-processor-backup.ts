import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { StripeEntityCoordinator } from "@/durable-objects/stripe-entity-coordinator-do";
import type {
  AccountDurableObject,
  Databases,
} from "@/durable-objects/account-do";
import type {
  StripeTypeMap,
} from "@/entity-processor/entity-config";
import { Stripe } from "stripe";
import { coordinatedUpsert } from "@/upload-coordinator";
import { getCoordinator } from "@/upload-coordinator/utils";
import { ENTITY_REGISTRY } from "./entity-registry";

interface ProcessingContext {
  stripeAccountId: string;
  notionToken: string;
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>;
  stripe: Stripe;
  account?: DurableObjectStub<AccountDurableObject>;
}

interface ProcessingResult {
  notionPageId?: string;
  entitiesProcessed: number;
}

interface WorkflowProcessingParams {
  stripeAccountId: string;
  notionToken: string;
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>;
  stripe: Stripe;
  accountStub: DurableObjectStub<AccountDurableObject>;
}

type StepWrapper = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

// Type guards for entity types
function isInvoice(
  entity: StripeTypeMap[DatabaseEntity]
): entity is StripeTypeMap["invoice"] {
  return "lines" in entity && "status" in entity && "amount_due" in entity;
}

function isSubscription(
  entity: StripeTypeMap[DatabaseEntity]
): entity is StripeTypeMap["subscription"] {
  return (
    "items" in entity && "status" in entity && "current_period_start" in entity
  );
}

export class EntityProcessor {
  private processedEntities = new Set<string>();

  constructor(private context: ProcessingContext) {}

  /**
   * Get the current count of entities processed
   */
  getEntitiesProcessedCount(): number {
    return this.processedEntities.size;
  }

  /**
   * Reset the entities processed counter
   */
  private resetCounter(): void {
    this.processedEntities.clear();
  }

  /**
   * Process a single entity - retrieves from Stripe, converts to Notion properties, and upserts
   */
  private async processEntity<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databases: Databases,
    dependencyPageIds: Record<string, string | null> = {},
    stepWrapper?: StepWrapper,
    forceUpdate: boolean = false,
    preRetrievedEntity?: StripeTypeMap[K]
  ): Promise<string | undefined> {
    const handlerContext = this.createHandlerContext();

    // Check if the main database for this entity exists
    if (!databases[entityType].pageId) {
      return undefined;
    }

    const processEntityStep = async (): Promise<string | undefined> => {
      const config = ENTITY_REGISTRY[entityType];
      if (!config) {
        throw new Error(
          `No configuration found for entity type: ${entityType}`
        );
      }

      // Use pre-retrieved entity if available, otherwise retrieve from Stripe
      let expandedEntity: StripeTypeMap[K];
      if (preRetrievedEntity) {
        expandedEntity = preRetrievedEntity;
      } else if (stepWrapper) {
        expandedEntity = await stepWrapper(
          `Retrieve ${entityType} ${entityId} from Stripe API`,
          async () => {
            const entity = await config.retrieveFromStripe(
              handlerContext,
              entityId
            );
            return entity;
          }
        );
      } else {
        expandedEntity = await config.retrieveFromStripe(
          handlerContext,
          entityId
        );
      }

      // Convert to Notion properties using resolved dependencies
      const notionProperties = config.convertToNotionProperties(
        expandedEntity,
        dependencyPageIds
      );

      // Perform the coordinated upsert (wrapped in stepWrapper if available)
      let result: string | undefined;
      if (stepWrapper) {
        result = await stepWrapper(
          `Upsert ${entityType} ${entityId} to Notion`,
          async () => {
            return await coordinatedUpsert(
              handlerContext,
              entityType,
              entityId,
              databases[entityType].pageId!,
              notionProperties,
              forceUpdate
            );
          }
        );
      } else {
        result = await coordinatedUpsert(
          handlerContext,
          entityType,
          entityId,
          databases[entityType].pageId!,
          notionProperties,
          forceUpdate
        );
      }

      if (result) {
        console.log(
          `✅ Successfully processed ${entityType} ${entityId}`
        );
      }

      return result;
    };

    if (stepWrapper) {
      return await stepWrapper(
        `Process ${entityType} ${entityId}`,
        processEntityStep
      );
    } else {
      return await processEntityStep();
    }
  }

  /**
   * Recursively resolve and process all dependencies for an entity
   */
  private async processDependencies<K extends DatabaseEntity>(
    entityType: K,
    expandedEntity: StripeTypeMap[K],
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<Record<string, string | null>> {
    const config = ENTITY_REGISTRY[entityType];
    if (!config || config.dependencies.length === 0) {
      return {};
    }

    console.log(
      `🔗 Processing dependencies for ${entityType}:`,
      config.dependencies.map((d) => d.entityType)
    );

    const pageIds: Record<string, string | null> = {};
    const processedDependencies = new Set<string>();

    // Process each dependency
    for (const [index, dependency] of config.dependencies.entries()) {
      const { entityType: depEntityType, extractStripeId } = dependency;

      const processDependencyStep = async (): Promise<void> => {
        // Check if we have a database ID for this dependency type
        const databaseId = databases[depEntityType]?.pageId;
        if (!databaseId) {
          console.log(`⚠️ No database ID for dependency ${depEntityType}`);
          pageIds[depEntityType] = null;
          return;
        }

        try {
          // Extract the Stripe ID for this dependency
          const stripeId = extractStripeId(expandedEntity);
          if (!stripeId) {
            console.log(`⚠️ No Stripe ID found for ${depEntityType}`);
            pageIds[depEntityType] = null;
            return;
          }

          // Avoid processing the same dependency multiple times
          const dependencyKey = `${depEntityType}:${stripeId}`;
          if (processedDependencies.has(dependencyKey)) {
            console.log(`♻️ Already processed ${depEntityType} ${stripeId}`);
            return;
          }
          processedDependencies.add(dependencyKey);

          // Recursively process this dependency and its dependencies
          const dependencyResult = await this.processEntityWithDependencies(
            depEntityType,
            stripeId,
            databases,
            stepWrapper
          );

          pageIds[depEntityType] = dependencyResult.pageId || null;
          console.log(
            `✅ Processed dependency ${depEntityType} ${stripeId}: ${dependencyResult.pageId}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to process dependency ${depEntityType}:`,
            error
          );
          pageIds[depEntityType] = null;
        }
      };

      if (stepWrapper) {
        await stepWrapper(
          `Process dependency ${index + 1}/${
            config.dependencies.length
          }: ${depEntityType}`,
          processDependencyStep
        );
      } else {
        await processDependencyStep();
      }
    }

    console.log(
      `🏁 Finished processing dependencies for ${entityType}:`,
      pageIds
    );
    return pageIds;
  }

  /**
   * Process an entity and all its dependencies recursively
   */
  private async processEntityWithDependencies<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<{ pageId: string | undefined; expandedEntity: StripeTypeMap[K] | undefined }> {
    const config = ENTITY_REGISTRY[entityType];
    if (!config) {
      throw new Error(`No configuration found for entity type: ${entityType}`);
    }

    // Check if this entity has already been processed in this session
    const entityKey = `${entityType}:${entityId}`;
    if (this.processedEntities.has(entityKey)) {
      console.log(`♻️ Entity ${entityKey} already processed in this session, skipping full processing`);
      
      // Still need to return the page ID for dependency resolution
      // Try to get it from the coordinator without full processing
      const handlerContext = this.createHandlerContext();
      const coordinator = getCoordinator(handlerContext, handlerContext.stripeAccountId);
      
      try {
        const mapping = await coordinator.getEntityMapping(entityType, entityId);
        return { pageId: mapping?.notionPageId, expandedEntity: undefined };
      } catch (error) {
        console.warn(`Failed to get cached page ID for ${entityKey}:`, error);
        return { pageId: undefined, expandedEntity: undefined };
      }
    }

    // Mark this entity as being processed
    this.processedEntities.add(entityKey);

    // First, retrieve the entity from Stripe to get its data for dependency resolution
    const handlerContext = this.createHandlerContext();
    let expandedEntity: StripeTypeMap[K];
    if (stepWrapper) {
      expandedEntity = await stepWrapper(
        `Retrieve ${entityType} ${entityId} from Stripe API`,
        async () => {
          return await config.retrieveFromStripe(handlerContext, entityId);
        }
      );
    } else {
      expandedEntity = await config.retrieveFromStripe(
        handlerContext,
        entityId
      );
    }

    // Process all dependencies first
    const dependencyPageIds = await this.processDependencies(
      entityType,
      expandedEntity,
      databases,
      stepWrapper
    );

    // Process the main entity using the already-retrieved entity
    const mainEntityPageId = await this.processEntity(
      entityType,
      entityId,
      databases,
      dependencyPageIds,
      stepWrapper,
      true,
      expandedEntity
    );

    return { pageId: mainEntityPageId, expandedEntity };
  }

  /**
   * Process invoice line items when an invoice event occurs
   */
  private async processInvoiceLineItems(
    invoice: StripeTypeMap["invoice"],
    databases: Databases,
    invoiceNotionPageId: string,
    stepWrapper?: StepWrapper
  ): Promise<void> {
    if (!invoice.id) {
      console.warn("Invoice ID is missing, cannot process line items");
      return;
    }

    const processLineItems = async () => {
      console.log(`🧾 Processing line items for invoice ${invoice.id}`);

      // Get the expanded invoice from the entity registry to ensure we have line items

      let expandedInvoice: Stripe.Invoice;
      if (stepWrapper) {
        expandedInvoice = await stepWrapper(
          `Retrieve invoice ${invoice.id} from Stripe`,
          async () => {
            return await ENTITY_REGISTRY.invoice.retrieveFromStripe(
              this.createHandlerContext(),
              invoice.id!
            );
          }
        );
      } else {
        expandedInvoice = await ENTITY_REGISTRY.invoice.retrieveFromStripe(
          this.createHandlerContext(),
          invoice.id!
        );
      }

      if (!expandedInvoice.lines?.data?.length) {
        console.log(`No line items found for invoice ${invoice.id}`);
        return;
      }

      console.log(
        `Found ${expandedInvoice.lines.data.length} line items for invoice ${invoice.id}`
      );

      const lineItemDatabaseId = databases.line_item.pageId;
      if (!lineItemDatabaseId) {
        console.warn("Line item database ID not available");
        return;
      }

      // Process each line item
      for (const [index, lineItem] of expandedInvoice.lines.data.entries()) {
        const processLineItem = async () => {
          try {
            console.log(
              `Processing line item ${lineItem.id} for invoice ${invoice.id}`
            );

            // Resolve dependencies for the line item
            const dependencyPageIds = await this.processDependencies(
              "line_item",
              lineItem,
              databases,
              stepWrapper
            );

            // Use the invoice page ID for the invoice relation
            dependencyPageIds.invoice = invoiceNotionPageId;

            // Convert to Notion properties
            const config = ENTITY_REGISTRY.line_item;
            const notionProperties = config.convertToNotionProperties(
              lineItem,
              dependencyPageIds
            );

            // Upsert the line item
            const handlerContext = this.createHandlerContext();
            let result: string | undefined;
            if (stepWrapper) {
              result = await stepWrapper(
                `Upsert LineItem ${lineItem.id} to Notion DatabaseId ${lineItemDatabaseId}`,
                async () => {
                  return await coordinatedUpsert(
                    handlerContext,
                    "line_item",
                    lineItem.id,
                    lineItemDatabaseId,
                    notionProperties
                  );
                }
              );
            } else {
              result = await coordinatedUpsert(
                handlerContext,
                "line_item",
                lineItem.id,
                lineItemDatabaseId,
                notionProperties
              );
            }

            if (result) {
              console.log(
                `✅ Successfully processed line item ${lineItem.id}`
              );
            }
          } catch (error) {
            console.error(
              `❌ Failed to process line item ${lineItem.id}:`,
              error
            );
            // Continue processing other line items even if one fails
          }
        };

        if (stepWrapper) {
          await stepWrapper(
            `Process line item ${index + 1}/${
              expandedInvoice.lines.data.length
            }: ${lineItem.id}`,
            processLineItem
          );
        } else {
          await processLineItem();
        }
      }

      console.log(
        `🏁 Finished processing line items for invoice ${invoice.id}`
      );
    };

    if (stepWrapper) {
      await stepWrapper(
        `Process line items for invoice ${invoice.id}`,
        processLineItems
      );
    } else {
      await processLineItems();
    }
  }

  /**
   * Process subscription items when a subscription event occurs
   */
  private async processSubscriptionItems(
    subscription: StripeTypeMap["subscription"],
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<void> {
    if (!subscription.id) {
      console.warn(
        "Subscription ID is missing, cannot process subscription items"
      );
      return;
    }

    const processItems = async () => {
      console.log(
        `🧾 Processing subscription items for subscription ${subscription.id}`
      );

      // Get the expanded subscription from the entity registry to ensure we have subscription items
      const handlerContext = this.createHandlerContext();
      let expandedSubscription: Stripe.Subscription;
      if (stepWrapper) {
        expandedSubscription = await stepWrapper(
          `Retrieve invoice ${subscription.id} from Stripe`,
          async () => {
            return await ENTITY_REGISTRY.subscription.retrieveFromStripe(
              handlerContext,
              subscription.id!
            );
          }
        );
      } else {
        expandedSubscription =
          await ENTITY_REGISTRY.subscription.retrieveFromStripe(
            handlerContext,
            subscription.id!
          );
      }

      if (!expandedSubscription.items.data?.length) {
        console.log(
          `No subscription items found for subscription ${expandedSubscription.id}`
        );
        return;
      }

      console.log(
        `Found ${expandedSubscription.items.data.length} subscription items for subscription ${expandedSubscription.id}`
      );

      // Process each subscription item
      for (const [
        index,
        subscriptionItem,
      ] of expandedSubscription.items.data.entries()) {
        const processSubscriptionItem = async () => {
          try {
            console.log(
              `Processing subscription item ${subscriptionItem.id} for subscription ${expandedSubscription.id}`
            );

            const result = await this.processEntityWithDependencies(
              "subscription_item",
              subscriptionItem.id,
              databases,
              stepWrapper
            );

            if (result.pageId) {
              console.log(
                `✅ Successfully processed subscription item ${subscriptionItem.id}`
              );
            }
          } catch (error) {
            console.error(
              `❌ Failed to process subscription item ${subscriptionItem.id}:`,
              error
            );
            // Continue processing other subscription items even if one fails
          }
        };

        if (stepWrapper) {
          await stepWrapper(
            `Process subscription item ${index + 1}/${
              expandedSubscription.items.data.length
            }: ${subscriptionItem.id}`,
            processSubscriptionItem
          );
        } else {
          await processSubscriptionItem();
        }
      }

      console.log(
        `🏁 Finished processing subscription items for subscription ${expandedSubscription.id}`
      );
    };

    if (stepWrapper) {
      await stepWrapper(
        `Process subscription items for subscription ${subscription.id}`,
        processItems
      );
    } else {
      await processItems();
    }
  }

  /**
   * Extract discount object from entities that may have discounts
   */
  private getDiscountFromEntity(
    entity: StripeTypeMap[DatabaseEntity],
    entityType: "customer" | "invoice" | "subscription" | "invoiceitem"
  ): StripeTypeMap["discount"] | null {
    if (!("discount" in entity) || !entity.discount) {
      return null;
    }
    return entity.discount;
  }

  /**
   * Process discount object directly
   */
  private async processDiscount(
    discountObject: StripeTypeMap["discount"],
    databases: Databases,
    relationPageIds: Record<string, string> = {},
    stepWrapper?: StepWrapper
  ): Promise<void> {
    const processDiscountDirect = async () => {
      console.log(`💰 Processing discount ${discountObject.id}`);

      const discountDatabaseId = databases.discount?.pageId;
      if (!discountDatabaseId) {
        console.warn("Discount database ID not available");
        return;
      }

      try {
        console.log(`Processing discount ${discountObject.id}`);

        // Resolve dependencies for the discount
        const dependencyPageIds = await this.processDependencies(
          "discount",
          discountObject,
          databases,
          stepWrapper
        );

        // Merge in any relation page IDs that were passed in
        Object.assign(dependencyPageIds, relationPageIds);

        // Convert to Notion properties
        const config = ENTITY_REGISTRY.discount;
        const notionProperties = config.convertToNotionProperties(
          discountObject,
          dependencyPageIds
        );

        // Upsert the discount
        const handlerContext = this.createHandlerContext();
        const discountId: string = discountObject.id;
        let result: string | undefined;
        if (stepWrapper) {
          result = await stepWrapper(
            `Uploading discount ${discountObject.id} to Notion ${discountDatabaseId}`,
            async () => {
              return await coordinatedUpsert(
                handlerContext,
                "discount",
                discountId,
                discountDatabaseId,
                notionProperties,
                true // force update
              );
            }
          );
        } else {
          result = await coordinatedUpsert(
            handlerContext,
            "discount",
            discountId,
            discountDatabaseId,
            notionProperties,
            true // force update
          );
        }

        if (result) {
          console.log(`✅ Successfully processed discount ${discountObject.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process discount ${discountObject.id}:`, error);
        // Don't throw - discount processing shouldn't block the main entity
      }

      console.log(`🏁 Finished processing discount ${discountObject.id}`);
    };

    if (stepWrapper) {
      await stepWrapper(
        `Process discount ${discountObject.id}`,
        processDiscountDirect
      );
    } else {
      await processDiscountDirect();
    }
  }

  /**
   * Process discount when an entity with discount occurs
   */
  private async processEntityDiscount(
    entity: StripeTypeMap[DatabaseEntity],
    entityType: "customer" | "invoice" | "subscription" | "invoiceitem",
    databases: Databases,
    entityNotionPageId: string,
    stepWrapper?: StepWrapper
  ): Promise<void> {
    // Extract discount from the entity
    const discountObject = this.getDiscountFromEntity(entity, entityType);
    
    if (!discountObject) {
      console.log(`No discount found for ${entityType} ${entity.id}`);
      return;
    }

    console.log(`💰 Processing discount for ${entityType} ${entity.id}`);

    // Use the parent entity page ID for the appropriate relation
    const relationPageIds: Record<string, string> = {};
    relationPageIds[entityType] = entityNotionPageId;

    // Process the discount using the new processDiscount method
    await this.processDiscount(discountObject, databases, relationPageIds, stepWrapper);
  }

  /**
   * Process entity with all its dependencies and sub-entities (line items, subscription items, discounts)
   */
  async processEntityWithSubEntities(
    entityType: DatabaseEntity,
    entityId: string,
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<ProcessingResult>;

  /**
   * Process discount object directly from webhook event
   */
  async processEntityWithSubEntities(
    entityType: "discount",
    discountObject: StripeTypeMap["discount"],
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<ProcessingResult>;

  async processEntityWithSubEntities(
    entityTypeOrDiscount: DatabaseEntity | "discount",
    entityIdOrObject: string | StripeTypeMap["discount"],
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<ProcessingResult> {
    // Reset counter for this processing session
    this.resetCounter();

    // Handle discount objects directly
    if (entityTypeOrDiscount === "discount" && typeof entityIdOrObject === "object") {
      const discountObject = entityIdOrObject as StripeTypeMap["discount"];
      
      // Check if the discount database exists
      if (!databases.discount?.pageId) {
        console.warn("Discount database ID not available");
        return {
          entitiesProcessed: this.getEntitiesProcessedCount(),
        };
      }

      // Process the discount directly
      await this.processDiscount(discountObject, databases, {}, stepWrapper);

      return {
        notionPageId: undefined, // We don't track the discount page ID in this flow
        entitiesProcessed: this.getEntitiesProcessedCount(),
      };
    }

    // Handle normal entities
    const entityType = entityTypeOrDiscount as DatabaseEntity;
    const entityId = entityIdOrObject as string;

    // Step 1: Process the main entity with all its dependencies
    const result = await this.processEntityWithDependencies(
      entityType,
      entityId,
      databases,
      stepWrapper
    );

    const mainEntityPageId = result.pageId;
    const expandedEntity = result.expandedEntity;

    if (!mainEntityPageId || !expandedEntity) {
      return {
        entitiesProcessed: this.getEntitiesProcessedCount(),
      };
    }

    // Step 3: Special handling for invoice events - process line items
    if (
      entityType === "invoice" &&
      mainEntityPageId &&
      isInvoice(expandedEntity)
    ) {
      await this.processInvoiceLineItems(
        expandedEntity,
        databases,
        mainEntityPageId,
        stepWrapper
      );
    }

    // Step 4: Special handling for subscription events - process subscription items
    if (
      entityType === "subscription" &&
      mainEntityPageId &&
      isSubscription(expandedEntity)
    ) {
      await this.processSubscriptionItems(
        expandedEntity,
        databases,
        stepWrapper
      );
    }

    // Step 5: Special handling for entities with discounts - process discount
    if (
      mainEntityPageId &&
      (entityType === "customer" ||
        entityType === "invoice" ||
        entityType === "subscription" ||
        entityType === "invoiceitem")
    ) {
      await this.processEntityDiscount(
        expandedEntity,
        entityType,
        databases,
        mainEntityPageId,
        stepWrapper
      );
    }

    return {
      notionPageId: mainEntityPageId,
      entitiesProcessed: this.getEntitiesProcessedCount(),
    };
  }

  /**
   * Create handler context for coordinated upsert functions
   */
  private createHandlerContext(): HandlerContext {
    if (!this.context.account) {
      throw new Error("Account durable object is required for handler context");
    }

    return {
      stripeAccountId: this.context.stripeAccountId,
      notionToken: this.context.notionToken,
      stripe: this.context.stripe,
      account: this.context.account,
      env: {
        STRIPE_ENTITY_COORDINATOR: this.context.coordinatorNamespace,
      } as Pick<
        HandlerContext["env"],
        "STRIPE_ENTITY_COORDINATOR"
      > as HandlerContext["env"],
    };
  }

  /**
   * Create EntityProcessor from webhook handler context
   */
  static fromWebhook(handlerContext: HandlerContext): EntityProcessor {
    return new EntityProcessor({
      stripeAccountId: handlerContext.stripeAccountId,
      notionToken: handlerContext.notionToken,
      coordinatorNamespace: handlerContext.env.STRIPE_ENTITY_COORDINATOR,
      stripe: handlerContext.stripe,
      account: handlerContext.account,
    });
  }

  /**
   * Create EntityProcessor from workflow parameters
   */
  static fromWorkflow(params: WorkflowProcessingParams): EntityProcessor {
    return new EntityProcessor({
      stripeAccountId: params.stripeAccountId,
      notionToken: params.notionToken,
      coordinatorNamespace: params.coordinatorNamespace,
      stripe: params.stripe,
      account: params.accountStub,
    });
  }

}
