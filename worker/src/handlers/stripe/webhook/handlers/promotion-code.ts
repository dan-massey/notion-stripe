import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertPromotionCode } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handlePromotionCodeEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const promotionCode = event.data.object as Stripe.PromotionCode;
  const promotionCodeDatabaseId = context.accountStatus.notionConnection?.databases?.promotion_code?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  
  if (!promotionCodeDatabaseId) {
    console.warn("No promotion code database set up");
    return { success: false, message: "No promotion code database configured" };
  }

  try {
    await coordinatedUpsertPromotionCode(
      context,
      promotionCode.id,
      promotionCodeDatabaseId,
      customerDatabaseId || undefined
    );

    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'promotion_code');
    console.error("Error upserting promotion code to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update promotion code in Notion", 
      statusCode: 200 
    };
  }
}