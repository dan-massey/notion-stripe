import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createDateProperty,
  createRelationProperty,
  stringFromObject,
} from "@/utils/notion-properties";

export function stripeInvoiceItemToNotionProperties(
  invoiceItem: Stripe.InvoiceItem, 
  customerNotionPageId: string | null, 
  invoiceNotionPageId: string | null,
  priceNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Invoice Item ID": createTitleProperty(invoiceItem.id),
    "Amount": createNumberProperty(invoiceItem.amount || 0),
    "Currency": createRichTextProperty(invoiceItem.currency?.toUpperCase()),
    "Description": createRichTextProperty(invoiceItem.description),
    "Discountable": createCheckboxProperty(invoiceItem.discountable),
    "Period Start": createDateProperty(invoiceItem.period?.start),
    "Period End": createDateProperty(invoiceItem.period?.end),
    "Proration": createCheckboxProperty(invoiceItem.proration),
    "Quantity": createNumberProperty(invoiceItem.quantity),
    "Subscription": createRichTextProperty(""),
    "Subscription Item": createRichTextProperty(""),
    "Test Clock": createRichTextProperty(stringFromObject(invoiceItem.test_clock)),
    "Unit Amount": createNumberProperty(null),
    "Unit Amount Decimal": createRichTextProperty(""),
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

  // Handle tax rates
  if (invoiceItem.tax_rates && invoiceItem.tax_rates.length > 0) {
    properties["Tax Rates Count"] = createNumberProperty(invoiceItem.tax_rates.length);

    const taxRatesText = invoiceItem.tax_rates
      .map(rate => {
        const rateInfo = typeof rate === "string" ? rate : rate.id;
        if (typeof rate === "object" && rate.display_name) {
          return `${rate.display_name} (${rateInfo})`;
        }
        return rateInfo;
      })
      .join(", ");

    properties["Tax Rates"] = createRichTextProperty(taxRatesText);
  } else {
    properties["Tax Rates Count"] = createNumberProperty(0);

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