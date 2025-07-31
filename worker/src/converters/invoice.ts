import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createEmailProperty,
  createUrlProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createPhoneProperty,
  createRelationProperty,
  stringFromObject,
} from "@/converters/notion-properties";

export function stripeInvoiceToNotionProperties(
  invoice: Stripe.Invoice, 
  customerNotionPageId: string | null,
  primaryChargeNotionPageId: string | null,
  primaryPaymentIntentNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Invoice ID": createTitleProperty(invoice.id || ""),
    "Invoice Number": createRichTextProperty(invoice.number),
    "Status": createSelectProperty(invoice.status),
    "Collection Method": createSelectProperty(invoice.collection_method),
    "Currency": createRichTextProperty(invoice.currency?.toUpperCase()),
    "Total": createNumberProperty(invoice.total),
    "Subtotal": createNumberProperty(invoice.subtotal),
    "Amount Due": createNumberProperty(invoice.amount_due),
    "Amount Paid": createNumberProperty(invoice.amount_paid),
    "Amount Remaining": createNumberProperty(invoice.amount_remaining),
    "Starting Balance": createNumberProperty(invoice.starting_balance),
    "Ending Balance": createNumberProperty(invoice.ending_balance),
    "Amount Overpaid": createNumberProperty(invoice.amount_overpaid),
    "Amount Shipping": createNumberProperty(invoice.amount_shipping),
    "Created Date": createDateProperty(invoice.created),
    "Due Date": createDateProperty(invoice.due_date),
    "Period Start": createDateProperty(invoice.period_start),
    "Period End": createDateProperty(invoice.period_end),
    "Finalized At": createDateProperty(invoice.status_transitions?.finalized_at),
    "Paid At": createDateProperty(invoice.status_transitions?.paid_at),
    "Voided At": createDateProperty(invoice.status_transitions?.voided_at),
    "Billing Reason": createSelectProperty(invoice.billing_reason),
    "Attempted": createCheckboxProperty(invoice.attempted),
    "Attempt Count": createNumberProperty(invoice.attempt_count || 0),
    "Auto Advance": createCheckboxProperty(invoice.auto_advance),
    "Live Mode": createCheckboxProperty(invoice.livemode),
    "Description": createRichTextProperty(invoice.description),
    "Footer": createRichTextProperty(invoice.footer),
    "Statement Descriptor": createRichTextProperty(invoice.statement_descriptor),
    "Hosted Invoice URL": createUrlProperty(invoice.hosted_invoice_url),
    "Invoice PDF URL": createUrlProperty(invoice.invoice_pdf),
    "Receipt Number": createRichTextProperty(invoice.receipt_number),
    "Account Country": createRichTextProperty(invoice.account_country),
    "Account Name": createRichTextProperty(invoice.account_name),
    "Application": createRichTextProperty(stringFromObject(invoice.application)),
    "On Behalf Of": createRichTextProperty(stringFromObject(invoice.on_behalf_of)),
    "Line Items Count": createNumberProperty(invoice.lines?.data?.length || 0),
    "Payments Count": createNumberProperty(invoice.payments?.data?.length || 0),
    "Next Payment Attempt": createDateProperty(invoice.next_payment_attempt),
    "Webhooks Delivered At": createDateProperty(invoice.webhooks_delivered_at),
    "Test Clock": createRichTextProperty(stringFromObject(invoice.test_clock)),
    "Metadata": createRichTextProperty(JSON.stringify(invoice.metadata || {})),
  };

  // Add customer relation
  if (customerNotionPageId) {
    properties["Customer"] = createRelationProperty(customerNotionPageId);
  }

  // Add primary charge relation
  if (primaryChargeNotionPageId) {
    properties["Primary Charge"] = createRelationProperty(primaryChargeNotionPageId);
  }

  // Add primary payment intent relation
  if (primaryPaymentIntentNotionPageId) {
    properties["Primary Payment Intent"] = createRelationProperty(primaryPaymentIntentNotionPageId);
  }

  // Add customer details from invoice
  if (invoice.customer_address) {
    properties["Customer Address Line 1"] = createRichTextProperty(invoice.customer_address.line1);
    properties["Customer Address Line 2"] = createRichTextProperty(invoice.customer_address.line2);
    properties["Customer City"] = createRichTextProperty(invoice.customer_address.city);
    properties["Customer State"] = createRichTextProperty(invoice.customer_address.state);
    properties["Customer Postal Code"] = createRichTextProperty(invoice.customer_address.postal_code);
    properties["Customer Country"] = createRichTextProperty(invoice.customer_address.country);
  }

  properties["Customer Name"] = createRichTextProperty(invoice.customer_name);

  properties["Customer Email"] = createEmailProperty(invoice.customer_email);

  properties["Customer Phone"] = createPhoneProperty(invoice.customer_phone);

  properties["Customer Tax Exempt"] = createSelectProperty(invoice.customer_tax_exempt);

  // Add customer shipping details if available
  if (invoice.customer_shipping) {
    properties["Customer Shipping Name"] = createRichTextProperty(invoice.customer_shipping.name);
    properties["Customer Shipping Phone"] = createPhoneProperty(invoice.customer_shipping.phone);

    if (invoice.customer_shipping.address) {
      properties["Customer Shipping Address Line 1"] = createRichTextProperty(invoice.customer_shipping.address.line1);
      properties["Customer Shipping Address Line 2"] = createRichTextProperty(invoice.customer_shipping.address.line2);
      properties["Customer Shipping City"] = createRichTextProperty(invoice.customer_shipping.address.city);
      properties["Customer Shipping State"] = createRichTextProperty(invoice.customer_shipping.address.state);
      properties["Customer Shipping Postal Code"] = createRichTextProperty(invoice.customer_shipping.address.postal_code);
      properties["Customer Shipping Country"] = createRichTextProperty(invoice.customer_shipping.address.country);
    }
  }

  // Automatic tax details
  properties["Automatic Tax Enabled"] = createCheckboxProperty(!!invoice.automatic_tax?.enabled);

  if (invoice.automatic_tax?.status) {
    properties["Automatic Tax Status"] = createSelectProperty(invoice.automatic_tax.status);
  }

  // Enhanced default payment method with expanded details
  let defaultPaymentMethodText = "";
  if (invoice.default_payment_method) {
    if (typeof invoice.default_payment_method === "string") {
      defaultPaymentMethodText = invoice.default_payment_method;
    } else {
      // Expanded payment method object
      const pm = invoice.default_payment_method;
      defaultPaymentMethodText = `${pm.type?.toUpperCase()}`;
      if (pm.card) {
        defaultPaymentMethodText += `: ${pm.card.brand?.toUpperCase()} ****${pm.card.last4}`;
        if (pm.card.funding) defaultPaymentMethodText += ` (${pm.card.funding})`;
        if (pm.card.country) defaultPaymentMethodText += ` [${pm.card.country}]`;
      } else if (pm.us_bank_account) {
        defaultPaymentMethodText += `: ${pm.us_bank_account.bank_name} ****${pm.us_bank_account.last4}`;
        if (pm.us_bank_account.account_type) defaultPaymentMethodText += ` (${pm.us_bank_account.account_type})`;
      }
    }
  }

  properties["Default Payment Method"] = createRichTextProperty(defaultPaymentMethodText);

  // Enhanced default source with expanded details
  let defaultSourceText = "";
  if (invoice.default_source) {
    if (typeof invoice.default_source === "string") {
      defaultSourceText = invoice.default_source;
    } else {
      // Expanded source object
      const source = invoice.default_source;
      defaultSourceText = `${source.object}: ${source.id}`;
      if (source.object === 'card' && 'last4' in source) {
        defaultSourceText += ` (${source.brand} ending ${source.last4})`;
      }
    }
  }

  properties["Default Source"] = createRichTextProperty(defaultSourceText);

  return properties;
}