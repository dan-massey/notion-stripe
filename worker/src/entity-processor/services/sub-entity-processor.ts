import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { Databases } from "@/durable-objects/account-do";
import type { StripeTypeMap } from "@/entity-processor/entity-config";
import type { StepWrapper } from "./notion-sync-service";
import type { DependencyProcessor } from "./dependency-processor";
import { coordinatedUpsert } from "@/upload-coordinator";
import { ENTITY_REGISTRY } from "../entity-registry";
import { Stripe } from "stripe";
import { defaultStepWrapper } from "@/workflows/utils/default-step-wrapper";

export interface ISubEntityProcessor {
  processSubEntities(
    parent: any,
    databases: Databases,
    parentNotionPageId: string,
    stepWrapper: StepWrapper
  ): Promise<void>;
}

/**
 * Abstract base class for processing sub-entities (child entities)
 */
export abstract class SubEntityProcessor<
  TParent,
  TChild,
  TSubEntityType extends DatabaseEntity
> implements ISubEntityProcessor
{
  constructor(
    protected handlerContext: HandlerContext,
    protected dependencyProcessor: DependencyProcessor
  ) {}

  /**
   * Process all sub-entities for a parent entity
   */
  abstract processSubEntities(
    parent: TParent,
    databases: Databases,
    parentNotionPageId: string,
    stepWrapper: StepWrapper
  ): Promise<void>;

  /**
   * Get sub-entities from the parent entity
   */
  protected abstract getSubEntities(parent: TParent): TChild[];

  /**
   * Get the sub-entity type name
   */
  protected abstract getSubEntityType(): TSubEntityType;

  /**
   * Get the database ID for the sub-entity type
   */
  protected abstract getDatabaseId(databases: Databases): string | undefined;

  /**
   * Process a single sub-entity
   */
  protected async processSingleSubEntity(
    subEntity: TChild,
    databases: Databases,
    parentNotionPageId: string,
    parentEntityType: string,
    stepWrapper: StepWrapper = defaultStepWrapper
  ): Promise<void> {
    const subEntityType = this.getSubEntityType();
    const subEntityId = (subEntity as { id: string }).id;

    if (!subEntityId) {
      console.warn(`${subEntityType} ID is missing`);
      return;
    }

    try {
      console.log(`Processing ${subEntityType} ${subEntityId}`);

      // Resolve dependencies for the sub-entity
      const dependencyPageIds =
        await this.dependencyProcessor.resolveDependencies(
          subEntityType,
          subEntity as StripeTypeMap[TSubEntityType],
          databases,
          stepWrapper
        );

      // Use the parent entity page ID for the parent relation
      dependencyPageIds[parentEntityType] = parentNotionPageId;

      // Convert to Notion properties
      const config = ENTITY_REGISTRY[subEntityType];
      const notionProperties = config.convertToNotionProperties(
        subEntity as StripeTypeMap[TSubEntityType],
        dependencyPageIds
      );

      // Upsert the sub-entity
      const databaseId = this.getDatabaseId(databases);
      if (!databaseId) {
        console.warn(`${subEntityType} database ID not available`);
        return;
      }

      const result: string | undefined = await stepWrapper(
        `Upsert ${subEntityType} ${subEntityId} to Notion DatabaseId ${databaseId}`,
        async () => {
          return await coordinatedUpsert(
            this.handlerContext,
            subEntityType,
            subEntityId,
            databaseId,
            notionProperties
          );
        }
      );

      if (result) {
        console.log(
          `✅ Successfully processed ${subEntityType} ${subEntityId}`
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to process ${subEntityType} ${subEntityId}:`,
        error
      );
      // Continue processing other sub-entities even if one fails
    }
  }
}

/**
 * Processor for invoice line items
 */
export class InvoiceLineItemProcessor extends SubEntityProcessor<
  StripeTypeMap["invoice"],
  Stripe.InvoiceLineItem,
  "line_item"
> {
  protected getSubEntityType(): "line_item" {
    return "line_item";
  }

  protected getDatabaseId(databases: Databases): string | undefined {
    return databases.line_item.pageId;
  }

  protected getSubEntities(
    invoice: StripeTypeMap["invoice"]
  ): Stripe.InvoiceLineItem[] {
    return invoice.lines?.data || [];
  }

  async processSubEntities(
    invoice: StripeTypeMap["invoice"],
    databases: Databases,
    invoiceNotionPageId: string,
    stepWrapper: StepWrapper = defaultStepWrapper
  ): Promise<void> {
    if (!invoice.id) {
      console.warn("Invoice ID is missing, cannot process line items");
      return;
    }

    const processLineItems = async () => {
      console.log(`🧾 Processing line items for invoice ${invoice.id}`);

      const lineItems = this.getSubEntities(invoice);

      if (!lineItems.length) {
        console.log(`No line items found for invoice ${invoice.id}`);
        return;
      }

      console.log(
        `Found ${lineItems.length} line items for invoice ${invoice.id}`
      );

      // Process each line item
      for (const [index, lineItem] of lineItems.entries()) {
        const processLineItem = async () => {
          await this.processSingleSubEntity(
            lineItem,
            databases,
            invoiceNotionPageId,
            "invoice",
            stepWrapper
          );
        };

        await stepWrapper(
          `Process line item ${index + 1}/${lineItems.length}: ${lineItem.id}`,
          processLineItem
        );
      }

      console.log(
        `🏁 Finished processing line items for invoice ${invoice.id}`
      );
    };

    await stepWrapper(
      `Process line items for invoice ${invoice.id}`,
      processLineItems
    );
  }
}

/**
 * Processor for subscription items
 */
export class SubscriptionItemProcessor extends SubEntityProcessor<
  StripeTypeMap["subscription"],
  Stripe.SubscriptionItem,
  "subscription_item"
> {
  protected getSubEntityType(): "subscription_item" {
    return "subscription_item";
  }

  protected getDatabaseId(databases: Databases): string | undefined {
    return databases.subscription_item?.pageId;
  }

  protected getSubEntities(
    subscription: StripeTypeMap["subscription"]
  ): Stripe.SubscriptionItem[] {
    return subscription.items?.data || [];
  }

  async processSubEntities(
    subscription: StripeTypeMap["subscription"],
    databases: Databases,
    subscriptionNotionPageId: string,
    stepWrapper: StepWrapper = defaultStepWrapper
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

      const subscriptionItems = this.getSubEntities(subscription);

      if (!subscriptionItems.length) {
        console.log(
          `No subscription items found for subscription ${subscription.id}`
        );
        return;
      }

      console.log(
        `Found ${subscriptionItems.length} subscription items for subscription ${subscription.id}`
      );

      // Process each subscription item
      for (const [index, subscriptionItem] of subscriptionItems.entries()) {
        const processSubscriptionItem = async () => {
          await this.processSingleSubEntity(
            subscriptionItem,
            databases,
            subscriptionNotionPageId,
            "subscription",
            stepWrapper
          );
        };

        await stepWrapper(
          `Process subscription item ${index + 1}/${
            subscriptionItems.length
          }: ${subscriptionItem.id}`,
          processSubscriptionItem
        );
      }

      console.log(
        `🏁 Finished processing subscription items for subscription ${subscription.id}`
      );
    };

    await stepWrapper(
      `Process subscription items for subscription ${subscription.id}`,
      processItems
    );
  }
}
