import type Stripe from "stripe";

export function stripeInvoiceItemToNotionProperties(
  invoiceItem: Stripe.InvoiceItem, 
  customerNotionPageId: string | null, 
  invoiceNotionPageId: string | null,
  priceNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Invoice Item ID": {
      title: [
        {
          type: "text",
          text: {
            content: invoiceItem.id,
          },
        },
      ],
    },
    "Amount": {
      number: invoiceItem.amount || 0,
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoiceItem.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Description": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoiceItem.description || "",
          },
        },
      ],
    },
    "Discountable": {
      checkbox: invoiceItem.discountable || false,
    },
    "Period Start": {
      date: invoiceItem.period?.start ? {
        start: new Date(invoiceItem.period.start * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Period End": {
      date: invoiceItem.period?.end ? {
        start: new Date(invoiceItem.period.end * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Proration": {
      checkbox: invoiceItem.proration || false,
    },
    "Quantity": {
      number: invoiceItem.quantity || null,
    },
    "Subscription": {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    },
    "Subscription Item": {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    },
    "Test Clock": {
      rich_text: [
        {
          type: "text",
          text: {
            content: typeof invoiceItem.test_clock === "string" 
              ? invoiceItem.test_clock 
              : invoiceItem.test_clock?.id || "",
          },
        },
      ],
    },
    "Unit Amount": {
      number: null,
    },
    "Unit Amount Decimal": {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    },
    "Live Mode": {
      checkbox: invoiceItem.livemode || false,
    },
    "Created Date": {
      date: {
        start: new Date(invoiceItem.date * 1000).toISOString().split('T')[0],
      },
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(invoiceItem.metadata || {}),
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

  // Add price relation if we have the Notion page ID
  if (priceNotionPageId) {
    properties["Price"] = {
      relation: [{ id: priceNotionPageId }],
    };
  }

  // Handle tax rates
  if (invoiceItem.tax_rates && invoiceItem.tax_rates.length > 0) {
    properties["Tax Rates Count"] = {
      number: invoiceItem.tax_rates.length,
    };

    const taxRatesText = invoiceItem.tax_rates
      .map(rate => {
        const rateInfo = typeof rate === "string" ? rate : rate.id;
        if (typeof rate === "object" && rate.display_name) {
          return `${rate.display_name} (${rateInfo})`;
        }
        return rateInfo;
      })
      .join(", ");

    properties["Tax Rates"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: taxRatesText,
          },
        },
      ],
    };
  } else {
    properties["Tax Rates Count"] = {
      number: 0,
    };

    properties["Tax Rates"] = {
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

  // Handle discounts
  if (invoiceItem.discounts && invoiceItem.discounts.length > 0) {
    properties["Discounts Count"] = {
      number: invoiceItem.discounts.length,
    };

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

    properties["Discounts"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: discountsText,
          },
        },
      ],
    };
  } else {
    properties["Discounts Count"] = {
      number: 0,
    };

    properties["Discounts"] = {
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