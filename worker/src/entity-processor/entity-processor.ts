import type { DatabaseEntity, ApiStripeObject, StripeApiObject } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { StripeEntityCoordinator } from "@/durable-objects/stripe-entity-coordinator-do";
import type {
  AccountDurableObject,
  Databases,
} from "@/durable-objects/account-do";
import type {
  StripeTypeMap,
  DependencyResolutionParams,
} from "@/entity-processor/entity-config";
import { Stripe } from "stripe";
import { coordinatedUpsert } from "@/upload-coordinator";
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
  private entitiesProcessedCount = 0;

  constructor(private context: ProcessingContext) {}

  /**
   * Get the current count of entities processed
   */
  getEntitiesProcessedCount(): number {
    return this.entitiesProcessedCount;
  }

  /**
   * Reset the entities processed counter
   */
  resetCounter(): void {
    this.entitiesProcessedCount = 0;
  }

  /**
   * Increment the entities processed counter
   */
  private incrementCounter(): void {
    this.entitiesProcessedCount++;
  }

  /**
   * Process a single entity - retrieves from Stripe, converts to Notion properties, and upserts
   */
  async processEntity<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databases: Databases,
    dependencyPageIds: Record<string, string | null> = {},
    stepWrapper?: StepWrapper
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

      // Retrieve expanded entity from Stripe (wrapped in stepWrapper if available)
      let expandedEntity: StripeTypeMap[K];
      if (stepWrapper) {
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
              notionProperties
            );
          }
        );
      } else {
        result = await coordinatedUpsert(
          handlerContext,
          entityType,
          entityId,
          databases[entityType].pageId!,
          notionProperties
        );
      }

      if (result) {
        this.incrementCounter();
        console.log(
          `✅ Successfully processed ${entityType} ${entityId} (${this.entitiesProcessedCount} total)`
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
  async processDependencies<K extends DatabaseEntity>(
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
          const dependencyPageId = await this.processEntityWithDependencies(
            depEntityType,
            stripeId,
            databases,
            stepWrapper
          );

          pageIds[depEntityType] = dependencyPageId || null;
          console.log(
            `✅ Processed dependency ${depEntityType} ${stripeId}: ${dependencyPageId}`
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
  async processEntityWithDependencies<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<string | undefined> {
    const config = ENTITY_REGISTRY[entityType];
    if (!config) {
      throw new Error(`No configuration found for entity type: ${entityType}`);
    }

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

    // Process the main entity
    const mainEntityPageId = await this.processEntity(
      entityType,
      entityId,
      databases,
      dependencyPageIds,
      stepWrapper
    );

    return mainEntityPageId;
  }

  /**
   * Process invoice line items when an invoice event occurs
   */
  async processInvoiceLineItems(
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
              this.incrementCounter();
              console.log(
                `✅ Successfully processed line item ${lineItem.id} (${this.entitiesProcessedCount} total)`
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
  async processSubscriptionItems(
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

            if (result) {
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
   * Process discount when an entity with discount occurs
   */
  async processEntityDiscount(
    entity: StripeTypeMap[DatabaseEntity],
    entityType: "customer" | "invoice" | "subscription" | "invoiceitem",
    databases: Databases,
    entityNotionPageId: string,
    stepWrapper?: StepWrapper
  ): Promise<void> {
    const processDiscount = async () => {
      if (!("discount" in entity) || !entity.discount) {
        console.log(`No discount found for ${entityType} ${entity.id}`);
        return;
      }

      console.log(`💰 Processing discount for ${entityType} ${entity.id}`);

      const discountDatabaseId = databases.discount?.pageId;
      if (!discountDatabaseId) {
        console.warn("Discount database ID not available");
        return;
      }

      try {
        console.log(
          `Processing discount ${entity.discount.id} for ${entityType} ${entity.id}`
        );

        // Resolve dependencies for the discount
        const dependencyPageIds = await this.processDependencies(
          "discount",
          entity.discount,
          databases,
          stepWrapper
        );

        // Use the parent entity page ID for the appropriate relation
        dependencyPageIds[entityType] = entityNotionPageId;

        // Convert to Notion properties
        const config = ENTITY_REGISTRY.discount;
        const notionProperties = config.convertToNotionProperties(
          entity.discount,
          dependencyPageIds
        );

        // Upsert the discount
        const handlerContext = this.createHandlerContext();
        const discountId: string = entity.discount.id;
        let result: string | undefined;
        if (stepWrapper) {
          stepWrapper(
            `Uploading discount ${entity.discount.id} to Notion ${discountDatabaseId}`,
            async () => {
              return await coordinatedUpsert(
                handlerContext,
                "discount",
                discountId,
                discountDatabaseId,
                notionProperties
              );
            }
          );
        } else {
          result = await coordinatedUpsert(
            handlerContext,
            "discount",
            discountId,
            discountDatabaseId,
            notionProperties
          );
        }

        if (result) {
          this.incrementCounter();
          console.log(
            `✅ Successfully processed discount ${entity.discount.id} (${this.entitiesProcessedCount} total)`
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to process discount ${entity.discount.id}:`,
          error
        );
        // Don't throw - discount processing shouldn't block the main entity
      }

      console.log(
        `🏁 Finished processing discount for ${entityType} ${entity.id}`
      );
    };

    if (stepWrapper) {
      await stepWrapper(
        `Process discount for ${entityType} ${entity.id}`,
        processDiscount
      );
    } else {
      await processDiscount();
    }
  }

  /**
   * Process entity with all its dependencies and sub-entities (line items, subscription items, discounts)
   */
  async processEntityWithSubEntities(
    entityType: DatabaseEntity,
    entityId: string,
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<ProcessingResult> {
    // Reset counter for this processing session
    this.resetCounter();

    // Step 1: Process the main entity with all its dependencies
    const mainEntityPageId = await this.processEntityWithDependencies(
      entityType,
      entityId,
      databases,
      stepWrapper
    );

    if (!mainEntityPageId) {
      return {
        entitiesProcessed: this.entitiesProcessedCount,
      };
    }

    // Step 2: Get the expanded entity for sub-entity processing
    const handlerContext = this.createHandlerContext();
    let expandedEntity: StripeTypeMap[DatabaseEntity];
    if (stepWrapper) {
      expandedEntity = await stepWrapper(
        `Retrieve ${entityType} ${entityId} from Stripe API`,
        async () => {
          return await ENTITY_REGISTRY[entityType].retrieveFromStripe(
            handlerContext,
            entityId
          );
        }
      );
    } else {
      expandedEntity = await ENTITY_REGISTRY[entityType].retrieveFromStripe(
        handlerContext,
        entityId
      );
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
      entitiesProcessed: this.entitiesProcessedCount,
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

  /**
   * Process a batch of entities with dependency resolution
   */
  async processBatch(
    entities: Array<{ entityType: DatabaseEntity; entityId: string }>,
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (const [index, { entityType, entityId }] of entities.entries()) {
      const processBatchItem = async (): Promise<ProcessingResult> => {
        console.log(
          `📦 Processing batch item ${index + 1}/${
            entities.length
          }: ${entityType} ${entityId}`
        );
        return await this.processEntityWithSubEntities(
          entityType,
          entityId,
          databases,
          stepWrapper
        );
      };

      let result: ProcessingResult;
      if (stepWrapper) {
        result = await stepWrapper(
          `Process batch item ${index + 1}/${
            entities.length
          }: ${entityType} ${entityId}`,
          processBatchItem
        );
      } else {
        result = await processBatchItem();
      }

      results.push(result);
    }

    return results;
  }
}
