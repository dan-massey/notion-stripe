import type Stripe from "stripe";

export function stripeCustomerToNotionProperties(customer: Stripe.Customer) {
  const properties: Record<string, any> = {
    "Customer ID": {
      title: [
        {
          type: "text",
          text: {
            content: customer.id,
          },
        },
      ],
    },
    "Name": {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.name || "",
          },
        },
      ],
    },
    "Email": {
      email: customer.email || null,
    },
    "Phone": {
      phone_number: customer.phone || null,
    },
    "Balance": {
      number: customer.balance ? customer.balance / 100 : 0, // Convert from cents to dollars
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Delinquent": {
      checkbox: customer.delinquent || false,
    },
    "Tax Exempt": {
      select: customer.tax_exempt ? { name: customer.tax_exempt } : null,
    },
    "Live Mode": {
      checkbox: customer.livemode || false,
    },
    "Created Date": {
      date: {
        start: new Date(customer.created * 1000).toISOString().split('T')[0],
      },
    },
    "Description": {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.description || "",
          },
        },
      ],
    },
    "Invoice Prefix": {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.invoice_prefix || "",
          },
        },
      ],
    },
    "Next Invoice Sequence": {
      number: customer.next_invoice_sequence || null,
    },
  };

  // Add address fields if available
  if (customer.address) {
    properties["Address Line 1"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.address.line1 || "",
          },
        },
      ],
    };
    properties["Address Line 2"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.address.line2 || "",
          },
        },
      ],
    };
    properties["City"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.address.city || "",
          },
        },
      ],
    };
    properties["State"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.address.state || "",
          },
        },
      ],
    };
    properties["Postal Code"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.address.postal_code || "",
          },
        },
      ],
    };
    properties["Country"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.address.country || "",
          },
        },
      ],
    };
  }

  // Add shipping fields if available
  if (customer.shipping) {
    properties["Shipping Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.shipping.name || "",
          },
        },
      ],
    };
    properties["Shipping Phone"] = {
      phone_number: customer.shipping.phone || null,
    };

    if (customer.shipping.address) {
      properties["Shipping Address Line 1"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: customer.shipping.address.line1 || "",
            },
          },
        ],
      };
      properties["Shipping Address Line 2"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: customer.shipping.address.line2 || "",
            },
          },
        ],
      };
      properties["Shipping City"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: customer.shipping.address.city || "",
            },
          },
        ],
      };
      properties["Shipping State"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: customer.shipping.address.state || "",
            },
          },
        ],
      };
      properties["Shipping Postal Code"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: customer.shipping.address.postal_code || "",
            },
          },
        ],
      };
      properties["Shipping Country"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: customer.shipping.address.country || "",
            },
          },
        ],
      };
    }
  }

  // Add additional fields
  properties["Preferred Locales"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: customer.preferred_locales?.join(", ") || "",
        },
      },
    ],
  };

  // Enhanced default payment method with expanded details
  let defaultPaymentMethodText = "";
  if (customer.invoice_settings?.default_payment_method) {
    if (typeof customer.invoice_settings.default_payment_method === "string") {
      defaultPaymentMethodText = customer.invoice_settings.default_payment_method;
    } else {
      // Expanded payment method object
      const pm = customer.invoice_settings.default_payment_method;
      defaultPaymentMethodText = `${pm.type.toUpperCase()}`;
      if (pm.card) {
        defaultPaymentMethodText += `: ${pm.card.brand?.toUpperCase()} ****${pm.card.last4}`;
        if (pm.card.funding) defaultPaymentMethodText += ` (${pm.card.funding})`;
        if (pm.card.country) defaultPaymentMethodText += ` [${pm.card.country}]`;
      } else if (pm.us_bank_account) {
        defaultPaymentMethodText += `: ${pm.us_bank_account.bank_name} ****${pm.us_bank_account.last4}`;
        if (pm.us_bank_account.account_type) defaultPaymentMethodText += ` (${pm.us_bank_account.account_type})`;
      } else if (pm.sepa_debit) {
        defaultPaymentMethodText += `: ****${pm.sepa_debit.last4}`;
        if (pm.sepa_debit.country) defaultPaymentMethodText += ` [${pm.sepa_debit.country}]`;
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
  if (customer.default_source) {
    if (typeof customer.default_source === "string") {
      defaultSourceText = customer.default_source;
    } else {
      // Expanded source object
      const source = customer.default_source;
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

  properties["Cash Balance Available"] = {
    checkbox: !!customer.cash_balance,
  };

  // Discount information
  properties["Has Active Discount"] = {
    checkbox: !!customer.discount,
  };

  if (customer.discount) {
    properties["Discount Type"] = {
      select: { name: customer.discount.coupon ? "coupon" : "promotion_code" },
    };
  }

  // Tax information
  if (customer.tax) {
    properties["Tax Location Country"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.tax.location?.country || "",
          },
        },
      ],
    };
    properties["Tax Location State"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: customer.tax.location?.state || "",
          },
        },
      ],
    };
    properties["Tax Automatic Status"] = {
      select: customer.tax.automatic_tax && typeof customer.tax.automatic_tax === 'string'
        ? { name: customer.tax.automatic_tax }
        : null,
    };
  }

  // Metadata
  properties["Metadata"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: JSON.stringify(customer.metadata || {}),
        },
      },
    ],
  };

  // Test clock
  properties["Test Clock ID"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: typeof customer.test_clock === "string" 
            ? customer.test_clock 
            : customer.test_clock?.id || "",
        },
      },
    ],
  };

  // Calculate active subscriptions from expanded data
  let activeSubscriptionsCount = 0;
  if (customer.subscriptions && typeof customer.subscriptions === 'object' && 'data' in customer.subscriptions) {
    activeSubscriptionsCount = customer.subscriptions.data.filter(
      sub => sub.status === 'active' || sub.status === 'trialing'
    ).length;
  }

  properties["Active Subscriptions"] = {
    number: activeSubscriptionsCount,
  };

  // Calculate total payment sources from expanded data
  let totalPaymentSourcesCount = 0;
  if (customer.sources && typeof customer.sources === 'object' && 'data' in customer.sources) {
    totalPaymentSourcesCount = customer.sources.data.length;
  }

  properties["Total Payment Sources"] = {
    number: totalPaymentSourcesCount,
  };

  return properties;
}