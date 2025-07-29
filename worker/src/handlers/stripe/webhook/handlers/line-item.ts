import { stripeInvoiceLineItemToNotionProperties } from "@/converters/invoice-line-item";
import { upsertPageByTitle, findPageByTitle } from "@/utils/notion-api";
import { handleNotionError } from "../shared/utils";
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
    let invoiceNotionPageId: string | undefined;
    
    // Handle invoice relationship - look up existing invoice page
    if (lineItem.invoice && typeof invoiceDatabaseId === 'string') {
      try {
        const invoiceId = typeof lineItem.invoice === 'string' 
          ? lineItem.invoice 
          : undefined; // InvoiceLineItem.invoice is always a string ID in Stripe API
        
        if (!invoiceId) {
          console.warn(`No invoice ID found for line item ${lineItem.id}`);
        } else {
          // Look up the invoice page in Notion
          const invoicePage = await findPageByTitle(
            context.notionToken,
            invoiceDatabaseId,
            "Invoice ID",
            invoiceId
          );
          
          if (invoicePage) {
            invoiceNotionPageId = invoicePage.id;
            console.log(`Found invoice page ${invoicePage.id} for invoice ${invoiceId}`);
          } else {
            console.warn(`Invoice ${invoiceId} not found in Notion database for line item ${lineItem.id}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to look up invoice for line item ${lineItem.id}:`, error);
        // Continue processing line item even if invoice lookup fails
      }
    }
    
    // Note: InvoiceLineItem doesn't have a direct price property in Stripe types
    // Price information would need to be extracted from other fields if needed
    
    const properties = stripeInvoiceLineItemToNotionProperties(lineItem, invoiceNotionPageId);
    
    if (!properties) {
      throw new Error("Failed to convert line item to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      lineItemDatabaseId,
      "Line Item ID",
      lineItem.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('line_item', null);
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