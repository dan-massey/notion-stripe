import type Stripe from "stripe";

export function stripeInvoiceToNotionProperties(
  invoice: Stripe.Invoice, 
  customerNotionPageId: string | null,
  primaryChargeNotionPageId: string | null,
  primaryPaymentIntentNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Invoice ID": {
      title: [
        {
          type: "text",
          text: {
            content: invoice.id,
          },
        },
      ],
    },
    "Invoice Number": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.number || "",
          },
        },
      ],
    },
    "Status": {
      select: invoice.status ? { name: invoice.status } : null,
    },
    "Collection Method": {
      select: invoice.collection_method ? { name: invoice.collection_method } : null,
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Total": {
      number: invoice.total,
    },
    "Subtotal": {
      number: invoice.subtotal,
    },
    "Amount Due": {
      number: invoice.amount_due,
    },
    "Amount Paid": {
      number: invoice.amount_paid,
    },
    "Amount Remaining": {
      number: invoice.amount_remaining,
    },
    "Starting Balance": {
      number: invoice.starting_balance,
    },
    "Ending Balance": {
      number: invoice.ending_balance,
    },
    "Amount Overpaid": {
      number: invoice.amount_overpaid || null,
    },
    "Amount Shipping": {
      number: invoice.amount_shipping || null,
    },
    "Created Date": {
      date: {
        start: new Date(invoice.created * 1000).toISOString().split('T')[0],
      },
    },
    "Due Date": {
      date: invoice.due_date ? {
        start: new Date(invoice.due_date * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Period Start": {
      date: invoice.period_start ? {
        start: new Date(invoice.period_start * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Period End": {
      date: invoice.period_end ? {
        start: new Date(invoice.period_end * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Finalized At": {
      date: invoice.status_transitions?.finalized_at ? {
        start: new Date(invoice.status_transitions.finalized_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Paid At": {
      date: invoice.status_transitions?.paid_at ? {
        start: new Date(invoice.status_transitions.paid_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Voided At": {
      date: invoice.status_transitions?.voided_at ? {
        start: new Date(invoice.status_transitions.voided_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Billing Reason": {
      select: invoice.billing_reason ? { name: invoice.billing_reason } : null,
    },
    "Attempted": {
      checkbox: invoice.attempted || false,
    },
    "Attempt Count": {
      number: invoice.attempt_count || 0,
    },
    "Auto Advance": {
      checkbox: invoice.auto_advance || false,
    },
    "Live Mode": {
      checkbox: invoice.livemode || false,
    },
    "Description": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.description || "",
          },
        },
      ],
    },
    "Footer": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.footer || "",
          },
        },
      ],
    },
    "Statement Descriptor": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.statement_descriptor || "",
          },
        },
      ],
    },
    "Hosted Invoice URL": {
      url: invoice.hosted_invoice_url || null,
    },
    "Invoice PDF URL": {
      url: invoice.invoice_pdf || null,
    },
    "Receipt Number": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.receipt_number || "",
          },
        },
      ],
    },
    "Account Country": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.account_country || "",
          },
        },
      ],
    },
    "Account Name": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.account_name || "",
          },
        },
      ],
    },
    "Application": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.application ? 
              (typeof invoice.application === "string" ? invoice.application : invoice.application.id) : "",
          },
        },
      ],
    },
    "On Behalf Of": {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.on_behalf_of || "",
          },
        },
      ],
    },
    "Line Items Count": {
      number: invoice.lines?.data?.length || 0,
    },
    "Payments Count": {
      number: invoice.payments?.data?.length || 0,
    },
    "Next Payment Attempt": {
      date: invoice.next_payment_attempt ? {
        start: new Date(invoice.next_payment_attempt * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Webhooks Delivered At": {
      date: invoice.webhooks_delivered_at ? {
        start: new Date(invoice.webhooks_delivered_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Test Clock": {
      rich_text: [
        {
          type: "text",
          text: {
            content: typeof invoice.test_clock === "string" 
              ? invoice.test_clock 
              : invoice.test_clock?.id || "",
          },
        },
      ],
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(invoice.metadata || {}),
          },
        },
      ],
    },
  };

  // Add customer relation
  if (customerNotionPageId) {
    properties["Customer"] = {
      relation: [{ id: customerNotionPageId }],
    };
  }

  // Add primary charge relation
  if (primaryChargeNotionPageId) {
    properties["Primary Charge"] = {
      relation: [{ id: primaryChargeNotionPageId }],
    };
  }

  // Add primary payment intent relation
  if (primaryPaymentIntentNotionPageId) {
    properties["Primary Payment Intent"] = {
      relation: [{ id: primaryPaymentIntentNotionPageId }],
    };
  }

  // Add customer details from invoice
  if (invoice.customer_address) {
    properties["Customer Address Line 1"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.customer_address.line1 || "",
          },
        },
      ],
    };
    properties["Customer Address Line 2"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.customer_address.line2 || "",
          },
        },
      ],
    };
    properties["Customer City"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.customer_address.city || "",
          },
        },
      ],
    };
    properties["Customer State"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.customer_address.state || "",
          },
        },
      ],
    };
    properties["Customer Postal Code"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.customer_address.postal_code || "",
          },
        },
      ],
    };
    properties["Customer Country"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.customer_address.country || "",
          },
        },
      ],
    };
  }

  properties["Customer Name"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: invoice.customer_name || "",
        },
      },
    ],
  };

  properties["Customer Email"] = {
    email: invoice.customer_email || null,
  };

  properties["Customer Phone"] = {
    phone_number: invoice.customer_phone || null,
  };

  properties["Customer Tax Exempt"] = {
    select: invoice.customer_tax_exempt ? { name: invoice.customer_tax_exempt } : null,
  };

  // Add customer shipping details if available
  if (invoice.customer_shipping) {
    properties["Customer Shipping Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: invoice.customer_shipping.name || "",
          },
        },
      ],
    };
    properties["Customer Shipping Phone"] = {
      phone_number: invoice.customer_shipping.phone || null,
    };

    if (invoice.customer_shipping.address) {
      properties["Customer Shipping Address Line 1"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: invoice.customer_shipping.address.line1 || "",
            },
          },
        ],
      };
      properties["Customer Shipping Address Line 2"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: invoice.customer_shipping.address.line2 || "",
            },
          },
        ],
      };
      properties["Customer Shipping City"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: invoice.customer_shipping.address.city || "",
            },
          },
        ],
      };
      properties["Customer Shipping State"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: invoice.customer_shipping.address.state || "",
            },
          },
        ],
      };
      properties["Customer Shipping Postal Code"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: invoice.customer_shipping.address.postal_code || "",
            },
          },
        ],
      };
      properties["Customer Shipping Country"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: invoice.customer_shipping.address.country || "",
            },
          },
        ],
      };
    }
  }

  // Automatic tax details
  properties["Automatic Tax Enabled"] = {
    checkbox: !!invoice.automatic_tax?.enabled,
  };

  if (invoice.automatic_tax?.status) {
    properties["Automatic Tax Status"] = {
      select: { name: invoice.automatic_tax.status },
    };
  }

  // Enhanced default payment method with expanded details
  let defaultPaymentMethodText = "";
  if (invoice.default_payment_method) {
    if (typeof invoice.default_payment_method === "string") {
      defaultPaymentMethodText = invoice.default_payment_method;
    } else {
      // Expanded payment method object
      const pm = invoice.default_payment_method;
      defaultPaymentMethodText = `${pm.type?.toUpperCase()}`;
      if (pm.card) {
        defaultPaymentMethodText += `: ${pm.card.brand?.toUpperCase()} ****${pm.card.last4}`;
        if (pm.card.funding) defaultPaymentMethodText += ` (${pm.card.funding})`;
        if (pm.card.country) defaultPaymentMethodText += ` [${pm.card.country}]`;
      } else if (pm.us_bank_account) {
        defaultPaymentMethodText += `: ${pm.us_bank_account.bank_name} ****${pm.us_bank_account.last4}`;
        if (pm.us_bank_account.account_type) defaultPaymentMethodText += ` (${pm.us_bank_account.account_type})`;
      }
    }
  }

  properties["Default Payment Method"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: defaultPaymentMethodText,
        },
      },
    ],
  };

  // Enhanced default source with expanded details
  let defaultSourceText = "";
  if (invoice.default_source) {
    if (typeof invoice.default_source === "string") {
      defaultSourceText = invoice.default_source;
    } else {
      // Expanded source object
      const source = invoice.default_source;
      defaultSourceText = `${source.object}: ${source.id}`;
      if (source.object === 'card' && 'last4' in source) {
        defaultSourceText += ` (${source.brand} ending ${source.last4})`;
      }
    }
  }

  properties["Default Source"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: defaultSourceText,
        },
      },
    ],
  };

  return properties;
}