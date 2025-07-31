import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createRelationProperty,
  stringFromObject,
} from "@/converters/notion-properties";

export function stripeSubscriptionToNotionProperties(
  subscription: Stripe.Subscription, 
  customerNotionPageId: string | null,
  latestInvoiceNotionPageId: string | null,
  primaryPriceNotionPageId: string | null,
  primaryProductNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Subscription ID": createTitleProperty(subscription.id),
    "Status": createSelectProperty(subscription.status),
    "Collection Method": createSelectProperty(subscription.collection_method),
    "Currency": createRichTextProperty(subscription.currency?.toUpperCase()),
    "Created Date": createDateProperty(subscription.created),
    "Start Date": createDateProperty(subscription.start_date),
    "Current Period Start": createDateProperty(subscription.items?.data?.[0]?.current_period_start),
    "Current Period End": createDateProperty(subscription.items?.data?.[0]?.current_period_end),
    "Trial Start": createDateProperty(subscription.trial_start),
    "Trial End": createDateProperty(subscription.trial_end),
    "Billing Cycle Anchor": createDateProperty(subscription.billing_cycle_anchor),
    "Cancel At": createDateProperty(subscription.cancel_at),
    "Canceled At": createDateProperty(subscription.canceled_at),
    "Ended At": createDateProperty(subscription.ended_at),
    "Cancel At Period End": createCheckboxProperty(subscription.cancel_at_period_end),
    "Live Mode": createCheckboxProperty(subscription.livemode),
    "Billing Mode": createSelectProperty(subscription.billing_thresholds ? "flexible" : "classic"),
    "Application Fee Percent": createNumberProperty(subscription.application_fee_percent),
    "Days Until Due": createNumberProperty(subscription.days_until_due),
    "Description": createRichTextProperty(subscription.description),
    "Automatic Tax Enabled": createCheckboxProperty(!!subscription.automatic_tax?.enabled),
    "Automatic Tax Disabled Reason": createSelectProperty(subscription.automatic_tax?.disabled_reason),
    "Billing Threshold Amount": createNumberProperty(subscription.billing_thresholds?.amount_gte),
    "Reset Billing Cycle Anchor": createCheckboxProperty(subscription.billing_thresholds?.reset_billing_cycle_anchor),
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = createRelationProperty(customerNotionPageId);
  }

  // Add latest invoice relation if we have the Notion page ID
  if (latestInvoiceNotionPageId) {
    properties["Latest Invoice"] = createRelationProperty(latestInvoiceNotionPageId);
  }

  // Enhanced default payment method with expanded details
  let defaultPaymentMethodText = "";
  if (subscription.default_payment_method) {
    if (typeof subscription.default_payment_method === "string") {
      defaultPaymentMethodText = subscription.default_payment_method;
    } else {
      // Expanded payment method object
      const pm = subscription.default_payment_method;
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
  if (subscription.default_source) {
    if (typeof subscription.default_source === "string") {
      defaultSourceText = subscription.default_source;
    } else {
      // Expanded source object
      const source = subscription.default_source;
      defaultSourceText = `${source.object}: ${source.id}`;
      if (source.object === 'card' && 'last4' in source) {
        defaultSourceText += ` (${source.brand} ending ${source.last4})`;
      }
    }
  }

  properties["Default Source"] = createRichTextProperty(defaultSourceText);

  // Cancellation details
  if (subscription.cancellation_details) {
    properties["Cancellation Reason"] = createSelectProperty(subscription.cancellation_details.reason);
    properties["Cancellation Feedback"] = createSelectProperty(subscription.cancellation_details.feedback);
    properties["Cancellation Comment"] = createRichTextProperty(subscription.cancellation_details.comment);
  }

  // Trial settings
  if (subscription.trial_settings) {
    properties["Trial End Behavior"] = createSelectProperty(subscription.trial_settings.end_behavior?.missing_payment_method);
  }

  // Pause collection
  if (subscription.pause_collection) {
    properties["Pause Collection Behavior"] = createSelectProperty(subscription.pause_collection.behavior);
    properties["Pause Resumes At"] = createDateProperty(subscription.pause_collection.resumes_at);
  }

  // Pending invoice item interval
  if (subscription.pending_invoice_item_interval) {
    properties["Pending Invoice Item Interval"] = createSelectProperty(subscription.pending_invoice_item_interval.interval);
    properties["Pending Invoice Item Interval Count"] = createNumberProperty(subscription.pending_invoice_item_interval.interval_count || 1);
  }

  // Next pending invoice item invoice
  properties["Next Pending Invoice Item Invoice"] = createDateProperty(subscription.next_pending_invoice_item_invoice);

  // Payment settings
  if (subscription.payment_settings) {
    properties["Save Default Payment Method"] = createSelectProperty(subscription.payment_settings.save_default_payment_method);
  }

  // Application and on behalf of
  properties["Application"] = createRichTextProperty(stringFromObject(subscription.application));
  properties["On Behalf Of"] = createRichTextProperty(stringFromObject(subscription.on_behalf_of));

  // Schedule
  properties["Schedule"] = createRichTextProperty(stringFromObject(subscription.schedule));

  // Pending setup intent
  properties["Pending Setup Intent"] = createRichTextProperty(stringFromObject(subscription.pending_setup_intent));

  // Transfer data
  if (subscription.transfer_data) {
    properties["Transfer Destination"] = createRichTextProperty(stringFromObject(subscription.transfer_data.destination));
    properties["Transfer Amount Percent"] = createNumberProperty(subscription.transfer_data.amount_percent);
  }

  // Pending update
  if (subscription.pending_update) {
    properties["Pending Update Expires At"] = createDateProperty(subscription.pending_update.expires_at);
    properties["Has Pending Update"] = createCheckboxProperty(true);
  } else {
    properties["Has Pending Update"] = createCheckboxProperty(false);
  }

  // Subscription items count and details
  const itemsCount = subscription.items?.data?.length || 0;
  properties["Subscription Items Count"] = createNumberProperty(itemsCount);

  // Primary item details (first item if available)
  if (subscription.items?.data && subscription.items.data.length > 0) {
    const primaryItem = subscription.items.data[0];
    const price = primaryItem.price;
    
    // Add Primary Price relation if we have the Notion page ID
    if (primaryPriceNotionPageId) {
      properties["Primary Price"] = createRelationProperty(primaryPriceNotionPageId);
    }

    // Add Primary Product relation if we have the Notion page ID
    if (primaryProductNotionPageId) {
      properties["Primary Product"] = createRelationProperty(primaryProductNotionPageId);
    }

    properties["Primary Price Amount"] = createNumberProperty(price.unit_amount || 0);

    if (price.recurring) {
      properties["Primary Price Interval"] = createSelectProperty(price.recurring.interval);
      properties["Primary Price Interval Count"] = createNumberProperty(price.recurring.interval_count || 1);
    }

    properties["Primary Quantity"] = createNumberProperty(primaryItem.quantity || 1);
  }

  // Calculate tax rate percentage from default_tax_rates if available
  let taxRatePercentage = 0;
  if (subscription.default_tax_rates && subscription.default_tax_rates.length > 0) {
    // Take the first tax rate as primary
    const primaryTaxRate = subscription.default_tax_rates[0];
    taxRatePercentage = primaryTaxRate.percentage || 0;
  }

  properties["Tax Rate Percentage"] = createNumberProperty(taxRatePercentage);
  properties["Test Clock"] = createRichTextProperty(stringFromObject(subscription.test_clock));
  properties["Metadata"] = createRichTextProperty(JSON.stringify(subscription.metadata || {}));

  return properties;
}