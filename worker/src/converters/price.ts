import type Stripe from "stripe";

export function stripePriceToNotionProperties(price: Stripe.Price, productNotionPageId: string | null) {
  const properties: Record<string, any> = {
    "Price ID": {
      title: [
        {
          type: "text",
          text: {
            content: price.id,
          },
        },
      ],
    },
    "Active": {
      checkbox: price.active || false,
    },
    "Type": {
      select: price.type ? { name: price.type } : null,
    },
    "Billing Scheme": {
      select: price.billing_scheme ? { name: price.billing_scheme } : null,
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: price.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Unit Amount": {
      number: price.unit_amount || null,
    },
    "Unit Amount Decimal": {
      rich_text: [
        {
          type: "text",
          text: {
            content: price.unit_amount_decimal || "",
          },
        },
      ],
    },
    "Nickname": {
      rich_text: [
        {
          type: "text",
          text: {
            content: price.nickname || "",
          },
        },
      ],
    },
    "Lookup Key": {
      rich_text: [
        {
          type: "text",
          text: {
            content: price.lookup_key || "",
          },
        },
      ],
    },
    "Tax Behavior": {
      select: price.tax_behavior ? { name: price.tax_behavior } : null,
    },
    "Live Mode": {
      checkbox: price.livemode || false,
    },
    "Created Date": {
      date: {
        start: new Date(price.created * 1000).toISOString().split('T')[0],
      },
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(price.metadata || {}),
          },
        },
      ],
    },
  };

  // Add product relation if we have the Notion page ID
  if (productNotionPageId) {
    properties["Product"] = {
      relation: [{ id: productNotionPageId }],
    };
  }

  // Handle recurring details
  if (price.recurring) {
    properties["Recurring Interval"] = {
      select: price.recurring.interval ? { name: price.recurring.interval } : null,
    };

    properties["Recurring Interval Count"] = {
      number: price.recurring.interval_count || 1,
    };

    properties["Recurring Usage Type"] = {
      select: price.recurring.usage_type ? { name: price.recurring.usage_type } : null,
    };

    properties["Recurring Meter"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: price.recurring.meter || "",
          },
        },
      ],
    };
  } else {
    properties["Recurring Interval"] = {
      select: null,
    };

    properties["Recurring Interval Count"] = {
      number: null,
    };

    properties["Recurring Usage Type"] = {
      select: null,
    };

    properties["Recurring Meter"] = {
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

  // Handle custom unit amount
  if (price.custom_unit_amount) {
    properties["Custom Unit Amount Minimum"] = {
      number: price.custom_unit_amount.minimum || null,
    };

    properties["Custom Unit Amount Maximum"] = {
      number: price.custom_unit_amount.maximum || null,
    };

    properties["Custom Unit Amount Preset"] = {
      number: price.custom_unit_amount.preset || null,
    };
  } else {
    properties["Custom Unit Amount Minimum"] = {
      number: null,
    };

    properties["Custom Unit Amount Maximum"] = {
      number: null,
    };

    properties["Custom Unit Amount Preset"] = {
      number: null,
    };
  }

  // Handle tiers
  if (price.tiers && price.tiers.length > 0) {
    properties["Tiers Count"] = {
      number: price.tiers.length,
    };

    properties["Tiers Mode"] = {
      select: price.tiers_mode ? { name: price.tiers_mode } : null,
    };
  } else {
    properties["Tiers Count"] = {
      number: 0,
    };

    properties["Tiers Mode"] = {
      select: null,
    };
  }

  // Handle transform quantity
  if (price.transform_quantity) {
    properties["Transform Quantity Divide By"] = {
      number: price.transform_quantity.divide_by || null,
    };

    properties["Transform Quantity Round"] = {
      select: price.transform_quantity.round ? { name: price.transform_quantity.round } : null,
    };
  } else {
    properties["Transform Quantity Divide By"] = {
      number: null,
    };

    properties["Transform Quantity Round"] = {
      select: null,
    };
  }

  // Handle currency options
  if (price.currency_options && Object.keys(price.currency_options).length > 0) {
    properties["Currency Options Count"] = {
      number: Object.keys(price.currency_options).length,
    };

    // Create a summary of currency options
    const currencyOptionsSummary = Object.entries(price.currency_options)
      .map(([currency, options]) => {
        let summary = currency.toUpperCase();
        if (options.unit_amount) {
          summary += `: ${options.unit_amount}`;
        } else if (options.unit_amount_decimal) {
          summary += `: ${options.unit_amount_decimal}`;
        }
        if (options.tax_behavior) {
          summary += ` (${options.tax_behavior})`;
        }
        return summary;
      })
      .join(", ");

    properties["Currency Options"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: currencyOptionsSummary,
          },
        },
      ],
    };
  } else {
    properties["Currency Options Count"] = {
      number: 0,
    };

    properties["Currency Options"] = {
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