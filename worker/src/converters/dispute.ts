import type Stripe from "stripe";

export function stripeDisputeToNotionProperties(
  dispute: Stripe.Dispute,
  chargeNotionPageId: string | null,
  paymentIntentNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Dispute ID": {
      title: [
        {
          type: "text",
          text: {
            content: dispute.id,
          },
        },
      ],
    },
    Amount: {
      number: dispute.amount,
    },
    Currency: {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.currency?.toUpperCase() || "",
          },
        },
      ],
    },
    Status: {
      select: dispute.status ? { name: dispute.status } : null,
    },
    Reason: {
      select: dispute.reason ? { name: dispute.reason } : null,
    },
    "Created Date": {
      date: {
        start: new Date(dispute.created * 1000).toISOString().split("T")[0],
      },
    },
    "Live Mode": {
      checkbox: dispute.livemode || false,
    },
    "Is Charge Refundable": {
      checkbox: dispute.is_charge_refundable || false,
    },
  };

  // Add charge relation if we have the Notion page ID
  if (chargeNotionPageId) {
    properties["Charge"] = {
      relation: [{ id: chargeNotionPageId }],
    };
  }

  // Add Payment Intent relation if we have the Notion page ID
  if (paymentIntentNotionPageId) {
    properties["Payment Intent"] = {
      relation: [{ id: paymentIntentNotionPageId }],
    };
  }

  properties["Metadata"] = {
    rich_text: [
      {
        type: "text",
        text: {
          content: JSON.stringify(dispute.metadata || {}),
        },
      },
    ],
  };

  // Enhanced eligibility types
  if (
    dispute.enhanced_eligibility_types &&
    dispute.enhanced_eligibility_types.length > 0
  ) {
    properties["Enhanced Eligibility Types"] = {
      multi_select: dispute.enhanced_eligibility_types.map((type) => ({
        name: type,
      })),
    };
  } else {
    properties["Enhanced Eligibility Types"] = {
      multi_select: [],
    };
  }

  // Payment method details
  if (dispute.payment_method_details) {
    properties["Payment Method Type"] = {
      select: dispute.payment_method_details.type
        ? { name: dispute.payment_method_details.type }
        : null,
    };

    // Card-specific details
    if (dispute.payment_method_details.card) {
      const card = dispute.payment_method_details.card;

      properties["Card Brand"] = {
        select: card.brand ? { name: card.brand } : null,
      };

      properties["Card Case Type"] = {
        select: card.case_type ? { name: card.case_type } : null,
      };

      properties["Network Reason Code"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: card.network_reason_code || "",
            },
          },
        ],
      };
    }
  }

  // Evidence details
  if (dispute.evidence_details) {
    properties["Evidence Due By"] = {
      date: dispute.evidence_details.due_by
        ? {
            start: new Date(dispute.evidence_details.due_by * 1000)
              .toISOString()
              .split("T")[0],
          }
        : null,
    };

    properties["Evidence Has Evidence"] = {
      checkbox: dispute.evidence_details.has_evidence || false,
    };

    properties["Evidence Past Due"] = {
      checkbox: dispute.evidence_details.past_due || false,
    };

    properties["Evidence Submission Count"] = {
      number: dispute.evidence_details.submission_count || 0,
    };
  }

  // Evidence fields
  if (dispute.evidence) {
    properties["Evidence Customer Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.customer_name || "",
          },
        },
      ],
    };

    properties["Evidence Customer Email"] = {
      email: dispute.evidence.customer_email_address || null,
    };

    properties["Evidence Customer Purchase IP"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.customer_purchase_ip || "",
          },
        },
      ],
    };

    properties["Evidence Billing Address"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.billing_address || "",
          },
        },
      ],
    };

    properties["Evidence Product Description"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.product_description || "",
          },
        },
      ],
    };

    properties["Evidence Service Date"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.service_date || "",
          },
        },
      ],
    };

    properties["Evidence Shipping Address"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.shipping_address || "",
          },
        },
      ],
    };

    properties["Evidence Shipping Carrier"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.shipping_carrier || "",
          },
        },
      ],
    };

    properties["Evidence Shipping Date"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.shipping_date || "",
          },
        },
      ],
    };

    properties["Evidence Shipping Tracking Number"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.shipping_tracking_number || "",
          },
        },
      ],
    };

    properties["Evidence Duplicate Charge ID"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.duplicate_charge_id || "",
          },
        },
      ],
    };

    properties["Evidence Duplicate Charge Explanation"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.duplicate_charge_explanation || "",
          },
        },
      ],
    };

    properties["Evidence Refund Policy Disclosure"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.refund_policy_disclosure || "",
          },
        },
      ],
    };

    properties["Evidence Refund Refusal Explanation"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.refund_refusal_explanation || "",
          },
        },
      ],
    };

    properties["Evidence Cancellation Policy Disclosure"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.cancellation_policy_disclosure || "",
          },
        },
      ],
    };

    properties["Evidence Cancellation Rebuttal"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.cancellation_rebuttal || "",
          },
        },
      ],
    };

    properties["Evidence Access Activity Log"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.access_activity_log || "",
          },
        },
      ],
    };

    properties["Evidence Uncategorized Text"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: dispute.evidence.uncategorized_text || "",
          },
        },
      ],
    };
  }

  // Balance transactions summary
  let balanceTransactionsCount = 0;
  let totalNet = 0;
  let totalFee = 0;

  if (dispute.balance_transactions && dispute.balance_transactions.length > 0) {
    balanceTransactionsCount = dispute.balance_transactions.length;

    dispute.balance_transactions.forEach((transaction) => {
      totalNet += transaction.net || 0;
      totalFee += transaction.fee || 0;
    });
  }

  properties["Balance Transactions Count"] = {
    number: balanceTransactionsCount,
  };

  properties["Balance Transactions Net"] = {
    number: totalNet,
  };

  properties["Balance Transactions Fee"] = {
    number: totalFee,
  };

  // Set default values for schema fields not covered above
  if (!properties["Payment Method Type"]) {
    properties["Payment Method Type"] = {
      select: null,
    };
  }

  if (!properties["Card Brand"]) {
    properties["Card Brand"] = {
      select: null,
    };
  }

  if (!properties["Card Case Type"]) {
    properties["Card Case Type"] = {
      select: null,
    };
  }

  if (!properties["Network Reason Code"]) {
    properties["Network Reason Code"] = {
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

  if (!properties["Evidence Due By"]) {
    properties["Evidence Due By"] = {
      date: null,
    };
  }

  if (!properties["Evidence Has Evidence"]) {
    properties["Evidence Has Evidence"] = {
      checkbox: false,
    };
  }

  if (!properties["Evidence Past Due"]) {
    properties["Evidence Past Due"] = {
      checkbox: false,
    };
  }

  if (!properties["Evidence Submission Count"]) {
    properties["Evidence Submission Count"] = {
      number: 0,
    };
  }

  // Set default empty values for evidence fields if not set above
  const evidenceFields = [
    "Evidence Customer Name",
    "Evidence Customer Purchase IP",
    "Evidence Billing Address",
    "Evidence Product Description",
    "Evidence Service Date",
    "Evidence Shipping Address",
    "Evidence Shipping Carrier",
    "Evidence Shipping Date",
    "Evidence Shipping Tracking Number",
    "Evidence Duplicate Charge ID",
    "Evidence Duplicate Charge Explanation",
    "Evidence Refund Policy Disclosure",
    "Evidence Refund Refusal Explanation",
    "Evidence Cancellation Policy Disclosure",
    "Evidence Cancellation Rebuttal",
    "Evidence Access Activity Log",
    "Evidence Uncategorized Text",
  ];

  evidenceFields.forEach((field) => {
    if (!properties[field]) {
      properties[field] = {
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
  });

  if (!properties["Evidence Customer Email"]) {
    properties["Evidence Customer Email"] = {
      email: null,
    };
  }

  return properties;
}
