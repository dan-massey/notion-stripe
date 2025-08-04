import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createRelationProperty
} from "@/converters/notion-properties";

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
    properties["Unit Amount Decimal"] = createRichTextProperty(lineItem.pricing.unit_amount_decimal);
  }
  
  // Handle product ID from pricing details
  if (lineItem.pricing?.price_details?.product) {
    properties["Product"] = createRichTextProperty(lineItem.pricing.price_details.product);
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
  properties["Taxes Count"] = createNumberProperty(taxesCount);
  if (lineItem.taxes && lineItem.taxes.length > 0) {
    const taxes = lineItem.taxes.map(tax => {
      const parts = [`Amount: ${tax.amount}`, `Behavior: ${tax.tax_behavior}`];
      if (tax.taxability_reason) parts.push(`Reason: ${tax.taxability_reason}`);
      if (tax.taxable_amount) parts.push(`Taxable: ${tax.taxable_amount}`);
      return parts.join(', ');
    }).join(' | ');
    properties["Taxes"] = createRichTextProperty(taxes);
  } else {
    properties["Taxes"] = createRichTextProperty("");
  }

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
    const discounts = lineItem.discounts.map(discount => 
      typeof discount === 'string' ? discount : discount.id || 'Unknown'
    ).join(', ');
    properties["Discounts"] = createRichTextProperty(discounts);
  } else {
    properties["Discounts"] = createRichTextProperty("");
  }

  // Handle pretax credit amounts
  const pretaxCreditAmountsCount = lineItem.pretax_credit_amounts?.length || 0;
  properties["Pretax Credit Amounts Count"] = createNumberProperty(pretaxCreditAmountsCount);
  if (lineItem.pretax_credit_amounts && lineItem.pretax_credit_amounts.length > 0) {
    const pretaxCredits = lineItem.pretax_credit_amounts.map(credit => {
      const parts = [`Amount: ${credit.amount}`, `Type: ${credit.type}`];
      if (credit.credit_balance_transaction) parts.push(`Transaction: ${credit.credit_balance_transaction}`);
      if (credit.discount) parts.push(`Discount: ${credit.discount}`);
      return parts.join(', ');
    }).join(' | ');
    properties["Pretax Credit Amounts"] = createRichTextProperty(pretaxCredits);
  } else {
    properties["Pretax Credit Amounts"] = createRichTextProperty("");
  }

  return properties;
}