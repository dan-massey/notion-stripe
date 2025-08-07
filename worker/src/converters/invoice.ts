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
  createSearchLinkProperty,
} from "@/converters/utils";

export function stripeInvoiceToNotionProperties(
  invoice: Stripe.Invoice,
  customerNotionPageId: string | null,
  primaryChargeNotionPageId: string | null,
  primaryPaymentIntentNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Invoice ID": createTitleProperty(invoice.id || ""),
    "Link": createSearchLinkProperty(invoice.livemode, invoice.id || ""),
    "Invoice Number": createRichTextProperty(invoice.number),
    Status: createSelectProperty(invoice.status),
    "Collection Method": createSelectProperty(invoice.collection_method),
    Currency: createRichTextProperty(invoice.currency?.toUpperCase()),
    Total: createNumberProperty(invoice.total),
    Subtotal: createNumberProperty(invoice.subtotal),
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
    "Finalized At": createDateProperty(
      invoice.status_transitions?.finalized_at
    ),
    "Paid At": createDateProperty(invoice.status_transitions?.paid_at),
    "Voided At": createDateProperty(invoice.status_transitions?.voided_at),
    "Billing Reason": createSelectProperty(invoice.billing_reason),
    Attempted: createCheckboxProperty(invoice.attempted),
    "Attempt Count": createNumberProperty(invoice.attempt_count || 0),
    "Auto Advance": createCheckboxProperty(invoice.auto_advance),
    "Live Mode": createCheckboxProperty(invoice.livemode),
    Description: createRichTextProperty(invoice.description),
    Footer: createRichTextProperty(invoice.footer),
    "Statement Descriptor": createRichTextProperty(
      invoice.statement_descriptor
    ),
    "Hosted Invoice URL": createUrlProperty(invoice.hosted_invoice_url),
    "Invoice PDF URL": createUrlProperty(invoice.invoice_pdf),
    "Receipt Number": createRichTextProperty(invoice.receipt_number),
    "Account Country": createRichTextProperty(invoice.account_country),
    "Account Name": createRichTextProperty(invoice.account_name),
    Application: createRichTextProperty(stringFromObject(invoice.application)),
    "On Behalf Of": createRichTextProperty(
      stringFromObject(invoice.on_behalf_of)
    ),
    "Latest Revision": createRichTextProperty(
      typeof invoice.latest_revision === "string"
        ? invoice.latest_revision
        : invoice.latest_revision?.id || null
    ),
    "Line Items Count": createNumberProperty(invoice.lines?.data?.length || 0),
    "Payments Count": createNumberProperty(invoice.payments?.data?.length || 0),
    "Next Payment Attempt": createDateProperty(invoice.next_payment_attempt),
    "Webhooks Delivered At": createDateProperty(invoice.webhooks_delivered_at),
    "Test Clock": createRichTextProperty(stringFromObject(invoice.test_clock)),
    Metadata: createRichTextProperty(JSON.stringify(invoice.metadata || {})),
  };

  // Add customer relation
  if (customerNotionPageId) {
    properties["Customer"] = createRelationProperty(customerNotionPageId);
  }

  // Add primary charge relation
  if (primaryChargeNotionPageId) {
    properties["Primary Charge"] = createRelationProperty(
      primaryChargeNotionPageId
    );
  }

  // Add primary payment intent relation
  if (primaryPaymentIntentNotionPageId) {
    properties["Primary Payment Intent"] = createRelationProperty(
      primaryPaymentIntentNotionPageId
    );
  }

  // Add customer details from invoice
  if (invoice.customer_address) {
    properties["Customer Address Line 1"] = createRichTextProperty(
      invoice.customer_address.line1
    );
    properties["Customer Address Line 2"] = createRichTextProperty(
      invoice.customer_address.line2
    );
    properties["Customer City"] = createRichTextProperty(
      invoice.customer_address.city
    );
    properties["Customer State"] = createRichTextProperty(
      invoice.customer_address.state
    );
    properties["Customer Postal Code"] = createRichTextProperty(
      invoice.customer_address.postal_code
    );
    properties["Customer Country"] = createRichTextProperty(
      invoice.customer_address.country
    );
  }

  properties["Customer Name"] = createRichTextProperty(invoice.customer_name);

  properties["Customer Email"] = createEmailProperty(invoice.customer_email);

  properties["Customer Phone"] = createPhoneProperty(invoice.customer_phone);

  properties["Customer Tax Exempt"] = createSelectProperty(
    invoice.customer_tax_exempt
  );

  // Add customer shipping details if available
  if (invoice.customer_shipping) {
    properties["Customer Shipping Name"] = createRichTextProperty(
      invoice.customer_shipping.name
    );
    properties["Customer Shipping Phone"] = createPhoneProperty(
      invoice.customer_shipping.phone
    );

    if (invoice.customer_shipping.address) {
      properties["Customer Shipping Address Line 1"] = createRichTextProperty(
        invoice.customer_shipping.address.line1
      );
      properties["Customer Shipping Address Line 2"] = createRichTextProperty(
        invoice.customer_shipping.address.line2
      );
      properties["Customer Shipping City"] = createRichTextProperty(
        invoice.customer_shipping.address.city
      );
      properties["Customer Shipping State"] = createRichTextProperty(
        invoice.customer_shipping.address.state
      );
      properties["Customer Shipping Postal Code"] = createRichTextProperty(
        invoice.customer_shipping.address.postal_code
      );
      properties["Customer Shipping Country"] = createRichTextProperty(
        invoice.customer_shipping.address.country
      );
    }
  }

  // Automatic tax details
  properties["Automatic Tax Enabled"] = createCheckboxProperty(
    !!invoice.automatic_tax?.enabled
  );

  if (invoice.automatic_tax?.status) {
    properties["Automatic Tax Status"] = createSelectProperty(
      invoice.automatic_tax.status
    );
  }

  if (invoice.automatic_tax?.disabled_reason) {
    properties["Automatic Tax Disabled Reason"] = createSelectProperty(
      invoice.automatic_tax.disabled_reason
    );
  }

  properties["Automatic Tax Provider"] = createRichTextProperty(
    invoice.automatic_tax?.provider
  );
  properties["Automatically Finalizes At"] = createDateProperty(
    invoice.automatically_finalizes_at
  );
  properties["Effective At"] = createDateProperty(invoice.effective_at);

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
        defaultPaymentMethodText += `: ${pm.card.brand?.toUpperCase()} ****${
          pm.card.last4
        }`;
        if (pm.card.funding)
          defaultPaymentMethodText += ` (${pm.card.funding})`;
        if (pm.card.country)
          defaultPaymentMethodText += ` [${pm.card.country}]`;
      } else if (pm.us_bank_account) {
        defaultPaymentMethodText += `: ${pm.us_bank_account.bank_name} ****${pm.us_bank_account.last4}`;
        if (pm.us_bank_account.account_type)
          defaultPaymentMethodText += ` (${pm.us_bank_account.account_type})`;
      }
    }
  }

  properties["Default Payment Method"] = createRichTextProperty(
    defaultPaymentMethodText
  );

  // Enhanced default source with expanded details
  let defaultSourceText = "";
  if (invoice.default_source) {
    if (typeof invoice.default_source === "string") {
      defaultSourceText = invoice.default_source;
    } else {
      // Expanded source object
      const source = invoice.default_source;
      defaultSourceText = `${source.object}: ${source.id}`;
      if (source.object === "card" && "last4" in source) {
        defaultSourceText += ` (${source.brand} ending ${source.last4})`;
      }
    }
  }

  properties["Default Source"] = createRichTextProperty(defaultSourceText);

  // Handle from_invoice details
  if (invoice.from_invoice) {
    properties["From Invoice Action"] = createRichTextProperty(
      invoice.from_invoice.action
    );
    properties["From Invoice ID"] = createRichTextProperty(
      typeof invoice.from_invoice.invoice === "string"
        ? invoice.from_invoice.invoice
        : invoice.from_invoice.invoice?.id || null
    );
  }

  // Handle default tax rates
  const defaultTaxRatesCount = invoice.default_tax_rates?.length || 0;
  properties["Default Tax Rates Count"] =
    createNumberProperty(defaultTaxRatesCount);
  if (invoice.default_tax_rates && invoice.default_tax_rates.length > 0) {
    const taxRates = invoice.default_tax_rates
      .map((rate) => {
        const parts = [`ID: ${rate.id}`];
        if (rate.display_name) parts.push(`Name: ${rate.display_name}`);
        if (rate.percentage !== undefined)
          parts.push(`Rate: ${rate.percentage}%`);
        if (rate.jurisdiction) parts.push(`Jurisdiction: ${rate.jurisdiction}`);
        if (rate.tax_type) parts.push(`Type: ${rate.tax_type}`);
        return parts.join(", ");
      })
      .join(" | ");
    properties["Default Tax Rates"] = createRichTextProperty(taxRates);
  } else {
    properties["Default Tax Rates"] = createRichTextProperty("");
  }

  // Handle discounts
  const discountsCount = invoice.discounts?.length || 0;
  properties["Discounts Count"] = createNumberProperty(discountsCount);
  if (invoice.discounts && invoice.discounts.length > 0) {
    const discounts = invoice.discounts
      .map((discount) =>
        typeof discount === "string" ? discount : discount.id || "Unknown"
      )
      .join(", ");
    properties["Discounts"] = createRichTextProperty(discounts);
  } else {
    properties["Discounts"] = createRichTextProperty("");
  }

  // Handle custom fields
  const customFieldsCount = invoice.custom_fields?.length || 0;
  properties["Custom Fields Count"] = createNumberProperty(customFieldsCount);
  if (invoice.custom_fields && invoice.custom_fields.length > 0) {
    const customFields = invoice.custom_fields
      .map((field) => `${field.name}: ${field.value}`)
      .join(", ");
    properties["Custom Fields"] = createRichTextProperty(customFields);
  } else {
    properties["Custom Fields"] = createRichTextProperty("");
  }

  // Handle customer tax IDs
  const customerTaxIdsCount = invoice.customer_tax_ids?.length || 0;
  properties["Customer Tax IDs Count"] =
    createNumberProperty(customerTaxIdsCount);
  if (invoice.customer_tax_ids && invoice.customer_tax_ids.length > 0) {
    const taxIds = invoice.customer_tax_ids
      .map((taxId) => `${taxId.type}: ${taxId.value}`)
      .join(", ");
    properties["Customer Tax IDs"] = createRichTextProperty(taxIds);
  } else {
    properties["Customer Tax IDs"] = createRichTextProperty("");
  }

  // Handle account tax IDs
  const accountTaxIdsCount = invoice.account_tax_ids?.length || 0;
  properties["Account Tax IDs Count"] =
    createNumberProperty(accountTaxIdsCount);
  if (invoice.account_tax_ids && invoice.account_tax_ids.length > 0) {
    const accountTaxIds = invoice.account_tax_ids.join(", ");
    properties["Account Tax IDs"] = createRichTextProperty(accountTaxIds);
  } else {
    properties["Account Tax IDs"] = createRichTextProperty("");
  }

  // Handle totals
  properties["Subtotal Excluding Tax"] = createNumberProperty(
    invoice.subtotal_excluding_tax
  );
  properties["Total Excluding Tax"] = createNumberProperty(
    invoice.total_excluding_tax
  );
  properties["Pre Payment Credit Notes Amount"] = createNumberProperty(
    invoice.pre_payment_credit_notes_amount
  );
  properties["Post Payment Credit Notes Amount"] = createNumberProperty(
    invoice.post_payment_credit_notes_amount
  );

  // Handle total discount amounts
  const totalDiscountAmountsCount = invoice.total_discount_amounts?.length || 0;
  if (
    invoice.total_discount_amounts &&
    invoice.total_discount_amounts.length > 0
  ) {
    const totalDiscountAmount = invoice.total_discount_amounts.reduce(
      (sum, discount) => sum + (discount.amount || 0),
      0
    );
    properties["Total Discount Amounts"] =
      createNumberProperty(totalDiscountAmount);
  } else {
    properties["Total Discount Amounts"] = createNumberProperty(0);
  }

  // Handle total pretax credit amounts
  if (
    invoice.total_pretax_credit_amounts &&
    invoice.total_pretax_credit_amounts.length > 0
  ) {
    const totalPretaxCreditAmount = invoice.total_pretax_credit_amounts.reduce(
      (sum, credit) => sum + (credit.amount || 0),
      0
    );
    properties["Total Pretax Credit Amounts"] = createNumberProperty(
      totalPretaxCreditAmount
    );
  } else {
    properties["Total Pretax Credit Amounts"] = createNumberProperty(0);
  }

  // Handle total taxes
  const totalTaxesCount = invoice.total_taxes?.length || 0;
  properties["Total Taxes Count"] = createNumberProperty(totalTaxesCount);
  if (invoice.total_taxes && invoice.total_taxes.length > 0) {
    const totalTaxes = invoice.total_taxes
      .map((tax) => {
        const parts = [
          `Amount: ${tax.amount}`,
          `Behavior: ${tax.tax_behavior}`,
        ];
        if (tax.taxability_reason)
          parts.push(`Reason: ${tax.taxability_reason}`);
        if (tax.taxable_amount) parts.push(`Taxable: ${tax.taxable_amount}`);
        return parts.join(", ");
      })
      .join(" | ");
    properties["Total Taxes"] = createRichTextProperty(totalTaxes);
  } else {
    properties["Total Taxes"] = createRichTextProperty("");
  }

  // Handle shipping cost
  if (invoice.shipping_cost) {
    properties["Shipping Cost Amount Subtotal"] = createNumberProperty(
      invoice.shipping_cost.amount_subtotal
    );
    properties["Shipping Cost Amount Tax"] = createNumberProperty(
      invoice.shipping_cost.amount_tax
    );
    properties["Shipping Cost Amount Total"] = createNumberProperty(
      invoice.shipping_cost.amount_total
    );
    properties["Shipping Cost Shipping Rate"] = createRichTextProperty(
      stringFromObject(invoice.shipping_cost.shipping_rate)
    );
  }

  // Handle shipping details
  if (invoice.shipping_details) {
    properties["Shipping Details Name"] = createRichTextProperty(
      invoice.shipping_details.name
    );
    properties["Shipping Details Phone"] = createPhoneProperty(
      invoice.shipping_details.phone
    );

    if (invoice.shipping_details.address) {
      properties["Shipping Details Address Line 1"] = createRichTextProperty(
        invoice.shipping_details.address.line1
      );
      properties["Shipping Details Address Line 2"] = createRichTextProperty(
        invoice.shipping_details.address.line2
      );
      properties["Shipping Details City"] = createRichTextProperty(
        invoice.shipping_details.address.city
      );
      properties["Shipping Details State"] = createRichTextProperty(
        invoice.shipping_details.address.state
      );
      properties["Shipping Details Postal Code"] = createRichTextProperty(
        invoice.shipping_details.address.postal_code
      );
      properties["Shipping Details Country"] = createRichTextProperty(
        invoice.shipping_details.address.country
      );
    }
  }

  // Handle threshold reason
  if (invoice.threshold_reason) {
    properties["Threshold Reason Amount GTE"] = createNumberProperty(
      invoice.threshold_reason.amount_gte
    );
    properties["Threshold Reason Item Reasons Count"] = createNumberProperty(
      invoice.threshold_reason.item_reasons?.length || 0
    );
  }

  // Handle issuer
  if (invoice.issuer) {
    properties["Issuer Type"] = createSelectProperty(invoice.issuer.type);
    properties["Issuer Account"] = createRichTextProperty(
      stringFromObject(invoice.issuer.account)
    );
  }

  // Handle confirmation secret
  if (invoice.confirmation_secret) {
    properties["Confirmation Secret Type"] = createRichTextProperty(
      invoice.confirmation_secret.type
    );
    properties["Confirmation Secret Client Secret"] = createRichTextProperty(
      invoice.confirmation_secret.client_secret
    );
  }

  // Handle last finalization error
  if (invoice.last_finalization_error) {
    properties["Last Finalization Error Type"] = createRichTextProperty(
      invoice.last_finalization_error.type
    );
    properties["Last Finalization Error Code"] = createRichTextProperty(
      invoice.last_finalization_error.code
    );
    properties["Last Finalization Error Message"] = createRichTextProperty(
      invoice.last_finalization_error.message
    );
  }

  // Handle payment method types
  const paymentMethodTypesCount =
    invoice.payment_settings?.payment_method_types?.length || 0;
  properties["Payment Method Types Count"] = createNumberProperty(
    paymentMethodTypesCount
  );
  if (
    invoice.payment_settings?.payment_method_types &&
    invoice.payment_settings.payment_method_types.length > 0
  ) {
    const paymentMethodTypes =
      invoice.payment_settings.payment_method_types.join(", ");
    properties["Payment Method Types"] =
      createRichTextProperty(paymentMethodTypes);
  } else {
    properties["Payment Method Types"] = createRichTextProperty("");
  }

  return properties;
}
