import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertInvoice, coordinatedUpsertLineItem } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleInvoiceEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const invoice = event.data.object as Stripe.Invoice;
  const invoiceDatabaseId = context.accountStatus.notionConnection?.databases?.invoice?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  const chargeDatabaseId = context.accountStatus.notionConnection?.databases?.charge?.pageId;
  const paymentIntentDatabaseId = context.accountStatus.notionConnection?.databases?.payment_intent?.pageId;
  const lineItemDatabaseId = context.accountStatus.notionConnection?.databases?.line_item?.pageId;
  
  if (!invoiceDatabaseId) {
    console.warn("No invoice database set up");
    return { success: false, message: "No invoice database configured" };
  }

  // Charge and payment intent databases are optional for invoice processing
  if (!chargeDatabaseId) {
    console.warn("No charge database set up - charge relationships will not be created");
  }

  if (!paymentIntentDatabaseId) {
    console.warn("No payment intent database set up - payment intent relationships will not be created");
  }

  try {
    const invoiceResult = await coordinatedUpsertInvoice(
      context,
      invoice.id as string,
      invoiceDatabaseId,
      customerDatabaseId || undefined,
      chargeDatabaseId || undefined,
      paymentIntentDatabaseId || undefined
    );

    if (!invoiceResult) {
      throw new Error("Failed to upsert invoice");
    }

    // Retrieve expanded invoice with line items for processing line items
    const expandedInvoice = await context.stripe.invoices.retrieve(invoice.id as string, {
      expand: [
        'lines.data'
      ]
    }, { stripeAccount: context.stripeAccountId });

    // Process invoice line items if line item database is configured
    if (lineItemDatabaseId && expandedInvoice.lines?.data) {
      console.log(`Processing ${expandedInvoice.lines.data.length} line items for invoice ${invoice.id}`);
      
      for (const lineItem of expandedInvoice.lines.data) {
        try {
          await coordinatedUpsertLineItem(
            context,
            lineItem,
            lineItemDatabaseId,
            invoiceResult, // Link to the invoice we just created
            null // price relation not available in this context
          );
          
          console.log(`Created line item ${lineItem.id} for invoice ${invoice.id}`);
        } catch (error) {
          console.error(`Failed to create line item ${lineItem.id} for invoice ${invoice.id}:`, error);
          // Continue processing other line items even if one fails
        }
      }
    }

    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'invoice');
    console.error("Error upserting invoice to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update invoice in Notion", 
      statusCode: 200 
    };
  }
}