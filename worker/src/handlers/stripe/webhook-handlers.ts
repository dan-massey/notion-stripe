import type { AppContext, StripeMode } from "@/types";
import { upsertPageByTitle } from "@/utils/notion";
import { stripeCustomerToNotionProperties } from "@/utils/customer";
import { stripeChargeToNotionProperties } from "@/utils/charge";
import { stripeInvoiceToNotionProperties } from "@/utils/invoice";
import { stripeSubscriptionToNotionProperties } from "@/utils/subscription";
import type Stripe from "stripe";

interface HandlerContext {
  stripe: Stripe;
  notionToken: string;
  stripeAccountId: string;
  membershipStatus: any;
}

interface HandlerResult {
  success: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
}

async function upsertCustomer(
  context: HandlerContext,
  customerId: string,
  customerDatabaseId: string
): Promise<string | undefined> {
  const expandedCustomer = await context.stripe.customers.retrieve(customerId, {
    expand: [
      'subscriptions',
      'sources', 
      'invoice_settings.default_payment_method',
      'default_source'
    ]
  }, { stripeAccount: context.stripeAccountId });
  
  if (expandedCustomer.deleted) {
    return undefined;
  }
  
  const customerProperties = stripeCustomerToNotionProperties(expandedCustomer as Stripe.Customer);
  const customerResult = await upsertPageByTitle(
    context.notionToken,
    customerDatabaseId,
    "Customer ID",
    expandedCustomer.id,
    customerProperties
  );
  
  return customerResult.id;
}

export async function handleCustomerEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const customer = event.data.object as Stripe.Customer;
  const customerDatabaseId = context.membershipStatus?.customerDatabaseId;
  
  if (!customerDatabaseId) {
    console.warn("No customer database set up");
    return { success: false, message: "No customer database configured" };
  }

  try {
    const expandedCustomer = await context.stripe.customers.retrieve(customer.id, {
      expand: [
        'subscriptions',
        'sources', 
        'invoice_settings.default_payment_method',
        'default_source'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    if (expandedCustomer.deleted) {
      return { success: true, message: "Customer was deleted" };
    }
    
    const properties = stripeCustomerToNotionProperties(expandedCustomer as Stripe.Customer);
    
    await upsertPageByTitle(
      context.notionToken,
      customerDatabaseId,
      "Customer ID",
      customer.id,
      properties
    );

    return { success: true };
  } catch (error) {
    console.error("Error upserting customer to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update customer in Notion", 
      statusCode: 500 
    };
  }
}

export async function handleChargeEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const charge = event.data.object as Stripe.Charge;
  const chargeDatabaseId = context.membershipStatus?.chargeDatabaseId;
  const customerDatabaseId = context.membershipStatus?.customerDatabaseId;
  
  if (!chargeDatabaseId) {
    console.warn("No charge database set up");
    return { success: false, message: "No charge database configured" };
  }

  try {
    let customerNotionPageId: string | undefined;
    
    // Upsert customer first if present
    if (charge.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        charge.customer as string,
        customerDatabaseId
      );
    }
    
    // Retrieve expanded charge
    const expandedCharge = await context.stripe.charges.retrieve(charge.id, {
      expand: [
        'invoice',
        'balance_transaction'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    const properties = stripeChargeToNotionProperties(expandedCharge, customerNotionPageId);
    
    if (!properties) {
      throw new Error("Failed to convert charge to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      chargeDatabaseId,
      "Charge ID",
      charge.id,
      properties
    );

    return { success: true };
  } catch (error) {
    console.error("Error upserting charge to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update charge in Notion", 
      statusCode: 500 
    };
  }
}

export async function handleInvoiceEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const invoice = event.data.object as Stripe.Invoice;
  const invoiceDatabaseId = context.membershipStatus?.invoiceDatabaseId;
  const customerDatabaseId = context.membershipStatus?.customerDatabaseId;
  
  if (!invoiceDatabaseId) {
    console.warn("No invoice database set up");
    return { success: false, message: "No invoice database configured" };
  }

  try {
    let customerNotionPageId: string | undefined;
    
    // Upsert customer first if present
    if (invoice.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        invoice.customer as string,
        customerDatabaseId
      );
    }
    
    // Retrieve expanded invoice
    const expandedInvoice = await context.stripe.invoices.retrieve(invoice.id as string, {
      expand: [
        'customer',
        'subscription',
        'payment_intent',
        'default_payment_method',
        'default_source'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    const properties = stripeInvoiceToNotionProperties(expandedInvoice, customerNotionPageId);
    
    if (!properties) {
      throw new Error("Failed to convert invoice to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      invoiceDatabaseId,
      "Invoice ID",
      invoice.id as string,
      properties
    );

    return { success: true };
  } catch (error) {
    console.error("Error upserting invoice to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update invoice in Notion", 
      statusCode: 500 
    };
  }
}

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionDatabaseId = context.membershipStatus?.subscriptionDatabaseId;
  const customerDatabaseId = context.membershipStatus?.customerDatabaseId;
  const invoiceDatabaseId = context.membershipStatus?.invoiceDatabaseId;
  
  if (!subscriptionDatabaseId) {
    console.warn("No subscription database set up");
    return { success: false, message: "No subscription database configured" };
  }

  try {
    let customerNotionPageId: string | undefined;
    let latestInvoiceNotionPageId: string | undefined;
    
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
    
    // Step 3: Retrieve and upsert subscription
    const expandedSubscription = await context.stripe.subscriptions.retrieve(subscription.id, {
      expand: [
        'customer',
        'latest_invoice',
        'default_payment_method',
        'default_source',
        'items.data.price.product'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    const properties = stripeSubscriptionToNotionProperties(
      expandedSubscription, 
      customerNotionPageId,
      latestInvoiceNotionPageId
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

    return { success: true };
  } catch (error) {
    console.error("Error upserting subscription to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update subscription in Notion", 
      statusCode: 500 
    };
  }
}