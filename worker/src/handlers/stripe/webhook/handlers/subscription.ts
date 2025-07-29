import { stripeSubscriptionToNotionProperties } from "@/converters/subscription";
import { stripeInvoiceToNotionProperties } from "@/converters/invoice";
import { stripePriceToNotionProperties } from "@/converters/price";
import { stripeProductToNotionProperties } from "@/converters/product";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError, upsertCustomer } from "../shared/utils";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionDatabaseId = context.accountStatus.notionConnection?.databases?.subscription.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  const invoiceDatabaseId = context.accountStatus.notionConnection?.databases?.invoice.pageId;
  const priceDatabaseId = context.accountStatus.notionConnection?.databases?.price?.pageId;
  const productDatabaseId = context.accountStatus.notionConnection?.databases?.product?.pageId;
  
  if (!subscriptionDatabaseId) {
    console.warn("No subscription database set up");
    return { success: false, message: "No subscription database configured" };
  }

  try {
    let customerNotionPageId: string | undefined;
    let latestInvoiceNotionPageId: string | undefined;
    let primaryPriceNotionPageId: string | undefined;
    let primaryProductNotionPageId: string | undefined;
    
    // Step 1: Upsert customer first if present
    if (subscription.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        subscription.customer as string,
        customerDatabaseId
      );
    }
    
    // Step 2: Upsert latest invoice if present
    if (subscription.latest_invoice && invoiceDatabaseId) {
      const expandedInvoice = await context.stripe.invoices.retrieve(subscription.latest_invoice as string, {
        expand: [
          'customer',
          'subscription',
          'payment_intent',
          'default_payment_method',
          'default_source'
        ]
      }, { stripeAccount: context.stripeAccountId });
      
      const invoiceProperties = stripeInvoiceToNotionProperties(expandedInvoice, customerNotionPageId);
      const invoiceResult = await upsertPageByTitle(
        context.notionToken,
        invoiceDatabaseId,
        "Invoice ID",
        expandedInvoice.id as string,
        invoiceProperties
      );
      latestInvoiceNotionPageId = invoiceResult.id;
    }
    
    // Step 3: Retrieve expanded subscription to get primary price/product info
    const expandedSubscription = await context.stripe.subscriptions.retrieve(subscription.id, {
      expand: [
        'customer',
        'latest_invoice',
        'default_payment_method',
        'default_source',
        'items.data.price.product'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    // Step 4: Upsert primary price and product if they exist
    if (expandedSubscription.items?.data && expandedSubscription.items.data.length > 0) {
      const primaryItem = expandedSubscription.items.data[0];
      const price = primaryItem.price;
      
      // Upsert primary product first if databases are configured
      if (price.product && productDatabaseId) {
        let productToUpsert: Stripe.Product | undefined;
        
        if (typeof price.product === 'string') {
          // Need to fetch the full product object
          const retrievedProduct = await context.stripe.products.retrieve(price.product, {}, { stripeAccount: context.stripeAccountId });
          if (!retrievedProduct.deleted) {
            productToUpsert = retrievedProduct as Stripe.Product;
          }
        } else if (!price.product.deleted) {
          productToUpsert = price.product as Stripe.Product;
        }
        
        if (productToUpsert) {
          const productProperties = stripeProductToNotionProperties(productToUpsert);
          const productResult = await upsertPageByTitle(
            context.notionToken,
            productDatabaseId,
            "Product ID",
            productToUpsert.id,
            productProperties
          );
          primaryProductNotionPageId = productResult.id;
        }
      }
      
      // Upsert primary price if database is configured
      if (priceDatabaseId) {
        const priceProperties = stripePriceToNotionProperties(price);
        const priceResult = await upsertPageByTitle(
          context.notionToken,
          priceDatabaseId,
          "Price ID",
          price.id,
          priceProperties
        );
        primaryPriceNotionPageId = priceResult.id;
      }
    }
    
    // Step 5: Upsert subscription
    const properties = stripeSubscriptionToNotionProperties(
      expandedSubscription, 
      customerNotionPageId,
      latestInvoiceNotionPageId,
      primaryPriceNotionPageId,
      primaryProductNotionPageId
    );
    
    if (!properties) {
      throw new Error("Failed to convert subscription to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      subscriptionDatabaseId,
      "Subscription ID",
      subscription.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('subscription', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'subscription');
    console.error("Error upserting subscription to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update subscription in Notion", 
      statusCode: 200 
    };
  }
}