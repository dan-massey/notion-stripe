import { upsertPageByTitle } from "@/utils/notion-api";
import { stripeCustomerToNotionProperties } from "@/converters/customer";
import { stripeChargeToNotionProperties } from "@/converters/charge";
import { stripePaymentIntentToNotionProperties } from "@/converters/payment-intent";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { SupportedEntity } from "@/types";
import type Stripe from "stripe";

/**
 * Get the coordinator instance for a Stripe account
 */
function getCoordinator(context: HandlerContext, stripeAccountId: string) {
  // Use the Stripe account ID as the Durable Object ID
  const doId = context.env.STRIPE_ENTITY_COORDINATOR.idFromName(stripeAccountId);
  return context.env.STRIPE_ENTITY_COORDINATOR.get(doId);
}

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
 * Coordinated charge upsert that prevents race conditions
 */
export async function coordinatedUpsertCharge(
  context: HandlerContext,
  chargeId: string,
  chargeDatabaseId: string,
  customerDatabaseId?: string,
  paymentIntentDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: 'charge',
      stripeId: chargeId,
      notionToken: context.notionToken,
      databaseId: chargeDatabaseId,
      titleProperty: 'Charge ID',
      upsertOperation: async () => {
        // Original upsert logic
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
          customerNotionPageId = await coordinatedUpsertCustomer(
            context,
            expandedCharge.customer as string,
            customerDatabaseId
          );
        }
        
        // Upsert payment intent if present
        if (expandedCharge.payment_intent && paymentIntentDatabaseId) {
          paymentIntentNotionPageId = await coordinatedUpsertPaymentIntent(
            context,
            expandedCharge.payment_intent as string,
            paymentIntentDatabaseId,
            customerDatabaseId
          );
        }
        
        const chargeProperties = stripeChargeToNotionProperties(expandedCharge, customerNotionPageId || null, paymentIntentNotionPageId || null);
        const result = await upsertPageByTitle(
          context.notionToken,
          chargeDatabaseId,
          "Charge ID",
          expandedCharge.id,
          chargeProperties
        );
        
        return result;
      }
    });

    // Clear any previous errors for charge database since we succeeded
    await context.account.setEntityError('charge', null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertCharge for ${chargeId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated payment intent upsert that prevents race conditions
 */
export async function coordinatedUpsertPaymentIntent(
  context: HandlerContext,
  paymentIntentId: string,
  paymentIntentDatabaseId: string,
  customerDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: 'payment_intent',
      stripeId: paymentIntentId,
      notionToken: context.notionToken,
      databaseId: paymentIntentDatabaseId,
      titleProperty: 'Payment Intent ID',
      upsertOperation: async () => {
        // Original upsert logic
        const paymentIntent = await context.stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: context.stripeAccountId });
        
        let customerNotionPageId: string | undefined;
        
        // Upsert customer if present
        if (paymentIntent.customer && customerDatabaseId) {
          customerNotionPageId = await coordinatedUpsertCustomer(
            context,
            paymentIntent.customer as string,
            customerDatabaseId
          );
        }
        
        const paymentIntentProperties = stripePaymentIntentToNotionProperties(paymentIntent, customerNotionPageId || null);
        const result = await upsertPageByTitle(
          context.notionToken,
          paymentIntentDatabaseId,
          "Payment Intent ID",
          paymentIntent.id,
          paymentIntentProperties
        );
        
        return result;
      }
    });

    // Clear any previous errors for payment intent database since we succeeded
    await context.account.setEntityError('payment_intent', null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertPaymentIntent for ${paymentIntentId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Get the stored Notion page ID for a Stripe entity
 * This allows us to skip the slow findPageByTitle lookup
 */
export async function getStoredNotionPageId(
  context: HandlerContext,
  entityType: SupportedEntity,
  stripeId: string
): Promise<string | null> {
  const coordinator = getCoordinator(context, context.stripeAccountId);
  const mapping = await coordinator.getEntityMapping(entityType, stripeId);
  return mapping?.notionPageId || null;
}

/**
 * Check if an entity has already been processed
 */
export async function hasEntityMapping(
  context: HandlerContext,
  entityType: SupportedEntity,
  stripeId: string
): Promise<boolean> {
  const coordinator = getCoordinator(context, context.stripeAccountId);
  return await coordinator.hasEntityMapping(entityType, stripeId);
}