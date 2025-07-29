import type Stripe from "stripe";

export function stripeInvoiceLineItemToNotionProperties(
  lineItem: Stripe.InvoiceLineItem, 
  invoiceNotionPageId: string | null,
  priceNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Line Item ID": {
      title: [
        {
          type: "text",
          text: {
            content: lineItem.id,
          },
        },
      ],
    },
    "Type": {
      select: null,
    },
    "Amount": {
      number: lineItem.amount || 0,
    },
    "Amount Excluding Tax": {
      number: null,
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: lineItem.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Description": {
      rich_text: [
        {
          type: "text",
          text: {
            content: lineItem.description || "",
          },
        },
      ],
    },
    "Discountable": {
      checkbox: lineItem.discountable || false,
    },
    "Live Mode": {
      checkbox: lineItem.livemode || false,
    },
    "Proration": {
      checkbox: false,
    },
    "Quantity": {
      number: lineItem.quantity || null,
    },
    "Subscription": {
      rich_text: [
        {
          type: "text",
          text: {
            content: typeof lineItem.subscription === "string" 
              ? lineItem.subscription 
              : lineItem.subscription?.id || "",
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
    "Unit Amount Excluding Tax": {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    },
    "Invoice Item": {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    },
    "Period Start": {
      date: lineItem.period?.start ? {
        start: new Date(lineItem.period.start * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Period End": {
      date: lineItem.period?.end ? {
        start: new Date(lineItem.period.end * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(lineItem.metadata || {}),
          },
        },
      ],
    },
  };

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

  // Handle proration details (not available on InvoiceLineItem type)
  properties["Proration Details Credited Items Count"] = {
    number: 0,
  };

  properties["Proration Details"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: "",
        },
      },
    ],
  };

  // Handle tax amounts (not available on InvoiceLineItem type)
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

  // Handle tax rates (not available on InvoiceLineItem type)
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

  // Handle discount amounts (not available on InvoiceLineItem type)
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

  // Handle discounts (not available on InvoiceLineItem type)
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

  return properties;
}