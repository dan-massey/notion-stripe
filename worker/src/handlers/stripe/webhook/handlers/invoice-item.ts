import { stripeInvoiceItemToNotionProperties } from "@/converters/invoice-item";
import { stripePriceToNotionProperties } from "@/converters/price";
import { upsertPageByTitle, findPageByTitle } from "@/utils/notion-api";
import { handleNotionError, upsertCustomer } from "../shared/utils";
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
  
  if (!invoiceItemDatabaseId) {
    console.warn("No invoice item database set up");
    return { success: false, message: "No invoice item database configured" };
  }

  try {
    let customerNotionPageId: string | undefined;
    let invoiceNotionPageId: string | undefined;
    let priceNotionPageId: string | undefined;
    
    // Upsert customer first if present
    if (invoiceItem.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        invoiceItem.customer as string,
        customerDatabaseId
      );
    }
    
    // Retrieve expanded invoice item
    const expandedInvoiceItem = await context.stripe.invoiceItems.retrieve(invoiceItem.id, {
      expand: [
        'customer',
        'invoice',
        'subscription',
        'price'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    // Handle invoice relationship - look up existing invoice page
    if (expandedInvoiceItem.invoice && typeof invoiceDatabaseId === 'string') {
      try {
        const invoiceId = typeof expandedInvoiceItem.invoice === 'string' 
          ? expandedInvoiceItem.invoice 
          : expandedInvoiceItem.invoice?.id;
        
        if (!invoiceId) {
          console.warn(`No invoice ID found for invoice item ${invoiceItem.id}`);
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
            console.warn(`Invoice ${invoiceId} not found in Notion database for invoice item ${invoiceItem.id}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to look up invoice for invoice item ${invoiceItem.id}:`, error);
        // Continue processing invoice item even if invoice lookup fails
      }
    }
    
    // Upsert price if present and price database exists
    if ((expandedInvoiceItem as any).price && priceDatabaseId) {
      try {
        const price = (expandedInvoiceItem as any).price as Stripe.Price;
        const priceProperties = stripePriceToNotionProperties(price);
        const priceResult = await upsertPageByTitle(
          context.notionToken,
          priceDatabaseId,
          "Price ID",
          price.id,
          priceProperties
        );
        priceNotionPageId = priceResult.id;
        
        // Clear any previous errors for price database since we succeeded
        await context.account.setEntityError('price', null);
      } catch (error) {
        const priceId = (expandedInvoiceItem as any).price?.id || 'unknown';
        console.warn(`Failed to upsert price ${priceId} for invoice item ${invoiceItem.id}:`, error);
        // Continue processing invoice item even if price upsert fails
      }
    }
    
    const properties = stripeInvoiceItemToNotionProperties(
      expandedInvoiceItem, 
      customerNotionPageId, 
      invoiceNotionPageId, 
      priceNotionPageId
    );
    
    if (!properties) {
      throw new Error("Failed to convert invoice item to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      invoiceItemDatabaseId,
      "Invoice Item ID",
      invoiceItem.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('invoiceitem', null);
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