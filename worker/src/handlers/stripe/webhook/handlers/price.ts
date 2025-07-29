import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertPrice } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handlePriceEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const price = event.data.object as Stripe.Price;
  const priceDatabaseId = context.accountStatus.notionConnection?.databases?.price?.pageId;
  const productDatabaseId = context.accountStatus.notionConnection?.databases?.product?.pageId;
  
  if (!priceDatabaseId) {
    console.warn("No price database set up");
    return { success: false, message: "No price database configured" };
  }

  try {
    await coordinatedUpsertPrice(
      context,
      price.id,
      priceDatabaseId,
      productDatabaseId || undefined
    );

    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'price');
    console.error("Error upserting price to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update price in Notion", 
      statusCode: 200 
    };
  }
}