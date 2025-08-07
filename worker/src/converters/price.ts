import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createRelationProperty,
  createSearchLinkProperty,
} from "@/converters/utils";

export function stripePriceToNotionProperties(price: Stripe.Price, productNotionPageId: string | null) {
  const properties: Record<string, any> = {
    "Price ID": createTitleProperty(price.id),
    "Link": createSearchLinkProperty(price.livemode, price.id),
    "Active": createCheckboxProperty(price.active),
    "Type": createSelectProperty(price.type),
    "Billing Scheme": createSelectProperty(price.billing_scheme),
    "Currency": createRichTextProperty(price.currency?.toUpperCase()),
    "Unit Amount": createNumberProperty(price.unit_amount),
    "Unit Amount Decimal": createRichTextProperty(price.unit_amount_decimal),
    "Nickname": createRichTextProperty(price.nickname),
    "Lookup Key": createRichTextProperty(price.lookup_key),
    "Tax Behavior": createSelectProperty(price.tax_behavior),
    "Live Mode": createCheckboxProperty(price.livemode),
    "Created Date": createDateProperty(price.created),
    "Metadata": createRichTextProperty(JSON.stringify(price.metadata || {})),
  };

  // Add product relation if we have the Notion page ID
  if (productNotionPageId) {
    properties["Product"] = createRelationProperty(productNotionPageId);
  }

  // Handle recurring details
  if (price.recurring) {
    properties["Recurring Interval"] = createSelectProperty(price.recurring.interval);

    properties["Recurring Interval Count"] = createNumberProperty(price.recurring.interval_count || 1);

    properties["Recurring Usage Type"] = createSelectProperty(price.recurring.usage_type);

    properties["Recurring Meter"] = createRichTextProperty(price.recurring.meter);
  } else {
    properties["Recurring Interval"] = createSelectProperty(null);

    properties["Recurring Interval Count"] = createNumberProperty(null);

    properties["Recurring Usage Type"] = createSelectProperty(null);

    properties["Recurring Meter"] = createRichTextProperty("");
  }

  // Handle custom unit amount
  if (price.custom_unit_amount) {
    properties["Custom Unit Amount Minimum"] = createNumberProperty(price.custom_unit_amount.minimum);

    properties["Custom Unit Amount Maximum"] = createNumberProperty(price.custom_unit_amount.maximum);

    properties["Custom Unit Amount Preset"] = createNumberProperty(price.custom_unit_amount.preset);
  } else {
    properties["Custom Unit Amount Minimum"] = createNumberProperty(null);

    properties["Custom Unit Amount Maximum"] = createNumberProperty(null);

    properties["Custom Unit Amount Preset"] = createNumberProperty(null);
  }

  // Handle tiers
  if (price.tiers && price.tiers.length > 0) {
    properties["Tiers Count"] = createNumberProperty(price.tiers.length);

    properties["Tiers Mode"] = createSelectProperty(price.tiers_mode);
  } else {
    properties["Tiers Count"] = createNumberProperty(0);

    properties["Tiers Mode"] = createSelectProperty(null);
  }

  // Handle transform quantity
  if (price.transform_quantity) {
    properties["Transform Quantity Divide By"] = createNumberProperty(price.transform_quantity.divide_by);

    properties["Transform Quantity Round"] = createSelectProperty(price.transform_quantity.round);
  } else {
    properties["Transform Quantity Divide By"] = createNumberProperty(null);

    properties["Transform Quantity Round"] = createSelectProperty(null);
  }

  // Handle currency options
  if (price.currency_options && Object.keys(price.currency_options).length > 0) {
    properties["Currency Options Count"] = createNumberProperty(Object.keys(price.currency_options).length);

    // Create a summary of currency options
    const currencyOptionsSummary = Object.entries(price.currency_options)
      .map(([currency, options]) => {
        let summary = currency.toUpperCase();
        if (options.unit_amount) {
          summary += `: ${options.unit_amount}`;
        } else if (options.unit_amount_decimal) {
          summary += `: ${options.unit_amount_decimal}`;
        }
        if (options.tax_behavior) {
          summary += ` (${options.tax_behavior})`;
        }
        return summary;
      })
      .join(", ");

    properties["Currency Options"] = createRichTextProperty(currencyOptionsSummary);
  } else {
    properties["Currency Options Count"] = createNumberProperty(0);

    properties["Currency Options"] = createRichTextProperty("");
  }

  return properties;
}