import type { AppContext, StripeMode } from "@/types";
import { upsertPageByTitle } from "@/utils/notion";
import { stripeCustomerToNotionProperties } from "@/utils/customer";
import { stripeChargeToNotionProperties } from "@/utils/charge";
import { stripeInvoiceToNotionProperties } from "@/utils/invoice";
import { stripeSubscriptionToNotionProperties } from "@/utils/subscription";
import type { MembershipStatus, MembershipDurableObject } from "@/membership-do";
import type Stripe from "stripe";

interface HandlerContext {
  stripe: Stripe;
  notionToken: string;
  stripeAccountId: string;
  membershipStatus: MembershipStatus;
  membership: MembershipDurableObject;
}

interface HandlerResult {
  success: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
}

async function handleNotionError(
  error: unknown,
  context: HandlerContext,
  databaseType: 'customerDatabaseError' | 'invoiceDatabaseError' | 'chargeDatabaseError' | 'subscriptionDatabaseError'
): Promise<void> {
  let errorMessage = 'Unknown Notion API error';
  let errorField: 'tokenError' | typeof databaseType = databaseType;
  
  if (error instanceof Error) {
    errorMessage = error.message;
    
    // Try to extract JSON from error message that follows pattern: "Error: Notion API error: 400 Bad Request - {JSON}"
    const jsonMatch = errorMessage.match(/\s-\s({.*})$/);
    if (jsonMatch) {
      try {
        const errorObj = JSON.parse(jsonMatch[1]);
        
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        // Check if it's a token-related error based on code or status
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // If JSON parsing fails, try direct JSON parse of full message
        try {
          const errorObj = JSON.parse(errorMessage);
          if (errorObj.message) {
            errorMessage = errorObj.message;
          }
          
          if (errorObj.code === 'unauthorized' || 
              errorObj.code === 'invalid_grant' || 
              errorObj.status === 401) {
            errorField = 'tokenError';
          }
        } catch {
          // Fall back to string matching
          if (errorMessage.includes('invalid_grant') || 
              errorMessage.includes('unauthorized') ||
              errorMessage.includes('API token is invalid') ||
              errorMessage.includes('401')) {
            errorField = 'tokenError';
          }
        }
      }
    } else {
      // Try direct JSON parse if no pattern match
      try {
        const errorObj = JSON.parse(errorMessage);
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // Fall back to string matching
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('API token is invalid') ||
            errorMessage.includes('401')) {
          errorField = 'tokenError';
        }
      }
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
    
    // Try to extract JSON from error string
    const jsonMatch = errorMessage.match(/\s-\s({.*})$/);
    if (jsonMatch) {
      try {
        const errorObj = JSON.parse(jsonMatch[1]);
        
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // Fall back to string matching
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('API token is invalid') ||
            errorMessage.includes('401')) {
          errorField = 'tokenError';
        }
      }
    } else {
      // Try direct JSON parse
      try {
        const errorObj = JSON.parse(errorMessage);
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        if (errorObj.code === 'unauthorized' || 
            errorObj.code === 'invalid_grant' || 
            errorObj.status === 401) {
          errorField = 'tokenError';
        }
      } catch {
        // Fall back to string matching
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('API token is invalid') ||
            errorMessage.includes('401')) {
          errorField = 'tokenError';
        }
      }
    }
  }
  
  console.error(`Notion API error for ${databaseType}:`, errorMessage);
  
  if (errorField === 'tokenError') {
    await context.membership.setError('tokenError', errorMessage);
  } else {
    // If it's a database error, the token must be valid, so clear any token error
    await context.membership.setError('tokenError', null);
    await context.membership.setError(errorField, errorMessage);
  }
}

async function upsertCustomer(
  context: HandlerContext,
  customerId: string,
  customerDatabaseId: string
): Promise<string | undefined> {
  try {
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
    
    // Clear any previous errors for customer database since we succeeded
    await context.membership.setError('customerDatabaseError', null);
    return customerResult.id;
  } catch (error) {
    await handleNotionError(error, context, 'customerDatabaseError');
    throw error; // Re-throw so calling handlers know it failed
  }
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

    // Clear any previous errors for this database since we succeeded
    await context.membership.setError('customerDatabaseError', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'customerDatabaseError');
    console.error("Error upserting customer to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update customer in Notion", 
      statusCode: 200 
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

    // Clear any previous errors for this database since we succeeded
    await context.membership.setError('chargeDatabaseError', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'chargeDatabaseError');
    console.error("Error upserting charge to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update charge in Notion", 
      statusCode: 200 
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

    // Clear any previous errors for this database since we succeeded
    await context.membership.setError('invoiceDatabaseError', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'invoiceDatabaseError');
    console.error("Error upserting invoice to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update invoice in Notion", 
      statusCode: 200 
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

    // Clear any previous errors for this database since we succeeded
    await context.membership.setError('subscriptionDatabaseError', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'subscriptionDatabaseError');
    console.error("Error upserting subscription to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update subscription in Notion", 
      statusCode: 200 
    };
  }
}