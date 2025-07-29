import { stripeCustomerToNotionProperties } from "@/converters/customer";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError } from "../shared/utils";
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
    const expandedCustomer = await context.stripe.customers.retrieve(customer.id, {
      expand: [
        'subscriptions',
        'sources', 
        'invoice_settings.default_payment_method',
        'default_source'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    if (expandedCustomer.deleted) {
      return { success: true, message: "Customer was deleted" };
    }
    
    const properties = stripeCustomerToNotionProperties(expandedCustomer as Stripe.Customer);
    
    await upsertPageByTitle(
      context.notionToken,
      customerDatabaseId,
      "Customer ID",
      customer.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('customer', null);
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