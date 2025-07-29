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
  priceNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Line Item ID": createTitleProperty(lineItem.id),
    "Type": createSelectProperty(null),
    "Amount": createNumberProperty(lineItem.amount || 0),
    "Amount Excluding Tax": createNumberProperty(null),
    "Currency": createRichTextProperty(lineItem.currency?.toUpperCase()),
    "Description": createRichTextProperty(lineItem.description),
    "Discountable": createCheckboxProperty(lineItem.discountable),
    "Live Mode": createCheckboxProperty(lineItem.livemode),
    "Proration": createCheckboxProperty(false),
    "Quantity": createNumberProperty(lineItem.quantity),
    "Subscription": createRichTextProperty(stringFromObject(lineItem.subscription)),
    "Subscription Item": createRichTextProperty(""),
    "Unit Amount Excluding Tax": createRichTextProperty(""),
    "Invoice Item": createRichTextProperty(""),
    "Period Start": createDateProperty(lineItem.period?.start),
    "Period End": createDateProperty(lineItem.period?.end),
    "Metadata": createRichTextProperty(JSON.stringify(lineItem.metadata || {})),
  };

  // Add invoice relation if we have the Notion page ID
  if (invoiceNotionPageId) {
    properties["Invoice"] = createRelationProperty(invoiceNotionPageId);
  }

  // Add price relation if we have the Notion page ID
  if (priceNotionPageId) {
    properties["Price"] = createRelationProperty(priceNotionPageId);
  }

  // Handle proration details (not available on InvoiceLineItem type)
  properties["Proration Details Credited Items Count"] = createNumberProperty(0);

  properties["Proration Details"] = createRichTextProperty("");

  // Handle tax amounts (not available on InvoiceLineItem type)
  properties["Tax Amounts Count"] = createNumberProperty(0);

  properties["Tax Amounts"] = createRichTextProperty("");

  // Handle tax rates (not available on InvoiceLineItem type)
  properties["Tax Rates Count"] = createNumberProperty(0);

  properties["Tax Rates"] = createRichTextProperty("");

  // Handle discount amounts (not available on InvoiceLineItem type)
  properties["Discount Amounts Count"] = createNumberProperty(0);

  properties["Discount Amounts"] = createRichTextProperty("");

  // Handle discounts (not available on InvoiceLineItem type)
  properties["Discounts Count"] = createNumberProperty(0);

  properties["Discounts"] = createRichTextProperty("");

  return properties;
}