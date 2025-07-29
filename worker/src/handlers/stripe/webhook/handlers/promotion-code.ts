import { stripePromotionCodeToNotionProperties } from "@/converters/promotion-code";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError, upsertCustomer } from "../shared/utils";
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
    let customerNotionPageId: string | undefined;
    
    // Upsert customer first if present
    if (promotionCode.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        promotionCode.customer as string,
        customerDatabaseId
      );
    }
    
    // Retrieve expanded promotion code
    const expandedPromotionCode = await context.stripe.promotionCodes.retrieve(promotionCode.id, {
      expand: [
        'coupon',
        'customer'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    const properties = stripePromotionCodeToNotionProperties(expandedPromotionCode, customerNotionPageId);
    
    if (!properties) {
      throw new Error("Failed to convert promotion code to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      promotionCodeDatabaseId,
      "Promotion Code ID",
      promotionCode.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('promotion_code', null);
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