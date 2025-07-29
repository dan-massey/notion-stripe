import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertCreditNote } from "@/utils/coordinated-upsert";
import type { HandlerContext, HandlerResult } from "../shared/types";
import type Stripe from "stripe";

export async function handleCreditNoteEvent(
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> {
  const creditNote = event.data.object as Stripe.CreditNote;
  const creditNoteDatabaseId = context.accountStatus.notionConnection?.databases?.credit_note?.pageId;
  const customerDatabaseId = context.accountStatus.notionConnection?.databases?.customer.pageId;
  const invoiceDatabaseId = context.accountStatus.notionConnection?.databases?.invoice?.pageId;
  
  if (!creditNoteDatabaseId) {
    console.warn("No credit note database set up");
    return { success: false, message: "No credit note database configured" };
  }

  try {
    await coordinatedUpsertCreditNote(
      context,
      creditNote.id,
      creditNoteDatabaseId,
      customerDatabaseId || undefined,
      invoiceDatabaseId || undefined
    );
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