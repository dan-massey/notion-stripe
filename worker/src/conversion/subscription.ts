import type Stripe from "stripe";

export function stripeSubscriptionToNotionProperties(
  subscription: Stripe.Subscription, 
  customerNotionPageId?: string,
  latestInvoiceNotionPageId?: string
) {
  const properties: Record<string, any> = {
    "Subscription ID": {
      title: [
        {
          type: "text",
          text: {
            content: subscription.id,
          },
        },
      ],
    },
    "Status": {
      select: subscription.status ? { name: subscription.status } : null,
    },
    "Collection Method": {
      select: subscription.collection_method ? { name: subscription.collection_method } : null,
    },
    "Currency": {
      rich_text: [
        {
          type: "text",
          text: {
            content: subscription.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    "Created Date": {
      date: {
        start: new Date(subscription.created * 1000).toISOString().split('T')[0],
      },
    },
    "Start Date": {
      date: subscription.start_date ? {
        start: new Date(subscription.start_date * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Current Period Start": {
      date: subscription.items?.data?.[0]?.current_period_start ? {
        start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Current Period End": {
      date: subscription.items?.data?.[0]?.current_period_end ? {
        start: new Date(subscription.items.data[0].current_period_end * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Trial Start": {
      date: subscription.trial_start ? {
        start: new Date(subscription.trial_start * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Trial End": {
      date: subscription.trial_end ? {
        start: new Date(subscription.trial_end * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Billing Cycle Anchor": {
      date: subscription.billing_cycle_anchor ? {
        start: new Date(subscription.billing_cycle_anchor * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Cancel At": {
      date: subscription.cancel_at ? {
        start: new Date(subscription.cancel_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Canceled At": {
      date: subscription.canceled_at ? {
        start: new Date(subscription.canceled_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Ended At": {
      date: subscription.ended_at ? {
        start: new Date(subscription.ended_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Cancel At Period End": {
      checkbox: subscription.cancel_at_period_end || false,
    },
    "Live Mode": {
      checkbox: subscription.livemode || false,
    },
    "Billing Mode": {
      select: subscription.billing_thresholds ? { name: "flexible" } : { name: "classic" },
    },
    "Application Fee Percent": {
      number: subscription.application_fee_percent || null,
    },
    "Days Until Due": {
      number: subscription.days_until_due || null,
    },
    "Description": {
      rich_text: [
        {
          type: "text",
          text: {
            content: subscription.description || "",
          },
        },
      ],
    },
    "Automatic Tax Enabled": {
      checkbox: !!subscription.automatic_tax?.enabled,
    },
    "Automatic Tax Disabled Reason": {
      select: subscription.automatic_tax?.disabled_reason ? 
        { name: subscription.automatic_tax.disabled_reason } : null,
    },
    "Billing Threshold Amount": {
      number: subscription.billing_thresholds?.amount_gte || null,
    },
    "Reset Billing Cycle Anchor": {
      checkbox: subscription.billing_thresholds?.reset_billing_cycle_anchor || false,
    },
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = {
      relation: [{ id: customerNotionPageId }],
    };
  }

  // Add latest invoice relation if we have the Notion page ID
  if (latestInvoiceNotionPageId) {
    properties["Latest Invoice"] = {
      relation: [{ id: latestInvoiceNotionPageId }],
    };
  }

  // Enhanced default payment method with expanded details
  let defaultPaymentMethodText = "";
  if (subscription.default_payment_method) {
    if (typeof subscription.default_payment_method === "string") {
      defaultPaymentMethodText = subscription.default_payment_method;
    } else {
      // Expanded payment method object
      const pm = subscription.default_payment_method;
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
  if (subscription.default_source) {
    if (typeof subscription.default_source === "string") {
      defaultSourceText = subscription.default_source;
    } else {
      // Expanded source object
      const source = subscription.default_source;
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

  // Cancellation details
  if (subscription.cancellation_details) {
    properties["Cancellation Reason"] = {
      select: subscription.cancellation_details.reason ? 
        { name: subscription.cancellation_details.reason } : null,
    };
    properties["Cancellation Feedback"] = {
      select: subscription.cancellation_details.feedback ? 
        { name: subscription.cancellation_details.feedback } : null,
    };
    properties["Cancellation Comment"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: subscription.cancellation_details.comment || "",
          },
        },
      ],
    };
  }

  // Trial settings
  if (subscription.trial_settings) {
    properties["Trial End Behavior"] = {
      select: subscription.trial_settings.end_behavior?.missing_payment_method ? 
        { name: subscription.trial_settings.end_behavior.missing_payment_method } : null,
    };
  }

  // Pause collection
  if (subscription.pause_collection) {
    properties["Pause Collection Behavior"] = {
      select: subscription.pause_collection.behavior ? 
        { name: subscription.pause_collection.behavior } : null,
    };
    properties["Pause Resumes At"] = {
      date: subscription.pause_collection.resumes_at ? {
        start: new Date(subscription.pause_collection.resumes_at * 1000).toISOString().split('T')[0],
      } : null,
    };
  }

  // Pending invoice item interval
  if (subscription.pending_invoice_item_interval) {
    properties["Pending Invoice Item Interval"] = {
      select: { name: subscription.pending_invoice_item_interval.interval },
    };
    properties["Pending Invoice Item Interval Count"] = {
      number: subscription.pending_invoice_item_interval.interval_count || 1,
    };
  }

  // Next pending invoice item invoice
  properties["Next Pending Invoice Item Invoice"] = {
    date: subscription.next_pending_invoice_item_invoice ? {
      start: new Date(subscription.next_pending_invoice_item_invoice * 1000).toISOString().split('T')[0],
    } : null,
  };

  // Payment settings
  if (subscription.payment_settings) {
    properties["Save Default Payment Method"] = {
      select: subscription.payment_settings.save_default_payment_method ? 
        { name: subscription.payment_settings.save_default_payment_method } : null,
    };
  }

  // Application and on behalf of
  properties["Application"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: subscription.application ? 
            (typeof subscription.application === "string" ? subscription.application : subscription.application.id) : "",
        },
      },
    ],
  };

  properties["On Behalf Of"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: subscription.on_behalf_of || "",
        },
      },
    ],
  };

  // Schedule
  properties["Schedule"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: subscription.schedule ? 
            (typeof subscription.schedule === "string" ? subscription.schedule : subscription.schedule.id) : "",
        },
      },
    ],
  };

  // Pending setup intent
  properties["Pending Setup Intent"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: subscription.pending_setup_intent ? 
            (typeof subscription.pending_setup_intent === "string" ? subscription.pending_setup_intent : subscription.pending_setup_intent.id) : "",
        },
      },
    ],
  };

  // Transfer data
  if (subscription.transfer_data) {
    properties["Transfer Destination"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: subscription.transfer_data.destination || "",
          },
        },
      ],
    };
    properties["Transfer Amount Percent"] = {
      number: subscription.transfer_data.amount_percent || null,
    };
  }

  // Pending update
  if (subscription.pending_update) {
    properties["Pending Update Expires At"] = {
      date: subscription.pending_update.expires_at ? {
        start: new Date(subscription.pending_update.expires_at * 1000).toISOString().split('T')[0],
      } : null,
    };
    properties["Has Pending Update"] = {
      checkbox: true,
    };
  } else {
    properties["Has Pending Update"] = {
      checkbox: false,
    };
  }

  // Subscription items count and details
  const itemsCount = subscription.items?.data?.length || 0;
  properties["Subscription Items Count"] = {
    number: itemsCount,
  };

  // Primary item details (first item if available)
  if (subscription.items?.data && subscription.items.data.length > 0) {
    const primaryItem = subscription.items.data[0];
    const price = primaryItem.price;
    
    properties["Primary Price ID"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: price.id || "",
          },
        },
      ],
    };

    properties["Primary Product ID"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: typeof price.product === "string" ? price.product : price.product?.id || "",
          },
        },
      ],
    };

    properties["Primary Price Amount"] = {
      number: price.unit_amount || 0,
    };

    if (price.recurring) {
      properties["Primary Price Interval"] = {
        select: { name: price.recurring.interval },
      };
      properties["Primary Price Interval Count"] = {
        number: price.recurring.interval_count || 1,
      };
    }

    properties["Primary Quantity"] = {
      number: primaryItem.quantity || 1,
    };
  }

  // Calculate tax rate percentage from default_tax_rates if available
  let taxRatePercentage = 0;
  if (subscription.default_tax_rates && subscription.default_tax_rates.length > 0) {
    // Take the first tax rate as primary
    const primaryTaxRate = subscription.default_tax_rates[0];
    taxRatePercentage = primaryTaxRate.percentage || 0;
  }

  properties["Tax Rate Percentage"] = {
    number: taxRatePercentage,
  };

  // Test clock
  properties["Test Clock"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: subscription.test_clock ? 
            (typeof subscription.test_clock === "string" ? subscription.test_clock : subscription.test_clock.id) : "",
        },
      },
    ],
  };

  // Metadata
  properties["Metadata"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: JSON.stringify(subscription.metadata || {}),
        },
      },
    ],
  };

  return properties;
}