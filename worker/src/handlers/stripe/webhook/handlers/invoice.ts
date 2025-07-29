import { stripeInvoiceToNotionProperties } from "@/converters/invoice";
import { stripeInvoiceLineItemToNotionProperties } from "@/converters/invoice-line-item";
import { upsertPageByTitle } from "@/utils/notion-api";
import { handleNotionError } from "../shared/utils";
import { coordinatedUpsertCustomer, coordinatedUpsertCharge, coordinatedUpsertPaymentIntent } from "@/utils/coordinated-upsert";
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
    let customerNotionPageId: string | undefined;
    let primaryChargeNotionPageId: string | undefined;
    let primaryPaymentIntentNotionPageId: string | undefined;
    
    // Upsert customer first if present
    if (invoice.customer && customerDatabaseId) {
      customerNotionPageId = await coordinatedUpsertCustomer(
        context,
        invoice.customer as string,
        customerDatabaseId
      );
    }
    
    // Retrieve expanded invoice with line items and payments
    const expandedInvoice = await context.stripe.invoices.retrieve(invoice.id as string, {
      expand: [
        'customer',
        'subscription',
        'payment_intent',
        'default_payment_method',
        'default_source',
        'lines.data',
        'payments.data.payment.charge',
        'payments.data.payment.payment_intent'
      ]
    }, { stripeAccount: context.stripeAccountId });

    // Extract primary charge and payment intent from payments
    if (expandedInvoice.payments && expandedInvoice.payments.data && expandedInvoice.payments.data.length > 0) {
      const primaryPayment = expandedInvoice.payments.data[0]; // Use first payment as primary
      
      // Only try to upsert charge if charge database exists
      if (chargeDatabaseId && primaryPayment.payment.charge) {
        if (typeof primaryPayment.payment.charge !== 'string') {
          // Upsert charge if it's an expanded object
          primaryChargeNotionPageId = await coordinatedUpsertCharge(
            context,
            primaryPayment.payment.charge.id,
            chargeDatabaseId,
            customerDatabaseId || undefined,
            paymentIntentDatabaseId || undefined
          );
        } else {
          // Upsert charge if it's just an ID
          primaryChargeNotionPageId = await coordinatedUpsertCharge(
            context,
            primaryPayment.payment.charge,
            chargeDatabaseId,
            customerDatabaseId || undefined,
            paymentIntentDatabaseId || undefined
          );
        }
      }
      
      // Only try to upsert payment intent if payment intent database exists
      if (paymentIntentDatabaseId && primaryPayment.payment.payment_intent) {
        if (typeof primaryPayment.payment.payment_intent !== 'string') {
          // Upsert payment intent if it's an expanded object
          primaryPaymentIntentNotionPageId = await coordinatedUpsertPaymentIntent(
            context,
            primaryPayment.payment.payment_intent.id,
            paymentIntentDatabaseId,
            customerDatabaseId || undefined
          );
        } else {
          // Upsert payment intent if it's just an ID
          primaryPaymentIntentNotionPageId = await coordinatedUpsertPaymentIntent(
            context,
            primaryPayment.payment.payment_intent,
            paymentIntentDatabaseId,
            customerDatabaseId || undefined
          );
        }
      }
    }
    
    const properties = stripeInvoiceToNotionProperties(
      expandedInvoice, 
      customerNotionPageId || null,
      primaryChargeNotionPageId || null,
      primaryPaymentIntentNotionPageId || null
    );
    
    if (!properties) {
      throw new Error("Failed to convert invoice to Notion properties");
    }

    const invoiceResult = await upsertPageByTitle(
      context.notionToken,
      invoiceDatabaseId,
      "Invoice ID",
      invoice.id as string,
      properties
    );

    // Process invoice line items if line item database is configured
    if (lineItemDatabaseId && expandedInvoice.lines?.data) {
      console.log(`Processing ${expandedInvoice.lines.data.length} line items for invoice ${invoice.id}`);
      
      for (const lineItem of expandedInvoice.lines.data) {
        try {
          const lineItemProperties = stripeInvoiceLineItemToNotionProperties(
            lineItem, 
            invoiceResult.id, // Link to the invoice we just created
            null // price relation not available in this context
          );
          
          await upsertPageByTitle(
            context.notionToken,
            lineItemDatabaseId,
            "Line Item ID",
            lineItem.id,
            lineItemProperties
          );
          
          console.log(`Created line item ${lineItem.id} for invoice ${invoice.id}`);
        } catch (error) {
          console.error(`Failed to create line item ${lineItem.id} for invoice ${invoice.id}:`, error);
          // Continue processing other line items even if one fails
        }
      }
      
      // Clear any previous errors for line item database since we succeeded
      await context.account.setEntityError('line_item', null);
    }

    // Clear any previous errors for this database since we succeeded
    await context.account.setEntityError('invoice', null);
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