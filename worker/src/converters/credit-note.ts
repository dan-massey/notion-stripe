import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createUrlProperty,
  createRelationProperty,
  stringFromObject,
} from "@/converters/notion-properties";

export function stripeCreditNoteToNotionProperties(
  creditNote: Stripe.CreditNote, 
  customerNotionPageId: string | null, 
  invoiceNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Credit Note ID": createTitleProperty(creditNote.id),
    "Number": createRichTextProperty(creditNote.number),
    "Status": createSelectProperty(creditNote.status),
    "Amount": createNumberProperty(creditNote.amount || 0),
    "Amount Shipping": createNumberProperty(creditNote.amount_shipping || 0),
    "Currency": createRichTextProperty(creditNote.currency?.toUpperCase()),
    "Memo": createRichTextProperty(creditNote.memo),
    "PDF": createUrlProperty(creditNote.pdf),
    "Reason": createSelectProperty(creditNote.reason),
    "Pre Payment Amount": createNumberProperty(creditNote.pre_payment_amount || 0),
    "Post Payment Amount": createNumberProperty(creditNote.post_payment_amount || 0),
    "Type": createSelectProperty(creditNote.type),
    "Voided At": createDateProperty(creditNote.voided_at),
    "Created Date": createDateProperty(creditNote.created),
    "Effective At": createDateProperty(creditNote.effective_at),
    "Customer Balance Transaction": createRichTextProperty(stringFromObject(creditNote.customer_balance_transaction)),
    "Discount Amount": createNumberProperty(creditNote.discount_amount || 0),
    "Out of Band Amount": createNumberProperty(creditNote.out_of_band_amount),
    "Live Mode": createCheckboxProperty(creditNote.livemode),
    "Subtotal": createNumberProperty(creditNote.subtotal || 0),
    "Subtotal Excluding Tax": createNumberProperty(creditNote.subtotal_excluding_tax),
    "Total": createNumberProperty(creditNote.total || 0),
    "Total Excluding Tax": createNumberProperty(creditNote.total_excluding_tax),
    "Metadata": createRichTextProperty(JSON.stringify(creditNote.metadata || {})),
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = createRelationProperty(customerNotionPageId);
  }

  // Add invoice relation if we have the Notion page ID
  if (invoiceNotionPageId) {
    properties["Invoice"] = createRelationProperty(invoiceNotionPageId);
  }

  // Handle discount amounts
  if (creditNote.discount_amounts && creditNote.discount_amounts.length > 0) {
    properties["Discount Amounts Count"] = createNumberProperty(creditNote.discount_amounts.length);

    const discountAmountsText = creditNote.discount_amounts
      .map((discountAmount: Stripe.CreditNote.DiscountAmount) => {
        const discountInfo = typeof discountAmount.discount === "string" 
          ? discountAmount.discount 
          : discountAmount.discount?.id || "Unknown";
        return `${discountInfo}: ${discountAmount.amount}`;
      })
      .join(", ");

    properties["Discount Amounts"] = createRichTextProperty(discountAmountsText);
  } else {
    properties["Discount Amounts Count"] = createNumberProperty(0);

    properties["Discount Amounts"] = createRichTextProperty("");
  }

  // Handle lines
  if (creditNote.lines && creditNote.lines.data && creditNote.lines.data.length > 0) {
    properties["Lines Count"] = createNumberProperty(creditNote.lines.data.length);
  } else {
    properties["Lines Count"] = createNumberProperty(0);
  }

  // Handle tax amounts (using total_taxes field instead of tax_amounts)
  if (creditNote.total_taxes && creditNote.total_taxes.length > 0) {
    properties["Tax Amounts Count"] = createNumberProperty(creditNote.total_taxes.length);

    const taxAmountsText = creditNote.total_taxes
      .map((taxAmount: Stripe.CreditNote.TotalTax) => {
        return `${taxAmount.amount} (${taxAmount.tax_behavior})`;
      })
      .join(", ");

    properties["Tax Amounts"] = createRichTextProperty(taxAmountsText);
  } else {
    properties["Tax Amounts Count"] = createNumberProperty(0);

    properties["Tax Amounts"] = createRichTextProperty("");
  }

  // Handle refunds
  if (creditNote.refunds && creditNote.refunds.length > 0) {
    properties["Refunds Count"] = createNumberProperty(creditNote.refunds.length);
  } else {
    properties["Refunds Count"] = createNumberProperty(0);
  }

  // Handle shipping cost
  if (creditNote.shipping_cost) {
    properties["Shipping Cost Amount Subtotal"] = createNumberProperty(creditNote.shipping_cost.amount_subtotal || 0);

    properties["Shipping Cost Amount Tax"] = createNumberProperty(creditNote.shipping_cost.amount_tax || 0);

    properties["Shipping Cost Amount Total"] = createNumberProperty(creditNote.shipping_cost.amount_total || 0);

    properties["Shipping Rate"] = createRichTextProperty(stringFromObject(creditNote.shipping_cost.shipping_rate));
  } else {
    properties["Shipping Cost Amount Subtotal"] = createNumberProperty(0);

    properties["Shipping Cost Amount Tax"] = createNumberProperty(0);

    properties["Shipping Cost Amount Total"] = createNumberProperty(0);

    properties["Shipping Rate"] = createRichTextProperty("");
  }

  return properties;
}