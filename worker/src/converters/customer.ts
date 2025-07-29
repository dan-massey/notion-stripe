import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createEmailProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createPhoneProperty,
  stringFromObject,
} from "@/utils/notion-properties";

export function stripeCustomerToNotionProperties(customer: Stripe.Customer) {
  const properties: Record<string, any> = {
    "Customer ID": createTitleProperty(customer.id),
    "Name": createRichTextProperty(customer.name),
    "Email": createEmailProperty(customer.email),
    "Phone": createPhoneProperty(customer.phone),
    "Balance": createNumberProperty(customer.balance ? customer.balance / 100 : 0), // Convert from cents to dollars
    "Currency": createRichTextProperty(customer.currency?.toUpperCase()),
    "Delinquent": createCheckboxProperty(customer.delinquent),
    "Tax Exempt": createSelectProperty(customer.tax_exempt),
    "Live Mode": createCheckboxProperty(customer.livemode),
    "Created Date": createDateProperty(customer.created),
    "Description": createRichTextProperty(customer.description),
    "Invoice Prefix": createRichTextProperty(customer.invoice_prefix),
    "Next Invoice Sequence": createNumberProperty(customer.next_invoice_sequence),
  };

  // Add address fields if available
  if (customer.address) {
    properties["Address Line 1"] = createRichTextProperty(customer.address.line1);
    properties["Address Line 2"] = createRichTextProperty(customer.address.line2);
    properties["City"] = createRichTextProperty(customer.address.city);
    properties["State"] = createRichTextProperty(customer.address.state);
    properties["Postal Code"] = createRichTextProperty(customer.address.postal_code);
    properties["Country"] = createRichTextProperty(customer.address.country);
  }

  // Add shipping fields if available
  if (customer.shipping) {
    properties["Shipping Name"] = createRichTextProperty(customer.shipping.name);
    properties["Shipping Phone"] = createPhoneProperty(customer.shipping.phone);

    if (customer.shipping.address) {
      properties["Shipping Address Line 1"] = createRichTextProperty(customer.shipping.address.line1);
      properties["Shipping Address Line 2"] = createRichTextProperty(customer.shipping.address.line2);
      properties["Shipping City"] = createRichTextProperty(customer.shipping.address.city);
      properties["Shipping State"] = createRichTextProperty(customer.shipping.address.state);
      properties["Shipping Postal Code"] = createRichTextProperty(customer.shipping.address.postal_code);
      properties["Shipping Country"] = createRichTextProperty(customer.shipping.address.country);
    }
  }

  // Add additional fields
  properties["Preferred Locales"] = createRichTextProperty(customer.preferred_locales?.join(", "));

  // Enhanced default payment method with expanded details
  let defaultPaymentMethodText = "";
  if (customer.invoice_settings?.default_payment_method) {
    if (typeof customer.invoice_settings.default_payment_method === "string") {
      defaultPaymentMethodText = customer.invoice_settings.default_payment_method;
    } else {
      // Expanded payment method object
      const pm = customer.invoice_settings.default_payment_method;
      defaultPaymentMethodText = `${pm.type.toUpperCase()}`;
      if (pm.card) {
        defaultPaymentMethodText += `: ${pm.card.brand?.toUpperCase()} ****${pm.card.last4}`;
        if (pm.card.funding) defaultPaymentMethodText += ` (${pm.card.funding})`;
        if (pm.card.country) defaultPaymentMethodText += ` [${pm.card.country}]`;
      } else if (pm.us_bank_account) {
        defaultPaymentMethodText += `: ${pm.us_bank_account.bank_name} ****${pm.us_bank_account.last4}`;
        if (pm.us_bank_account.account_type) defaultPaymentMethodText += ` (${pm.us_bank_account.account_type})`;
      } else if (pm.sepa_debit) {
        defaultPaymentMethodText += `: ****${pm.sepa_debit.last4}`;
        if (pm.sepa_debit.country) defaultPaymentMethodText += ` [${pm.sepa_debit.country}]`;
      }
    }
  }

  properties["Default Payment Method"] = createRichTextProperty(defaultPaymentMethodText);

  // Enhanced default source with expanded details
  let defaultSourceText = "";
  if (customer.default_source) {
    if (typeof customer.default_source === "string") {
      defaultSourceText = customer.default_source;
    } else {
      // Expanded source object
      const source = customer.default_source;
      defaultSourceText = `${source.object}: ${source.id}`;
      if (source.object === 'card' && 'last4' in source) {
        defaultSourceText += ` (${source.brand} ending ${source.last4})`;
      }
    }
  }

  properties["Default Source"] = createRichTextProperty(defaultSourceText);

  properties["Cash Balance Available"] = createCheckboxProperty(!!customer.cash_balance);

  // Discount information
  properties["Has Active Discount"] = createCheckboxProperty(!!customer.discount);

  if (customer.discount) {
    properties["Discount Type"] = createSelectProperty(customer.discount.coupon ? "coupon" : "promotion_code");
  }

  // Tax information
  if (customer.tax) {
    properties["Tax Location Country"] = createRichTextProperty(customer.tax.location?.country);
    properties["Tax Location State"] = createRichTextProperty(customer.tax.location?.state);
    properties["Tax Automatic Status"] = createSelectProperty(stringFromObject(customer.tax.automatic_tax));
  }

  // Metadata
  properties["Metadata"] = createRichTextProperty(JSON.stringify(customer.metadata || {}));

  // Test clock
  properties["Test Clock ID"] = createRichTextProperty(stringFromObject(customer.test_clock));

  // Calculate active subscriptions from expanded data
  let activeSubscriptionsCount = 0;
  if (customer.subscriptions && typeof customer.subscriptions === 'object' && 'data' in customer.subscriptions) {
    activeSubscriptionsCount = customer.subscriptions.data.filter(
      sub => sub.status === 'active' || sub.status === 'trialing'
    ).length;
  }

  properties["Active Subscriptions"] = createNumberProperty(activeSubscriptionsCount);

  // Calculate total payment sources from expanded data
  let totalPaymentSourcesCount = 0;
  if (customer.sources && typeof customer.sources === 'object' && 'data' in customer.sources) {
    totalPaymentSourcesCount = customer.sources.data.length;
  }

  properties["Total Payment Sources"] = createNumberProperty(totalPaymentSourcesCount);

  return properties;
}