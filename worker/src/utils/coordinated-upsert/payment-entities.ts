import { upsertPageByTitle } from "@/utils/notion-api";
import { stripeChargeToNotionProperties } from "@/converters/charge";
import { stripePaymentIntentToNotionProperties } from "@/converters/payment-intent";
import { stripeDisputeToNotionProperties } from "@/converters/dispute";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type Stripe from "stripe";
import { getCoordinator } from "./utils";
import { coordinatedUpsertCustomer } from "./core-entities";

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
      entityType: "charge",
      stripeId: chargeId,
      notionToken: context.notionToken,
      databaseId: chargeDatabaseId,
      titleProperty: "Charge ID",
      forceUpdate: true, // Always update for direct charge events
      upsertOperation: async () => {
        // Original upsert logic
        const expandedCharge = await context.stripe.charges.retrieve(
          chargeId,
          {
            expand: ["invoice", "balance_transaction"],
          },
          { stripeAccount: context.stripeAccountId }
        );

        let customerNotionPageId: string | null = null;
        let paymentIntentNotionPageId: string | null = null;

        // Get customer page ID if present (only upsert if not cached)
        if (expandedCharge.customer && customerDatabaseId) {
          const customerId =
            typeof expandedCharge.customer === "string"
              ? expandedCharge.customer
              : expandedCharge.customer.id;
          customerNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "customer",
            customerId,
            customerDatabaseId,
            "Customer ID"
          );

          // Only upsert if no mapping exists
          if (!customerNotionPageId) {
            customerNotionPageId =
              (await coordinatedUpsertCustomer(
                context,
                customerId,
                customerDatabaseId
              )) || null;
          }
        }

        // Get payment intent page ID if present (only upsert if not cached)
        if (expandedCharge.payment_intent && paymentIntentDatabaseId) {
          const paymentIntentId =
            typeof expandedCharge.payment_intent === "string"
              ? expandedCharge.payment_intent
              : expandedCharge.payment_intent.id;
          paymentIntentNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "payment_intent",
            paymentIntentId,
            paymentIntentDatabaseId,
            "Payment Intent ID"
          );

          // Only upsert if no mapping exists
          if (!paymentIntentNotionPageId) {
            paymentIntentNotionPageId =
              (await coordinatedUpsertPaymentIntent(
                context,
                paymentIntentId,
                paymentIntentDatabaseId,
                customerDatabaseId
              )) || null;
          }
        }

        const chargeProperties = stripeChargeToNotionProperties(
          expandedCharge,
          customerNotionPageId || null,
          paymentIntentNotionPageId || null
        );
        const result = await upsertPageByTitle(
          context.notionToken,
          chargeDatabaseId,
          "Charge ID",
          expandedCharge.id,
          chargeProperties
        );

        return result;
      },
    });

    // Clear any previous errors for charge database since we succeeded
    await context.account.setEntityError("charge", null);
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
      entityType: "payment_intent",
      stripeId: paymentIntentId,
      notionToken: context.notionToken,
      databaseId: paymentIntentDatabaseId,
      titleProperty: "Payment Intent ID",
      forceUpdate: true, // Always update for direct payment intent events
      upsertOperation: async () => {
        // Original upsert logic
        const paymentIntent = await context.stripe.paymentIntents.retrieve(
          paymentIntentId,
          {},
          { stripeAccount: context.stripeAccountId }
        );

        let customerNotionPageId: string | null = null;

        // Get customer page ID if present (only upsert if not cached)
        if (paymentIntent.customer && customerDatabaseId) {
          const customerId =
            typeof paymentIntent.customer === "string"
              ? paymentIntent.customer
              : paymentIntent.customer.id;
          customerNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "customer",
            customerId,
            customerDatabaseId,
            "Customer ID"
          );

          // Only upsert if no mapping exists
          if (!customerNotionPageId) {
            customerNotionPageId =
              (await coordinatedUpsertCustomer(
                context,
                customerId,
                customerDatabaseId
              )) || null;
          }
        }

        const paymentIntentProperties = stripePaymentIntentToNotionProperties(
          paymentIntent,
          customerNotionPageId || null
        );
        const result = await upsertPageByTitle(
          context.notionToken,
          paymentIntentDatabaseId,
          "Payment Intent ID",
          paymentIntent.id,
          paymentIntentProperties
        );

        return result;
      },
    });

    // Clear any previous errors for payment intent database since we succeeded
    await context.account.setEntityError("payment_intent", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(
      `Error in coordinatedUpsertPaymentIntent for ${paymentIntentId}:`,
      error
    );
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated dispute upsert that prevents race conditions
 */
export async function coordinatedUpsertDispute(
  context: HandlerContext,
  disputeId: string,
  disputeDatabaseId: string,
  chargeDatabaseId?: string,
  paymentIntentDatabaseId?: string,
  customerDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "dispute",
      stripeId: disputeId,
      notionToken: context.notionToken,
      databaseId: disputeDatabaseId,
      titleProperty: "Dispute ID",
      forceUpdate: true, // Always update for direct dispute events
      upsertOperation: async () => {
        // Retrieve expanded dispute
        const expandedDispute = await context.stripe.disputes.retrieve(
          disputeId,
          {
            expand: ["charge", "balance_transactions"],
          },
          { stripeAccount: context.stripeAccountId }
        );

        let chargeNotionPageId: string | null = null;
        let paymentIntentNotionPageId: string | null = null;

        // Get charge page ID if present (only upsert if not cached)
        if (expandedDispute.charge && chargeDatabaseId) {
          const chargeId =
            typeof expandedDispute.charge === "string"
              ? expandedDispute.charge
              : expandedDispute.charge.id;
          chargeNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "charge",
            chargeId,
            chargeDatabaseId,
            "Charge ID"
          );

          // Only upsert if no mapping exists
          if (!chargeNotionPageId) {
            try {
              chargeNotionPageId =
                (await coordinatedUpsertCharge(
                  context,
                  chargeId,
                  chargeDatabaseId,
                  customerDatabaseId,
                  paymentIntentDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert charge for dispute ${disputeId}:`,
                error
              );
            }
          }
        }

        // Get payment intent page ID if present (only upsert if not cached)
        if (
          expandedDispute.charge &&
          typeof expandedDispute.charge === "object" &&
          expandedDispute.charge.payment_intent &&
          paymentIntentDatabaseId
        ) {
          const paymentIntentId =
            typeof expandedDispute.charge.payment_intent === "string"
              ? expandedDispute.charge.payment_intent
              : expandedDispute.charge.payment_intent.id;

          paymentIntentNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "payment_intent",
            paymentIntentId,
            paymentIntentDatabaseId,
            "Payment Intent ID"
          );

          // Only upsert if no mapping exists
          if (!paymentIntentNotionPageId) {
            try {
              paymentIntentNotionPageId =
                (await coordinatedUpsertPaymentIntent(
                  context,
                  paymentIntentId,
                  paymentIntentDatabaseId,
                  customerDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert payment intent for dispute ${disputeId}:`,
                error
              );
            }
          }
        }

        const disputeProperties = stripeDisputeToNotionProperties(
          expandedDispute,
          chargeNotionPageId || null,
          paymentIntentNotionPageId || null
        );

        const result = await upsertPageByTitle(
          context.notionToken,
          disputeDatabaseId,
          "Dispute ID",
          expandedDispute.id,
          disputeProperties
        );

        return result;
      },
    });

    // Clear any previous errors for dispute database since we succeeded
    await context.account.setEntityError("dispute", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertDispute for ${disputeId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}
