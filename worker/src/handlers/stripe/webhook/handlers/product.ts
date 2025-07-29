import { stripeProductToNotionProperties } from "@/converters/product";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError } from "../shared/utils";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleProductEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const product = event.data.object as Stripe.Product;
  const productDatabaseId = context.accountStatus.notionConnection?.databases?.product?.pageId;
  
  if (!productDatabaseId) {
    console.warn("No product database set up");
    return { success: false, message: "No product database configured" };
  }

  try {
    const properties = stripeProductToNotionProperties(product);
    
    if (!properties) {
      throw new Error("Failed to convert product to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      productDatabaseId,
      "Product ID",
      product.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('product', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'product');
    console.error("Error upserting product to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update product in Notion", 
      statusCode: 200 
    };
  }
}