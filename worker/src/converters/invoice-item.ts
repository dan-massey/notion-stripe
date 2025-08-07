import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createDateProperty,
  createRelationProperty,
  createSelectProperty,
  stringFromObject,
  createSearchLinkProperty,
} from "@/converters/utils";

export function stripeInvoiceItemToNotionProperties(
  invoiceItem: Stripe.InvoiceItem, 
  customerNotionPageId: string | null, 
  invoiceNotionPageId: string | null,
  priceNotionPageId: string | null,
  subscriptionNotionPageId: string | null = null,
  subscriptionItemNotionPageId: string | null = null
) {
  const properties: Record<string, any> = {
    "Invoice Item ID": createTitleProperty(invoiceItem.id),
    "Link": createSearchLinkProperty(invoiceItem.livemode, invoiceItem.id),
    "Amount": createNumberProperty(invoiceItem.amount || 0),
    "Currency": createRichTextProperty(invoiceItem.currency?.toUpperCase()),
    "Description": createRichTextProperty(invoiceItem.description),
    "Discountable": createCheckboxProperty(invoiceItem.discountable),
    "Period Start": createDateProperty(invoiceItem.period?.start),
    "Period End": createDateProperty(invoiceItem.period?.end),
    "Proration": createCheckboxProperty(invoiceItem.proration),
    "Quantity": createNumberProperty(invoiceItem.quantity),
    "Test Clock": createRichTextProperty(stringFromObject(invoiceItem.test_clock)),
    "Live Mode": createCheckboxProperty(invoiceItem.livemode),
    "Created Date": createDateProperty(invoiceItem.date),
    "Metadata": createRichTextProperty(JSON.stringify(invoiceItem.metadata || {})),
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = createRelationProperty(customerNotionPageId);
  }

  // Add invoice relation if we have the Notion page ID
  if (invoiceNotionPageId) {
    properties["Invoice"] = createRelationProperty(invoiceNotionPageId);
  }

  // Add price relation if we have the Notion page ID
  if (priceNotionPageId) {
    properties["Price"] = createRelationProperty(priceNotionPageId);
  }

  // Handle pricing details
  if (invoiceItem.pricing?.unit_amount_decimal) {
    properties["Unit Amount Decimal"] = createRichTextProperty(invoiceItem.pricing.unit_amount_decimal);
  }
  
  // Handle product ID from pricing details
  if (invoiceItem.pricing?.price_details?.product) {
    properties["Product"] = createRichTextProperty(invoiceItem.pricing.price_details.product);
  }

  // Handle parent information
  if (invoiceItem.parent?.type) {
    properties["Parent Type"] = createSelectProperty(invoiceItem.parent.type);
    
    if (invoiceItem.parent.type === "subscription_details" && invoiceItem.parent.subscription_details) {
      if (subscriptionNotionPageId) {
        properties["Subscription"] = createRelationProperty(subscriptionNotionPageId);
      }
      if (subscriptionItemNotionPageId) {
        properties["Subscription Item"] = createRelationProperty(subscriptionItemNotionPageId);
      }
    }
  }

  // Handle tax rates
  const taxRatesCount = invoiceItem.tax_rates?.length || 0;
  properties["Tax Rates Count"] = createNumberProperty(taxRatesCount);
  
  if (invoiceItem.tax_rates && invoiceItem.tax_rates.length > 0) {
    const taxRatesText = invoiceItem.tax_rates
      .map(rate => {
        if (typeof rate === "string") {
          return rate;
        }
        const parts = [`ID: ${rate.id}`];
        if (rate.display_name) parts.push(`Name: ${rate.display_name}`);
        if (rate.percentage !== undefined) parts.push(`Rate: ${rate.percentage}%`);
        if (rate.jurisdiction) parts.push(`Jurisdiction: ${rate.jurisdiction}`);
        if (rate.tax_type) parts.push(`Type: ${rate.tax_type}`);
        return parts.join(', ');
      })
      .join(' | ');

    properties["Tax Rates"] = createRichTextProperty(taxRatesText);
  } else {
    properties["Tax Rates"] = createRichTextProperty("");
  }

  // Handle discounts
  if (invoiceItem.discounts && invoiceItem.discounts.length > 0) {
    properties["Discounts Count"] = createNumberProperty(invoiceItem.discounts.length);

    const discountsText = invoiceItem.discounts
      .map(discount => {
        const discountInfo = typeof discount === "string" ? discount : discount.id;
        if (typeof discount === "object" && discount.coupon) {
          const coupon = discount.coupon;
          if (coupon.name) {
            return `${coupon.name} (${discountInfo})`;
          }
        }
        return discountInfo;
      })
      .join(", ");

    properties["Discounts"] = createRichTextProperty(discountsText);
  } else {
    properties["Discounts Count"] = createNumberProperty(0);

    properties["Discounts"] = createRichTextProperty("");
  }

  return properties;
}