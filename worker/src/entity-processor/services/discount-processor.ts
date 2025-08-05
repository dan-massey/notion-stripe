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
   * Extract discount objects from entities that may have discounts
   */
  extractDiscountsFromEntity(
    entity: StripeTypeMap[DatabaseEntity],
    entityType: "customer" | "invoice" | "subscription" | "invoiceitem"
  ): StripeTypeMap["discount"][] {
    const discounts: StripeTypeMap["discount"][] = [];
    
    // Handle different discount structures based on entity type
    if (entityType === "invoice" || entityType === "subscription" || entityType === "invoiceitem") {
      // These entities have 'discounts' array
      if ("discounts" in entity && Array.isArray(entity.discounts)) {
        for (const discount of entity.discounts) {
          // Only process expanded discount objects (not string IDs or deleted discounts)
          if (discount && 
              typeof discount === 'object' && 
              typeof discount !== 'string' &&
              'id' in discount &&
              !('deleted' in discount)) {
            discounts.push(discount as StripeTypeMap["discount"]);
          }
        }
      }
    } else if (entityType === "customer") {
      // Customer has single 'discount' property
      if ("discount" in entity && entity.discount && 
          typeof entity.discount === 'object' &&
          'id' in entity.discount) {
        discounts.push(entity.discount);
      }
    }
    
    return discounts;
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

        // Merge relation page IDs with dependency page IDs
        // relationPageIds takes precedence for any matching keys
        const mergedPageIds = { ...dependencyPageIds, ...relationPageIds };

        // Convert to Notion properties
        const config = ENTITY_REGISTRY.discount;
        const notionProperties = config.convertToNotionProperties(
          discountObject,
          mergedPageIds
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
   * Process discounts when an entity with discount occurs
   */
  async processEntityDiscount(
    entity: StripeTypeMap[DatabaseEntity],
    entityType: "customer" | "invoice" | "subscription" | "invoiceitem",
    databases: Databases,
    entityNotionPageId: string,
    stepWrapper: StepWrapper = defaultStepWrapper
  ): Promise<void> {
    // Extract discounts from the entity
    const discountObjects = this.extractDiscountsFromEntity(entity, entityType);

    if (discountObjects.length === 0) {
      console.log(`No discounts found for ${entityType} ${entity.id}`);
      return;
    }

    console.log(`💰 Processing ${discountObjects.length} discount(s) for ${entityType} ${entity.id}`);

    // Use the parent entity page ID for the appropriate relation
    const relationPageIds: Record<string, string> = {};
    relationPageIds[entityType] = entityNotionPageId;

    // Process each discount
    for (const discountObject of discountObjects) {
      await this.processDiscount(
        discountObject,
        databases,
        relationPageIds,
        stepWrapper
      );
    }
  }
}
