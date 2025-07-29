import { upsertPageByTitle } from "@/utils/notion-api";
import { stripeCustomerToNotionProperties } from "@/converters/customer";
import { stripeProductToNotionProperties } from "@/converters/product";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type Stripe from "stripe";
import { getCoordinator } from "./utils";

/**
 * Coordinated customer upsert that prevents race conditions
 */
export async function coordinatedUpsertCustomer(
  context: HandlerContext,
  customerId: string,
  customerDatabaseId: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: 'customer',
      stripeId: customerId,
      notionToken: context.notionToken,
      databaseId: customerDatabaseId,
      titleProperty: 'Customer ID',
      forceUpdate: true, // Always update for direct customer events
      upsertOperation: async () => {
        // Original upsert logic
        const expandedCustomer = await context.stripe.customers.retrieve(customerId, {
          expand: [
            'subscriptions',
            'sources', 
            'invoice_settings.default_payment_method',
            'default_source'
          ]
        }, { stripeAccount: context.stripeAccountId });
        
        if (expandedCustomer.deleted) {
          throw new Error(`Customer ${customerId} is deleted`);
        }
        
        const customerProperties = stripeCustomerToNotionProperties(expandedCustomer as Stripe.Customer);
        const result = await upsertPageByTitle(
          context.notionToken,
          customerDatabaseId,
          "Customer ID",
          expandedCustomer.id,
          customerProperties
        );
        
        return result;
      }
    });

    // Clear any previous errors for customer database since we succeeded
    await context.account.setEntityError('customer', null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertCustomer for ${customerId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated product upsert that prevents race conditions
 */
export async function coordinatedUpsertProduct(
  context: HandlerContext,
  productId: string,
  productDatabaseId: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: 'product',
      stripeId: productId,
      notionToken: context.notionToken,
      databaseId: productDatabaseId,
      titleProperty: 'Product ID',
      forceUpdate: true, // Always update for direct product events
      upsertOperation: async () => {
        // Retrieve product (no expansion needed)
        const product = await context.stripe.products.retrieve(productId, {}, { stripeAccount: context.stripeAccountId });

        const productProperties = stripeProductToNotionProperties(product);
        const result = await upsertPageByTitle(
          context.notionToken,
          productDatabaseId,
          "Product ID",
          product.id,
          productProperties
        );
        
        return result;
      }
    });

    // Clear any previous errors for product database since we succeeded
    await context.account.setEntityError('product', null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertProduct for ${productId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}