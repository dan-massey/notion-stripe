import { upsertPageByTitle } from "@/utils/notion-api";
import { stripeCustomerToNotionProperties } from "@/converters/customer";
import { stripeChargeToNotionProperties } from "@/converters/charge";
import { stripePaymentIntentToNotionProperties } from "@/converters/payment-intent";
import type { HandlerContext } from "./types";
import type Stripe from "stripe";

export async function handleNotionError(
  error: unknown,
  context: HandlerContext,
  databaseType: 'customer' | 'invoice' | 'charge' | 'subscription' | 'credit_note' | 'dispute' | 'invoiceitem' | 'line_item' | 'price' | 'product' | 'promotion_code' | 'payment_intent'
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
    await context.account.setTokenError(errorMessage);
  } else {
    // If it's a database error, the token must be valid, so clear any token error
    await context.account.setTokenError(null);
    await context.account.setEntityError(errorField, errorMessage);
  }
}

export async function upsertCustomer(
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
    await context.account.setEntityError('customer', null);
    return customerResult.id;
  } catch (error) {
    await handleNotionError(error, context, 'customer');
    throw error; // Re-throw so calling handlers know it failed
  }
}

export async function upsertCharge(
  context: HandlerContext,
  chargeId: string,
  chargeDatabaseId: string,
  customerDatabaseId?: string,
  paymentIntentDatabaseId?: string
): Promise<string | undefined> {
  try {
    const expandedCharge = await context.stripe.charges.retrieve(chargeId, {
      expand: [
        'invoice',
        'balance_transaction'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    let customerNotionPageId: string | undefined;
    let paymentIntentNotionPageId: string | undefined;
    
    // Upsert customer if present
    if (expandedCharge.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        expandedCharge.customer as string,
        customerDatabaseId
      );
    }
    
    // Upsert payment intent if present
    if (expandedCharge.payment_intent && paymentIntentDatabaseId) {
      paymentIntentNotionPageId = await upsertPaymentIntent(
        context,
        expandedCharge.payment_intent as string,
        paymentIntentDatabaseId,
        customerDatabaseId
      );
    }
    
    const chargeProperties = stripeChargeToNotionProperties(expandedCharge, customerNotionPageId, paymentIntentNotionPageId);
    const chargeResult = await upsertPageByTitle(
      context.notionToken,
      chargeDatabaseId,
      "Charge ID",
      expandedCharge.id,
      chargeProperties
    );
    
    // Clear any previous errors for charge database since we succeeded
    await context.account.setEntityError('charge', null);
    return chargeResult.id;
  } catch (error) {
    await handleNotionError(error, context, 'charge');
    throw error; // Re-throw so calling handlers know it failed
  }
}

export async function upsertPaymentIntent(
  context: HandlerContext,
  paymentIntentId: string,
  paymentIntentDatabaseId: string,
  customerDatabaseId?: string
): Promise<string | undefined> {
  try {
    const paymentIntent = await context.stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: context.stripeAccountId });
    
    let customerNotionPageId: string | undefined;
    
    // Upsert customer if present
    if (paymentIntent.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        paymentIntent.customer as string,
        customerDatabaseId
      );
    }
    
    const paymentIntentProperties = stripePaymentIntentToNotionProperties(paymentIntent, customerNotionPageId);
    const paymentIntentResult = await upsertPageByTitle(
      context.notionToken,
      paymentIntentDatabaseId,
      "Payment Intent ID",
      paymentIntent.id,
      paymentIntentProperties
    );
    
    // Clear any previous errors for payment intent database since we succeeded
    await context.account.setEntityError('payment_intent', null);
    return paymentIntentResult.id;
  } catch (error) {
    await handleNotionError(error, context, 'payment_intent');
    throw error; // Re-throw so calling handlers know it failed
  }
}