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

export function stripeInvoiceLineItemToNotionProperties(
  lineItem: Stripe.InvoiceLineItem, 
  invoiceNotionPageId: string | null,
  priceNotionPageId: string | null,
  subscriptionNotionPageId: string | null = null,
  subscriptionItemNotionPageId: string | null = null,
  invoiceItemNotionPageId: string | null = null
) {
  const properties: Record<string, any> = {
    "Line Item ID": createTitleProperty(lineItem.id),
    "Amount": createNumberProperty(lineItem.amount || 0),
    "Currency": createRichTextProperty(lineItem.currency?.toUpperCase()),
    "Description": createRichTextProperty(lineItem.description),
    "Discountable": createCheckboxProperty(lineItem.discountable),
    "Live Mode": createCheckboxProperty(lineItem.livemode),
    "Quantity": createNumberProperty(lineItem.quantity),
    "Period Start": createDateProperty(lineItem.period?.start),
    "Period End": createDateProperty(lineItem.period?.end),
    "Metadata": createRichTextProperty(JSON.stringify(lineItem.metadata || {})),
  };

  // Handle parent type and extract proration info
  let isProration = false;
  if (lineItem.parent?.type) {
    properties["Parent Type"] = createSelectProperty(lineItem.parent.type);
    
    if (lineItem.parent.type === "invoice_item_details" && lineItem.parent.invoice_item_details) {
      isProration = lineItem.parent.invoice_item_details.proration || false;
    } else if (lineItem.parent.type === "subscription_item_details" && lineItem.parent.subscription_item_details) {
      isProration = lineItem.parent.subscription_item_details.proration || false;
    }
  }
  
  properties["Proration"] = createCheckboxProperty(isProration);

  // Handle pricing details from embedded pricing object
  if (lineItem.pricing?.unit_amount_decimal) {
    properties["Unit Amount Excluding Tax"] = createRichTextProperty(lineItem.pricing.unit_amount_decimal);
  }

  // Add relations if we have the Notion page IDs
  if (invoiceNotionPageId) {
    properties["Invoice"] = createRelationProperty(invoiceNotionPageId);
  }
  if (priceNotionPageId) {
    properties["Price"] = createRelationProperty(priceNotionPageId);
  }
  if (subscriptionNotionPageId) {
    properties["Subscription"] = createRelationProperty(subscriptionNotionPageId);
  }
  if (subscriptionItemNotionPageId) {
    properties["Subscription Item"] = createRelationProperty(subscriptionItemNotionPageId);
  }
  if (invoiceItemNotionPageId) {
    properties["Invoice Item"] = createRelationProperty(invoiceItemNotionPageId);
  }

  // Handle proration details
  let prorationDetailsCount = 0;
  let prorationDetailsText = "";
  if (lineItem.parent?.type === "invoice_item_details" && lineItem.parent.invoice_item_details?.proration_details?.credited_items) {
    const creditedItems = lineItem.parent.invoice_item_details.proration_details.credited_items;
    prorationDetailsCount = creditedItems.invoice_line_items?.length || 0;
    prorationDetailsText = `Invoice: ${creditedItems.invoice}, Items: ${creditedItems.invoice_line_items?.join(', ') || ''}`;
  } else if (lineItem.parent?.type === "subscription_item_details" && lineItem.parent.subscription_item_details?.proration_details?.credited_items) {
    const creditedItems = lineItem.parent.subscription_item_details.proration_details.credited_items;
    prorationDetailsCount = creditedItems.invoice_line_items?.length || 0;
    prorationDetailsText = `Invoice: ${creditedItems.invoice}, Items: ${creditedItems.invoice_line_items?.join(', ') || ''}`;
  }
  properties["Proration Details Credited Items Count"] = createNumberProperty(prorationDetailsCount);
  properties["Proration Details"] = createRichTextProperty(prorationDetailsText);

  // Handle taxes array
  const taxesCount = lineItem.taxes?.length || 0;
  properties["Tax Amounts Count"] = createNumberProperty(taxesCount);
  if (lineItem.taxes && lineItem.taxes.length > 0) {
    const taxAmounts = lineItem.taxes.map(tax => 
      `${tax.amount} (${tax.tax_behavior}, ${tax.taxability_reason})`
    ).join(', ');
    properties["Tax Amounts"] = createRichTextProperty(taxAmounts);
  } else {
    properties["Tax Amounts"] = createRichTextProperty("");
  }

  // Tax rates are not directly available on line items, but we can track the count
  properties["Tax Rates Count"] = createNumberProperty(taxesCount);
  properties["Tax Rates"] = createRichTextProperty("");

  // Handle discount amounts
  const discountAmountsCount = lineItem.discount_amounts?.length || 0;
  properties["Discount Amounts Count"] = createNumberProperty(discountAmountsCount);
  if (lineItem.discount_amounts && lineItem.discount_amounts.length > 0) {
    const discountAmounts = lineItem.discount_amounts.map(discount => 
      `${discount.amount} (${discount.discount})`
    ).join(', ');
    properties["Discount Amounts"] = createRichTextProperty(discountAmounts);
  } else {
    properties["Discount Amounts"] = createRichTextProperty("");
  }

  // Handle discounts
  const discountsCount = lineItem.discounts?.length || 0;
  properties["Discounts Count"] = createNumberProperty(discountsCount);
  if (lineItem.discounts && lineItem.discounts.length > 0) {
    const discounts = lineItem.discounts.join(', ');
    properties["Discounts"] = createRichTextProperty(discounts);
  } else {
    properties["Discounts"] = createRichTextProperty("");
  }

  return properties;
}