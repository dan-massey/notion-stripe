import type Stripe from "stripe";

export function stripeCreditNoteToNotionProperties(
  creditNote: Stripe.CreditNote, 
  customerNotionPageId: string | null, 
  invoiceNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Credit Note ID": {
      title: [
        {
          type: "text",
          text: {
            content: creditNote.id,
          },
        },
      ],
    },
    "Number": {
      rich_text: [
        {
          type: "text",
          text: {
            content: creditNote.number || "",
          },
        },
      ],
    },
    "Status": {
      select: creditNote.status ? { name: creditNote.status } : null,
    },
    "Amount": {
      number: creditNote.amount || 0,
    },
    "Amount Shipping": {
      number: creditNote.amount_shipping || 0,
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: creditNote.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Memo": {
      rich_text: [
        {
          type: "text",
          text: {
            content: creditNote.memo || "",
          },
        },
      ],
    },
    "PDF": {
      url: creditNote.pdf || null,
    },
    "Reason": {
      select: creditNote.reason ? { name: creditNote.reason } : null,
    },
    "Pre Payment Amount": {
      number: creditNote.pre_payment_amount || 0,
    },
    "Post Payment Amount": {
      number: creditNote.post_payment_amount || 0,
    },
    "Type": {
      select: creditNote.type ? { name: creditNote.type } : null,
    },
    "Voided At": {
      date: creditNote.voided_at ? {
        start: new Date(creditNote.voided_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Created Date": {
      date: {
        start: new Date(creditNote.created * 1000).toISOString().split('T')[0],
      },
    },
    "Effective At": {
      date: creditNote.effective_at ? {
        start: new Date(creditNote.effective_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Customer Balance Transaction": {
      rich_text: [
        {
          type: "text",
          text: {
            content: creditNote.customer_balance_transaction || "",
          },
        },
      ],
    },
    "Discount Amount": {
      number: creditNote.discount_amount || 0,
    },
    "Out of Band Amount": {
      number: creditNote.out_of_band_amount || null,
    },
    "Live Mode": {
      checkbox: creditNote.livemode || false,
    },
    "Subtotal": {
      number: creditNote.subtotal || 0,
    },
    "Subtotal Excluding Tax": {
      number: creditNote.subtotal_excluding_tax || null,
    },
    "Total": {
      number: creditNote.total || 0,
    },
    "Total Excluding Tax": {
      number: creditNote.total_excluding_tax || null,
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(creditNote.metadata || {}),
          },
        },
      ],
    },
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = {
      relation: [{ id: customerNotionPageId }],
    };
  }

  // Add invoice relation if we have the Notion page ID
  if (invoiceNotionPageId) {
    properties["Invoice"] = {
      relation: [{ id: invoiceNotionPageId }],
    };
  }

  // Handle discount amounts
  if (creditNote.discount_amounts && creditNote.discount_amounts.length > 0) {
    properties["Discount Amounts Count"] = {
      number: creditNote.discount_amounts.length,
    };

    const discountAmountsText = creditNote.discount_amounts
      .map((discountAmount: Stripe.CreditNote.DiscountAmount) => {
        const discountInfo = typeof discountAmount.discount === "string" 
          ? discountAmount.discount 
          : discountAmount.discount?.id || "Unknown";
        return `${discountInfo}: ${discountAmount.amount}`;
      })
      .join(", ");

    properties["Discount Amounts"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: discountAmountsText,
          },
        },
      ],
    };
  } else {
    properties["Discount Amounts Count"] = {
      number: 0,
    };

    properties["Discount Amounts"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };
  }

  // Handle lines
  if (creditNote.lines && creditNote.lines.data && creditNote.lines.data.length > 0) {
    properties["Lines Count"] = {
      number: creditNote.lines.data.length,
    };
  } else {
    properties["Lines Count"] = {
      number: 0,
    };
  }

  // Handle tax amounts (using total_taxes field instead of tax_amounts)
  if (creditNote.total_taxes && creditNote.total_taxes.length > 0) {
    properties["Tax Amounts Count"] = {
      number: creditNote.total_taxes.length,
    };

    const taxAmountsText = creditNote.total_taxes
      .map((taxAmount: Stripe.CreditNote.TotalTax) => {
        return `${taxAmount.amount} (${taxAmount.tax_behavior})`;
      })
      .join(", ");

    properties["Tax Amounts"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: taxAmountsText,
          },
        },
      ],
    };
  } else {
    properties["Tax Amounts Count"] = {
      number: 0,
    };

    properties["Tax Amounts"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };
  }

  // Handle refunds
  if (creditNote.refunds && creditNote.refunds.length > 0) {
    properties["Refunds Count"] = {
      number: creditNote.refunds.length,
    };
  } else {
    properties["Refunds Count"] = {
      number: 0,
    };
  }

  // Handle shipping cost
  if (creditNote.shipping_cost) {
    properties["Shipping Cost Amount Subtotal"] = {
      number: creditNote.shipping_cost.amount_subtotal || 0,
    };

    properties["Shipping Cost Amount Tax"] = {
      number: creditNote.shipping_cost.amount_tax || 0,
    };

    properties["Shipping Cost Amount Total"] = {
      number: creditNote.shipping_cost.amount_total || 0,
    };

    properties["Shipping Rate"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: creditNote.shipping_cost.shipping_rate || "",
          },
        },
      ],
    };
  } else {
    properties["Shipping Cost Amount Subtotal"] = {
      number: 0,
    };

    properties["Shipping Cost Amount Tax"] = {
      number: 0,
    };

    properties["Shipping Cost Amount Total"] = {
      number: 0,
    };

    properties["Shipping Rate"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };
  }

  return properties;
}