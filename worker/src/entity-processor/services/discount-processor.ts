import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { Databases } from "@/durable-objects/account-do";
import type { StripeTypeMap } from "@/entity-processor/entity-config";
import type { StepWrapper } from "./notion-sync-service";
import type { DependencyProcessor } from "./dependency-processor";
import { coordinatedUpsert } from "@/upload-coordinator";
import { ENTITY_REGISTRY } from "../entity-registry";
import { defaultStepWrapper } from "@/workflows/utils/default-step-wrapper";

/**
 * Service for processing Stripe discounts
 */
export class DiscountProcessor {
  constructor(
    private handlerContext: HandlerContext,
    private dependencyProcessor: DependencyProcessor
  ) {}

  /**
   * Extract discount object from entities that may have discounts
   */
  extractDiscountFromEntity(
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
  async processDiscount(
    discountObject: StripeTypeMap["discount"],
    databases: Databases,
    relationPageIds: Record<string, string> = {},
    stepWrapper: StepWrapper = defaultStepWrapper
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

        const dependencyPageIds = await stepWrapper(
          `Resolve dependencies for discount ${discountObject.id}`,
          async () => {
            return await this.dependencyProcessor.resolveDependencies(
              "discount",
              discountObject,
              databases,
              stepWrapper
            );
          }
        );

        // Convert to Notion properties
        const config = ENTITY_REGISTRY.discount;
        const notionProperties = config.convertToNotionProperties(
          discountObject,
          dependencyPageIds
        );

        // Upsert the discount
        const discountId: string = discountObject.id;
        const result = await stepWrapper(
          `Uploading discount ${discountObject.id} to Notion ${discountDatabaseId}`,
          async () => {
            return await coordinatedUpsert(
              this.handlerContext,
              "discount",
              discountId,
              discountDatabaseId,
              notionProperties,
              true // force update
            );
          }
        );

        if (result) {
          console.log(
            `✅ Successfully processed discount ${discountObject.id}`
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to process discount ${discountObject.id}:`,
          error
        );
        // Don't throw - discount processing shouldn't block the main entity
      }

      console.log(`🏁 Finished processing discount ${discountObject.id}`);
    };

    await stepWrapper(
      `Process discount ${discountObject.id}`,
      processDiscountDirect
    );
  }

  /**
   * Process discount when an entity with discount occurs
   */
  async processEntityDiscount(
    entity: StripeTypeMap[DatabaseEntity],
    entityType: "customer" | "invoice" | "subscription" | "invoiceitem",
    databases: Databases,
    entityNotionPageId: string,
    stepWrapper: StepWrapper = defaultStepWrapper
  ): Promise<void> {
    // Extract discount from the entity
    const discountObject = this.extractDiscountFromEntity(entity, entityType);

    if (!discountObject) {
      console.log(`No discount found for ${entityType} ${entity.id}`);
      return;
    }

    console.log(`💰 Processing discount for ${entityType} ${entity.id}`);

    // Use the parent entity page ID for the appropriate relation
    const relationPageIds: Record<string, string> = {};
    relationPageIds[entityType] = entityNotionPageId;

    // Process the discount using the processDiscount method
    await this.processDiscount(
      discountObject,
      databases,
      relationPageIds,
      stepWrapper
    );
  }
}
