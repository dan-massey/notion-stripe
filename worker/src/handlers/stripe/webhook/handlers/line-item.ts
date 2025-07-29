import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertLineItem } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleLineItemEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const lineItem = event.data.object as unknown as Stripe.InvoiceLineItem;
  const lineItemDatabaseId = context.accountStatus.notionConnection?.databases?.line_item?.pageId;
  const invoiceDatabaseId = context.accountStatus.notionConnection?.databases?.invoice.pageId;
  
  if (!lineItemDatabaseId) {
    console.warn("No line item database set up");
    return { success: false, message: "No line item database configured" };
  }

  try {
    // Look up invoice page ID using coordinator for relationship resolution
    let invoiceNotionPageId: string | null = null;
    if (lineItem.invoice && typeof invoiceDatabaseId === 'string') {
      const invoiceId = typeof lineItem.invoice === 'string' ? lineItem.invoice : undefined;
      if (invoiceId) {
        // Use the coordinator to get the invoice page ID from cache
        const doId = context.env.STRIPE_ENTITY_COORDINATOR.idFromName(context.stripeAccountId);
        const coordinator = context.env.STRIPE_ENTITY_COORDINATOR.get(doId);
        invoiceNotionPageId = await coordinator.getEntityPageId(
          context.notionToken,
          'invoice',
          invoiceId,
          invoiceDatabaseId,
          'Invoice ID'
        );
      }
    }

    await coordinatedUpsertLineItem(
      context,
      lineItem,
      lineItemDatabaseId,
      invoiceNotionPageId,
      null // price relation not available in this context
    );
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'line_item');
    console.error("Error upserting line item to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update line item in Notion", 
      statusCode: 200 
    };
  }
}