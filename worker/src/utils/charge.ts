import type Stripe from "stripe";

export function stripeChargeToNotionProperties(charge: Stripe.Charge, customerNotionPageId?: string) {
  const properties: Record<string, any> = {
    "Charge ID": {
      title: [
        {
          type: "text",
          text: {
            content: charge.id,
          },
        },
      ],
    },
    "Amount": {
      number: charge.amount,
    },
    "Amount Captured": {
      number: charge.amount_captured,
    },
    "Amount Refunded": {
      number: charge.amount_refunded,
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Status": {
      select: charge.status ? { name: charge.status } : null,
    },
    "Paid": {
      checkbox: charge.paid || false,
    },
    "Captured": {
      checkbox: charge.captured || false,
    },
    "Refunded": {
      checkbox: charge.refunded || false,
    },
    "Disputed": {
      checkbox: charge.disputed || false,
    },
    "Live Mode": {
      checkbox: charge.livemode || false,
    },
    "Created Date": {
      date: {
        start: new Date(charge.created * 1000).toISOString().split('T')[0],
      },
    },
    "Description": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.description || "",
          },
        },
      ],
    },
    "Receipt Email": {
      email: charge.receipt_email || null,
    },
    "Receipt URL": {
      url: charge.receipt_url || null,
    },
    "Statement Descriptor": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.statement_descriptor || "",
          },
        },
      ],
    },
    "Balance Transaction": {
      rich_text: [
        {
          type: "text",
          text: {
            content: typeof charge.balance_transaction === "string" 
              ? charge.balance_transaction 
              : charge.balance_transaction?.id || "",
          },
        },
      ],
    },
    "Application": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.application || "",
          },
        },
      ],
    },
    "Application Fee Amount": {
      number: charge.application_fee_amount || null,
    },
    "Transfer": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.transfer || "",
          },
        },
      ],
    },
    "Transfer Group": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.transfer_group || "",
          },
        },
      ],
    },
    "On Behalf Of": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.on_behalf_of || "",
          },
        },
      ],
    },
    "Source Transfer": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.source_transfer || "",
          },
        },
      ],
    },
    "Review": {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.review || "",
          },
        },
      ],
    },
    "Refund Count": {
      number: charge.refunds?.data?.length || 0,
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(charge.metadata || {}),
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

  // Enhanced Payment Intent with expanded details
  let paymentIntentText = "";
  if (charge.payment_intent) {
    if (typeof charge.payment_intent === "string") {
      paymentIntentText = charge.payment_intent;
    } else {
      // Expanded payment intent object
      const pi = charge.payment_intent;
      paymentIntentText = `${pi.id} (${pi.status})`;
      if (pi.client_secret) {
        paymentIntentText += ` - ${pi.client_secret.slice(-10)}`;
      }
    }
  }

  properties["Payment Intent"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: paymentIntentText,
        },
      },
    ],
  };

  // Enhanced Payment Method with comprehensive details
  let paymentMethodText = "";
  let paymentMethodType = "";
  let cardBrand = "";
  let cardLast4 = "";
  let cardFunding = "";
  let cardCountry = "";
  let cardExpMonth: number | null = null;
  let cardExpYear: number | null = null;

  if (charge.payment_method) {
    if (typeof charge.payment_method === "string") {
      paymentMethodText = charge.payment_method;
    } else {
      // Expanded payment method object
      const pm = charge.payment_method as any; // Type assertion to handle expanded object
      paymentMethodType = pm.type || "";
      paymentMethodText = `${pm.type}: ${pm.id}`;
      
      if (pm.card) {
        cardBrand = pm.card.brand || "";
        cardLast4 = pm.card.last4 || "";
        cardFunding = pm.card.funding || "";
        cardCountry = pm.card.country || "";
        cardExpMonth = pm.card.exp_month || null;
        cardExpYear = pm.card.exp_year || null;
        paymentMethodText += ` (${pm.card.brand} ****${pm.card.last4})`;
      }
    }
  }

  // Use payment_method_details if payment_method isn't expanded
  if (charge.payment_method_details && !paymentMethodText) {
    paymentMethodType = charge.payment_method_details.type;
    paymentMethodText = `${charge.payment_method_details.type}`;
    
    if (charge.payment_method_details.card) {
      const card = charge.payment_method_details.card;
      cardBrand = card.brand || "";
      cardLast4 = card.last4 || "";
      cardFunding = card.funding || "";
      cardCountry = card.country || "";
      cardExpMonth = card.exp_month;
      cardExpYear = card.exp_year;
      paymentMethodText += `: ${card.brand} ****${card.last4}`;
      
      if (card.wallet) {
        paymentMethodText += ` (${card.wallet.type})`;
      }
      if (card.funding) {
        paymentMethodText += ` [${card.funding}]`;
      }
    } else if (charge.payment_method_details.us_bank_account) {
      const bank = charge.payment_method_details.us_bank_account;
      paymentMethodText += `: ${bank.bank_name} ****${bank.last4}`;
      if (bank.account_type) {
        paymentMethodText += ` [${bank.account_type}]`;
      }
    } else if (charge.payment_method_details.sepa_debit) {
      const sepa = charge.payment_method_details.sepa_debit;
      paymentMethodText += `: ****${sepa.last4}`;
      if (sepa.country) {
        paymentMethodText += ` [${sepa.country}]`;
      }
    } else if (charge.payment_method_details.paypal) {
      const paypal = charge.payment_method_details.paypal;
      paymentMethodText += `: ${paypal.payer_email || paypal.payer_id || "PayPal"}`;
    } else if (charge.payment_method_details.cashapp) {
      const cashapp = charge.payment_method_details.cashapp;
      paymentMethodText += `: ${cashapp.cashtag || "Cash App"}`;
    }
  }

  properties["Payment Method"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: paymentMethodText,
        },
      },
    ],
  };

  properties["Payment Method Type"] = {
    select: paymentMethodType ? { name: paymentMethodType } : null,
  };

  properties["Card Brand"] = {
    select: cardBrand ? { name: cardBrand } : null,
  };

  properties["Card Last4"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: cardLast4,
        },
      },
    ],
  };

  properties["Card Funding"] = {
    select: cardFunding ? { name: cardFunding } : null,
  };

  properties["Card Country"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: cardCountry,
        },
      },
    ],
  };

  properties["Card Exp Month"] = {
    number: cardExpMonth,
  };

  properties["Card Exp Year"] = {
    number: cardExpYear,
  };

  // Billing details
  if (charge.billing_details) {
    const billing = charge.billing_details;
    properties["Billing Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: billing.name || "",
          },
        },
      ],
    };

    properties["Billing Email"] = {
      email: billing.email || null,
    };

    properties["Billing Phone"] = {
      phone_number: billing.phone || null,
    };

    if (billing.address) {
      properties["Billing Address Line 1"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: billing.address.line1 || "",
            },
          },
        ],
      };

      properties["Billing Address Line 2"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: billing.address.line2 || "",
            },
          },
        ],
      };

      properties["Billing City"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: billing.address.city || "",
            },
          },
        ],
      };

      properties["Billing State"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: billing.address.state || "",
            },
          },
        ],
      };

      properties["Billing Postal Code"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: billing.address.postal_code || "",
            },
          },
        ],
      };

      properties["Billing Country"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: billing.address.country || "",
            },
          },
        ],
      };
    }
  }

  // Outcome details
  if (charge.outcome) {
    properties["Outcome Type"] = {
      select: charge.outcome.type ? { name: charge.outcome.type } : null,
    };

    properties["Outcome Reason"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.outcome.reason || "",
          },
        },
      ],
    };

    properties["Risk Level"] = {
      select: charge.outcome.risk_level ? { name: charge.outcome.risk_level } : null,
    };

    properties["Risk Score"] = {
      number: charge.outcome.risk_score || null,
    };
  }

  // Fraud details
  if (charge.fraud_details) {
    properties["Fraud Stripe Report"] = {
      select: charge.fraud_details.stripe_report ? { name: charge.fraud_details.stripe_report } : null,
    };

    properties["Fraud User Report"] = {
      select: charge.fraud_details.user_report ? { name: charge.fraud_details.user_report } : null,
    };
  }

  // Failure details
  properties["Failure Code"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: charge.failure_code || "",
        },
      },
    ],
  };

  properties["Failure Message"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: charge.failure_message || "",
        },
      },
    ],
  };

  // Shipping details
  if (charge.shipping) {
    properties["Shipping Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.shipping.name || "",
          },
        },
      ],
    };

    properties["Shipping Phone"] = {
      phone_number: charge.shipping.phone || null,
    };

    properties["Shipping Carrier"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.shipping.carrier || "",
          },
        },
      ],
    };

    properties["Tracking Number"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: charge.shipping.tracking_number || "",
          },
        },
      ],
    };

    if (charge.shipping.address) {
      properties["Shipping Address Line 1"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: charge.shipping.address.line1 || "",
            },
          },
        ],
      };

      properties["Shipping Address Line 2"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: charge.shipping.address.line2 || "",
            },
          },
        ],
      };

      properties["Shipping City"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: charge.shipping.address.city || "",
            },
          },
        ],
      };

      properties["Shipping State"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: charge.shipping.address.state || "",
            },
          },
        ],
      };

      properties["Shipping Postal Code"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: charge.shipping.address.postal_code || "",
            },
          },
        ],
      };

      properties["Shipping Country"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: charge.shipping.address.country || "",
            },
          },
        ],
      };
    }
  }

  return properties;
}

export function generatePaymentMethodSummary(charge: Stripe.Charge): string {
  if (!charge.payment_method_details) {
    return "";
  }

  const type = charge.payment_method_details.type;
  let summary = `${type.toUpperCase()}: `;

  switch (type) {
    case "card":
      const card = charge.payment_method_details.card;
      if (card) {
        summary += `${card.brand?.toUpperCase()} ****${card.last4}`;
        if (card.funding) summary += ` (${card.funding})`;
        if (card.country) summary += ` [${card.country}]`;
        if (card.wallet) summary += ` via ${card.wallet.type}`;
        if (card.three_d_secure?.result) summary += ` 3DS:${card.three_d_secure.result}`;
      }
      break;

    case "us_bank_account":
      const bank = charge.payment_method_details.us_bank_account;
      if (bank) {
        summary += `${bank.bank_name} ****${bank.last4}`;
        if (bank.account_type) summary += ` (${bank.account_type})`;
      }
      break;

    case "paypal":
      const paypal = charge.payment_method_details.paypal;
      if (paypal) {
        summary += paypal.payer_email || paypal.payer_id || "PayPal Account";
        if (paypal.seller_protection?.status) summary += ` [Protection: ${paypal.seller_protection.status}]`;
      }
      break;

    case "cashapp":
      const cashapp = charge.payment_method_details.cashapp;
      if (cashapp) {
        summary += cashapp.cashtag || "Cash App Account";
      }
      break;

    case "sepa_debit":
      const sepa = charge.payment_method_details.sepa_debit;
      if (sepa) {
        summary += `****${sepa.last4}`;
        if (sepa.country) summary += ` [${sepa.country}]`;
      }
      break;

    default:
      summary += "Payment Method";
      break;
  }

  return summary;
}