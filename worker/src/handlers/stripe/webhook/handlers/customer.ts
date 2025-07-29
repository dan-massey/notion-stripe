import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertCustomer } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleCustomerEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const customer = event.data.object as Stripe.Customer;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  
  if (!customerDatabaseId) {
    console.warn("No customer database set up");
    return { success: false, message: "No customer database configured" };
  }

  try {
    await coordinatedUpsertCustomer(
      context,
      customer.id,
      customerDatabaseId
    );
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'customer');
    console.error("Error upserting customer to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update customer in Notion", 
      statusCode: 200 
    };
  }
}