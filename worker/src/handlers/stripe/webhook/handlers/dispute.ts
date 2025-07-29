import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertDispute } from "@/utils/coordinated-upsert";
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
    await coordinatedUpsertDispute(
      context,
      dispute.id,
      disputeDatabaseId,
      chargeDatabaseId || undefined,
      paymentIntentDatabaseId || undefined,
      customerDatabaseId || undefined
    );

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