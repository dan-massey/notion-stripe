import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertPaymentIntent } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handlePaymentIntentEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const paymentIntentDatabaseId = context.accountStatus.notionConnection?.databases?.payment_intent?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  
  if (!paymentIntentDatabaseId) {
    console.warn("No payment intent database set up");
    return { success: false, message: "No payment intent database configured" };
  }

  try {
    await coordinatedUpsertPaymentIntent(
      context,
      paymentIntent.id,
      paymentIntentDatabaseId,
      customerDatabaseId || undefined
    );

    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'payment_intent');
    console.error("Error upserting payment intent to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update payment intent in Notion", 
      statusCode: 200 
    };
  }
}