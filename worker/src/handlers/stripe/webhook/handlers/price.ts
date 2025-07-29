import { stripePriceToNotionProperties } from "@/converters/price";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError } from "../shared/utils";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handlePriceEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const price = event.data.object as Stripe.Price;
  const priceDatabaseId = context.accountStatus.notionConnection?.databases?.price?.pageId;
  
  if (!priceDatabaseId) {
    console.warn("No price database set up");
    return { success: false, message: "No price database configured" };
  }

  try {
    // Retrieve expanded price
    const expandedPrice = await context.stripe.prices.retrieve(price.id, {
      expand: [
        'product'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    const properties = stripePriceToNotionProperties(expandedPrice);
    
    if (!properties) {
      throw new Error("Failed to convert price to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      priceDatabaseId,
      "Price ID",
      price.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('price', null);
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