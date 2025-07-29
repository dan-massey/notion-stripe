import { stripeDisputeToNotionProperties } from "@/converters/dispute";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError, upsertCharge, upsertPaymentIntent } from "../shared/utils";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleDisputeEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const dispute = event.data.object as Stripe.Dispute;
  const disputeDatabaseId = context.accountStatus.notionConnection?.databases?.dispute?.pageId;
  const chargeDatabaseId = context.accountStatus.notionConnection?.databases?.charge?.pageId;
  const paymentIntentDatabaseId = context.accountStatus.notionConnection?.databases?.payment_intent?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  
  if (!disputeDatabaseId) {
    console.warn("No dispute database set up");
    return { success: false, message: "No dispute database configured" };
  }

  try {
    let chargeNotionPageId: string | undefined;
    let paymentIntentNotionPageId: string | undefined;
    
    // Retrieve expanded dispute
    const expandedDispute = await context.stripe.disputes.retrieve(dispute.id, {
      expand: [
        'charge',
        'balance_transactions'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    // Upsert charge if present and charge database exists
    if (expandedDispute.charge && chargeDatabaseId) {
      const chargeId = typeof expandedDispute.charge === 'string' 
        ? expandedDispute.charge 
        : expandedDispute.charge.id;
      
      try {
        chargeNotionPageId = await upsertCharge(
          context,
          chargeId,
          chargeDatabaseId,
          customerDatabaseId ?? undefined,
          paymentIntentDatabaseId ?? undefined
        );
      } catch (error) {
        console.warn(`Failed to upsert charge ${chargeId} for dispute ${dispute.id}:`, error);
        // Continue processing dispute even if charge upsert fails
      }
    }
    
    // Upsert payment intent if the charge has a payment intent and payment intent database exists
    if (expandedDispute.charge && typeof expandedDispute.charge === 'object' && 
        expandedDispute.charge.payment_intent && paymentIntentDatabaseId) {
      const paymentIntentId = typeof expandedDispute.charge.payment_intent === 'string'
        ? expandedDispute.charge.payment_intent
        : expandedDispute.charge.payment_intent.id;
      
      try {
        paymentIntentNotionPageId = await upsertPaymentIntent(
          context,
          paymentIntentId,
          paymentIntentDatabaseId,
          customerDatabaseId ?? undefined
        );
      } catch (error) {
        console.warn(`Failed to upsert payment intent ${paymentIntentId} for dispute ${dispute.id}:`, error);
        // Continue processing dispute even if payment intent upsert fails
      }
    }
    
    const properties = stripeDisputeToNotionProperties(expandedDispute, chargeNotionPageId, paymentIntentNotionPageId);
    
    if (!properties) {
      throw new Error("Failed to convert dispute to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      disputeDatabaseId,
      "Dispute ID",
      dispute.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('dispute', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'dispute');
    console.error("Error upserting dispute to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update dispute in Notion", 
      statusCode: 200 
    };
  }
}