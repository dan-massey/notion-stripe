import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { DependencyResolutionParams } from "./entity-config";
import type { Databases } from "@/account-do";
import { ENTITY_REGISTRY } from "./entity-registry";
import { resolveDependencies, validateDependencies } from "./dependency-resolver";
import { getCoordinator } from "./utils";
import { upsertPageByTitle } from "@/utils/notion-api";
import type { Stripe } from "stripe";

/**
 * Generic coordinated upsert function that works for any entity type
 * Replaces all specific coordinatedUpsert* functions
 */
export async function coordinatedUpsert(
  context: HandlerContext,
  entityType: DatabaseEntity,
  stripeId: string,
  params: DependencyResolutionParams
): Promise<string | undefined> {
  console.log(`🔄 Starting coordinatedUpsert for ${entityType} ${stripeId}`);
  
  const config = ENTITY_REGISTRY[entityType];
  if (!config) {
    throw new Error(`No configuration found for entity type: ${entityType}`);
  }

  // Get the database ID for this entity
  const databaseId = params.databaseIds[entityType];
  if (!databaseId) {
    throw new Error(`No database ID provided for entity type: ${entityType}`);
  }

  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: entityType,
      stripeId: stripeId,
      notionToken: context.notionToken,
      databaseId: databaseId,
      titleProperty: config.titleProperty,
      forceUpdate: true, // Always update for direct entity events
      upsertOperation: async () => {
        // Step 1: Retrieve expanded entity from Stripe
        console.log(`📡 Retrieving ${entityType} ${stripeId} from Stripe with expansions:`, config.stripeExpansions);
        const expandedEntity = await config.retrieveFromStripe(context, stripeId);
        console.log(`✅ Retrieved ${entityType} ${stripeId} from Stripe`);

        // Step 2: Resolve all dependencies
        console.log(`🔗 Resolving dependencies for ${entityType} ${stripeId}`);
        const resolvedDependencies = await resolveDependencies(
          context,
          entityType,
          expandedEntity,
          params
        );
        console.log(`✅ Resolved dependencies for ${entityType} ${stripeId}:`, resolvedDependencies.pageIds);

        // Step 3: Validate required dependencies
        validateDependencies(config, resolvedDependencies);

        // Step 4: Log any dependency resolution errors (but don't fail)
        if (resolvedDependencies.errors.length > 0) {
          console.warn(
            `Dependency resolution errors for ${entityType} ${stripeId}:`,
            resolvedDependencies.errors.map(e => `${e.entityType}: ${e.error.message}`)
          );
        }

        // Step 5: Convert to Notion properties using resolved dependencies
        console.log(`🔄 Converting ${entityType} ${stripeId} to Notion properties`);
        const notionProperties = config.convertToNotionProperties(
          expandedEntity,
          resolvedDependencies.pageIds
        );
        console.log(`✅ Converted ${entityType} ${stripeId} to Notion properties`);

        // Step 6: Perform the actual upsert
        console.log(`💾 Upserting ${entityType} ${stripeId} to Notion database ${databaseId}`);
        const result = await upsertPageByTitle(
          context.notionToken,
          databaseId,
          config.titleProperty,
          stripeId,
          notionProperties
        );
        console.log(`✅ Successfully upserted ${entityType} ${stripeId} to Notion`);
        
        return result;
      }
    });

    // Clear any previous errors for this entity since we succeeded
    await context.account.setEntityError(entityType, null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsert for ${entityType} ${stripeId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Special coordinated upsert function for discounts
 * Discounts are not retrieved by ID - they're passed as objects from parent entities
 */
export async function coordinatedUpsertDiscount(
  context: HandlerContext,
  discount: Stripe.Discount,
  databases: Databases,
  parentNotionPageId: string,
  parentEntityType: 'customer' | 'invoice' | 'subscription' | 'invoiceitem'
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);
  const discountDatabaseId = databases.discount.pageId;
  
  if (!discountDatabaseId) {
    throw new Error("Discount database ID not available");
  }

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "discount",
      stripeId: discount.id,
      notionToken: context.notionToken,
      databaseId: discountDatabaseId,
      titleProperty: "Discount ID",
      forceUpdate: true,
      upsertOperation: async () => {
        // Resolve dependencies using the entity registry
        const params: DependencyResolutionParams = { 
          databaseIds: {
            customer: databases.customer.pageId,
            coupon: databases.coupon.pageId,
            promotion_code: databases.promotion_code.pageId,
            subscription: databases.subscription.pageId,
            invoice: databases.invoice.pageId,
            invoiceitem: databases.invoiceitem.pageId
          }
        };
        
        const resolvedDependencies = await resolveDependencies(
          context,
          "discount",
          discount,
          params
        );

        // Use parent page ID for the appropriate relation
        resolvedDependencies.pageIds[parentEntityType] = parentNotionPageId;

        // Convert using the entity registry converter
        const config = ENTITY_REGISTRY.discount;
        const notionProperties = config.convertToNotionProperties(discount, resolvedDependencies.pageIds);

        // Perform the actual upsert
        const result = await upsertPageByTitle(
          context.notionToken,
          discountDatabaseId,
          config.titleProperty,
          discount.id,
          notionProperties
        );

        return result;
      }
    });

    // Clear any previous errors since we succeeded
    await context.account.setEntityError("discount", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertDiscount for ${discount.id}:`, error);
    throw error;
  }
}

/**
 * Special coordinated upsert function for line items
 * Line items are not retrieved by ID - they're passed as objects with pre-resolved dependencies
 */
export async function coordinatedUpsertLineItem(
  context: HandlerContext,
  lineItem: any, // Stripe.InvoiceLineItem
  databases: Databases,
  invoiceNotionPageId: string | null,
  priceNotionPageId?: string | null
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);
  const lineItemDatabaseId = databases.line_item.pageId;
  
  if (!lineItemDatabaseId) {
    throw new Error("Line item database ID not available");
  }

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "line_item",
      stripeId: lineItem.id,
      notionToken: context.notionToken,
      databaseId: lineItemDatabaseId,
      titleProperty: "Line Item ID",
      forceUpdate: true,
      upsertOperation: async () => {
        // Resolve dependencies using the entity registry
        const params: DependencyResolutionParams = { 
          databaseIds: {
            invoice: databases.invoice.pageId,
            price: databases.price.pageId,
            subscription: databases.subscription.pageId,
            subscription_item: databases.subscription_item.pageId,
            invoiceitem: databases.invoiceitem.pageId
          }
        };
        
        const resolvedDependencies = await resolveDependencies(
          context,
          "line_item",
          lineItem,
          params
        );

        // Use pre-resolved invoice and price page IDs when available
        if (invoiceNotionPageId) {
          resolvedDependencies.pageIds.invoice = invoiceNotionPageId;
        }
        if (priceNotionPageId) {
          resolvedDependencies.pageIds.price = priceNotionPageId;
        }

        // Convert using the entity registry converter
        const config = ENTITY_REGISTRY.line_item;
        const notionProperties = config.convertToNotionProperties(lineItem, resolvedDependencies.pageIds);

        // Perform the actual upsert
        const result = await upsertPageByTitle(
          context.notionToken,
          lineItemDatabaseId,
          config.titleProperty,
          lineItem.id,
          notionProperties
        );

        return result;
      }
    });

    // Clear any previous errors since we succeeded
    await context.account.setEntityError("line_item", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertLineItem for ${lineItem.id}:`, error);
    throw error;
  }
}

