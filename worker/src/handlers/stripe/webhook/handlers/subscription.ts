import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertSubscription } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionDatabaseId = context.accountStatus.notionConnection?.databases?.subscription.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  const invoiceDatabaseId = context.accountStatus.notionConnection?.databases?.invoice.pageId;
  const priceDatabaseId = context.accountStatus.notionConnection?.databases?.price?.pageId;
  const productDatabaseId = context.accountStatus.notionConnection?.databases?.product?.pageId;
  
  if (!subscriptionDatabaseId) {
    console.warn("No subscription database set up");
    return { success: false, message: "No subscription database configured" };
  }

  try {
    await coordinatedUpsertSubscription(
      context,
      subscription.id,
      subscriptionDatabaseId,
      customerDatabaseId || undefined,
      invoiceDatabaseId || undefined,
      priceDatabaseId || undefined,
      productDatabaseId || undefined
    );
    
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'subscription');
    console.error("Error upserting subscription to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update subscription in Notion", 
      statusCode: 200 
    };
  }
}