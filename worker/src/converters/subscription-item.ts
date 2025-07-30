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
} from "@/utils/notion-properties";

export function stripeSubscriptionItemToNotionProperties(
  subscriptionItem: Stripe.SubscriptionItem,
  subscriptionNotionPageId: string | null,
  priceNotionPageId: string | null,
  productNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Subscription Item ID": createTitleProperty(subscriptionItem.id),
    "Quantity": createNumberProperty(subscriptionItem.quantity || 1),
    "Created Date": createDateProperty(subscriptionItem.created),
    "Current Period Start": createDateProperty(subscriptionItem.current_period_start),
    "Current Period End": createDateProperty(subscriptionItem.current_period_end),
  };

  // Add relations if we have the Notion page IDs
  if (subscriptionNotionPageId) {
    properties["Subscription"] = createRelationProperty(subscriptionNotionPageId);
  }
  if (priceNotionPageId) {
    properties["Price"] = createRelationProperty(priceNotionPageId);
  }
  if (productNotionPageId) {
    properties["Product"] = createRelationProperty(productNotionPageId);
  }

  // Billing thresholds
  if (subscriptionItem.billing_thresholds) {
    properties["Usage Threshold"] = createNumberProperty(subscriptionItem.billing_thresholds.usage_gte);
  }

  // Price details from embedded price object
  if (subscriptionItem.price) {
    const price = subscriptionItem.price;
    
    properties["Price Active"] = createCheckboxProperty(price.active);
    properties["Price Currency"] = createRichTextProperty(price.currency?.toUpperCase());
    properties["Price Unit Amount"] = createNumberProperty(price.unit_amount || 0);
    properties["Price Unit Amount Decimal"] = createRichTextProperty(price.unit_amount_decimal);
    properties["Price Billing Scheme"] = createSelectProperty(price.billing_scheme);
    properties["Price Type"] = createSelectProperty(price.type);
    properties["Price Nickname"] = createRichTextProperty(price.nickname);
    properties["Price Lookup Key"] = createRichTextProperty(price.lookup_key);

    // Tax behavior
    properties["Price Tax Behavior"] = createSelectProperty(price.tax_behavior);

    // Recurring details
    if (price.recurring) {
      properties["Price Interval"] = createSelectProperty(price.recurring.interval);
      properties["Price Interval Count"] = createNumberProperty(price.recurring.interval_count || 1);
      properties["Price Usage Type"] = createSelectProperty(price.recurring.usage_type);
      properties["Price Meter"] = createRichTextProperty(price.recurring.meter);
    }

    // Tiers mode
    if (price.tiers_mode) {
      properties["Price Tiers Mode"] = createSelectProperty(price.tiers_mode);
    }

    // Transform quantity
    if (price.transform_quantity) {
      properties["Transform Quantity Divide By"] = createNumberProperty(price.transform_quantity.divide_by);
      properties["Transform Quantity Round"] = createSelectProperty(price.transform_quantity.round);
    }

    // Custom unit amount
    if (price.custom_unit_amount) {
      properties["Custom Unit Amount Enabled"] = createCheckboxProperty(true);
      properties["Custom Unit Amount Minimum"] = createNumberProperty(price.custom_unit_amount.minimum);
      properties["Custom Unit Amount Maximum"] = createNumberProperty(price.custom_unit_amount.maximum);
      properties["Custom Unit Amount Preset"] = createNumberProperty(price.custom_unit_amount.preset);
    } else {
      properties["Custom Unit Amount Enabled"] = createCheckboxProperty(false);
    }
  }

  // Tax rates
  const taxRatesCount = subscriptionItem.tax_rates?.length || 0;
  properties["Tax Rates Count"] = createNumberProperty(taxRatesCount);

  if (subscriptionItem.tax_rates && subscriptionItem.tax_rates.length > 0) {
    const primaryTaxRate = subscriptionItem.tax_rates[0];
    properties["Primary Tax Rate"] = createRichTextProperty(primaryTaxRate.id);
    properties["Primary Tax Rate Percentage"] = createNumberProperty(primaryTaxRate.percentage || 0);
    properties["Primary Tax Rate Display Name"] = createRichTextProperty(primaryTaxRate.display_name);
    properties["Primary Tax Rate Country"] = createRichTextProperty(primaryTaxRate.country);
    properties["Primary Tax Rate State"] = createRichTextProperty(primaryTaxRate.state);
    properties["Primary Tax Rate Jurisdiction"] = createRichTextProperty(primaryTaxRate.jurisdiction);
    properties["Primary Tax Rate Inclusive"] = createCheckboxProperty(primaryTaxRate.inclusive);
    properties["Primary Tax Rate Active"] = createCheckboxProperty(primaryTaxRate.active);
  }

  // Discounts
  const discountsCount = subscriptionItem.discounts?.length || 0;
  properties["Discounts Count"] = createNumberProperty(discountsCount);
  
  if (subscriptionItem.discounts && subscriptionItem.discounts.length > 0) {
    const discountsList = subscriptionItem.discounts.map(discount => {
      if (typeof discount === 'string') {
        return discount;
      }
      return stringFromObject(discount);
    }).join(', ');
    properties["Discounts Applied"] = createRichTextProperty(discountsList);
  }

  properties["Metadata"] = createRichTextProperty(JSON.stringify(subscriptionItem.metadata || {}));

  return properties;
}