import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertCharge } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleChargeEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const charge = event.data.object as Stripe.Charge;
  const chargeDatabaseId = context.accountStatus.notionConnection?.databases?.charge?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  const paymentIntentDatabaseId = context.accountStatus.notionConnection?.databases?.payment_intent?.pageId;
  
  if (!chargeDatabaseId) {
    console.warn("No charge database set up");
    return { success: false, message: "No charge database configured" };
  }

  try {
    await coordinatedUpsertCharge(
      context,
      charge.id,
      chargeDatabaseId,
      customerDatabaseId || undefined,
      paymentIntentDatabaseId || undefined
    );

    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'charge');
    console.error("Error upserting charge to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update charge in Notion", 
      statusCode: 200 
    };
  }
}