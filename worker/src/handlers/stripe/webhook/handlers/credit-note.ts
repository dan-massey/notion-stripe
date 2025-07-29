import { stripeCreditNoteToNotionProperties } from "@/converters/credit-note";
import { stripeInvoiceToNotionProperties } from "@/converters/invoice";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError, upsertCustomer } from "../shared/utils";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleCreditNoteEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const creditNote = event.data.object as Stripe.CreditNote;
  const creditNoteDatabaseId = context.accountStatus.notionConnection?.databases?.credit_note?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  
  if (!creditNoteDatabaseId) {
    console.warn("No credit note database set up");
    return { success: false, message: "No credit note database configured" };
  }

  try {
    let customerNotionPageId: string | undefined;
    let invoiceNotionPageId: string | undefined;
    
    // Upsert customer first if present
    if (creditNote.customer && customerDatabaseId) {
      customerNotionPageId = await upsertCustomer(
        context,
        creditNote.customer as string,
        customerDatabaseId
      );
    }
    
    // Retrieve expanded credit note
    const expandedCreditNote = await context.stripe.creditNotes.retrieve(creditNote.id, {
      expand: [
        'customer',
        'invoice'
      ]
    }, { stripeAccount: context.stripeAccountId });
    
    // Upsert invoice if present and database is configured
    const invoiceDatabaseId = context.accountStatus.notionConnection?.databases?.invoice?.pageId;
    if (expandedCreditNote.invoice && invoiceDatabaseId) {
      const invoice = expandedCreditNote.invoice as Stripe.Invoice;
      const invoiceProperties = stripeInvoiceToNotionProperties(invoice, customerNotionPageId || null, null, null);
      
      const invoiceResult = await upsertPageByTitle(
        context.notionToken,
        invoiceDatabaseId,
        "Invoice ID",
        invoice.id as string,
        invoiceProperties
      );
      
      invoiceNotionPageId = invoiceResult.id;
    }
    
    const properties = stripeCreditNoteToNotionProperties(expandedCreditNote, customerNotionPageId || null, invoiceNotionPageId || null);
    
    if (!properties) {
      throw new Error("Failed to convert credit note to Notion properties");
    }

    await upsertPageByTitle(
      context.notionToken,
      creditNoteDatabaseId,
      "Credit Note ID",
      creditNote.id,
      properties
    );

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('credit_note', null);
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, 'credit_note');
    console.error("Error upserting credit note to Notion:", error);
    return { 
      success: false, 
      error: "Failed to update credit note in Notion", 
      statusCode: 200 
    };
  }
}