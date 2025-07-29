import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertInvoiceItem } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleInvoiceItemEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const invoiceItem = event.data.object as Stripe.InvoiceItem;
  const invoiceItemDatabaseId = context.accountStatus.notionConnection?.databases?.invoiceitem?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  const invoiceDatabaseId = context.accountStatus.notionConnection?.databases?.invoice.pageId;
  const priceDatabaseId = context.accountStatus.notionConnection?.databases?.price?.pageId;
  const productDatabaseId = context.accountStatus.notionConnection?.databases?.product?.pageId;
  
  if (!invoiceItemDatabaseId) {
    console.warn("No invoice item database set up");
    return { success: false, message: "No invoice item database configured" };
  }

  try {
    await coordinatedUpsertInvoiceItem(
      context,
      invoiceItem.id,
      invoiceItemDatabaseId,
      customerDatabaseId || undefined,
      invoiceDatabaseId || undefined,
      priceDatabaseId || undefined,
      productDatabaseId || undefined
    );
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'invoiceitem');
    console.error("Error upserting invoice item to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update invoice item in Notion", 
      statusCode: 200 
    };
  }
}