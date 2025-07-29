import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createEmailProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createRelationProperty,
} from "@/utils/notion-properties";

export function stripeDisputeToNotionProperties(
  dispute: Stripe.Dispute,
  chargeNotionPageId: string | null,
  paymentIntentNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Dispute ID": createTitleProperty(dispute.id),
    Amount: createNumberProperty(dispute.amount),
    Currency: createRichTextProperty(dispute.currency?.toUpperCase()),
    Status: createSelectProperty(dispute.status),
    Reason: createSelectProperty(dispute.reason),
    "Created Date": createDateProperty(dispute.created),
    "Live Mode": createCheckboxProperty(dispute.livemode),
    "Is Charge Refundable": createCheckboxProperty(dispute.is_charge_refundable),
  };

  // Add charge relation if we have the Notion page ID
  if (chargeNotionPageId) {
    properties["Charge"] = createRelationProperty(chargeNotionPageId);
  }

  // Add Payment Intent relation if we have the Notion page ID
  if (paymentIntentNotionPageId) {
    properties["Payment Intent"] = createRelationProperty(paymentIntentNotionPageId);
  }

  properties["Metadata"] = createRichTextProperty(JSON.stringify(dispute.metadata || {}));

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
    properties["Payment Method Type"] = createSelectProperty(dispute.payment_method_details.type);

    // Card-specific details
    if (dispute.payment_method_details.card) {
      const card = dispute.payment_method_details.card;

      properties["Card Brand"] = createSelectProperty(card.brand);

      properties["Card Case Type"] = createSelectProperty(card.case_type);

      properties["Network Reason Code"] = createRichTextProperty(card.network_reason_code);
    }
  }

  // Evidence details
  if (dispute.evidence_details) {
    properties["Evidence Due By"] = createDateProperty(dispute.evidence_details.due_by);

    properties["Evidence Has Evidence"] = createCheckboxProperty(dispute.evidence_details.has_evidence);

    properties["Evidence Past Due"] = createCheckboxProperty(dispute.evidence_details.past_due);

    properties["Evidence Submission Count"] = createNumberProperty(dispute.evidence_details.submission_count || 0);
  }

  // Evidence fields
  if (dispute.evidence) {
    properties["Evidence Customer Name"] = createRichTextProperty(dispute.evidence.customer_name);

    properties["Evidence Customer Email"] = createEmailProperty(dispute.evidence.customer_email_address);

    properties["Evidence Customer Purchase IP"] = createRichTextProperty(dispute.evidence.customer_purchase_ip);

    properties["Evidence Billing Address"] = createRichTextProperty(dispute.evidence.billing_address);

    properties["Evidence Product Description"] = createRichTextProperty(dispute.evidence.product_description);

    properties["Evidence Service Date"] = createRichTextProperty(dispute.evidence.service_date);

    properties["Evidence Shipping Address"] = createRichTextProperty(dispute.evidence.shipping_address);

    properties["Evidence Shipping Carrier"] = createRichTextProperty(dispute.evidence.shipping_carrier);

    properties["Evidence Shipping Date"] = createRichTextProperty(dispute.evidence.shipping_date);

    properties["Evidence Shipping Tracking Number"] = createRichTextProperty(dispute.evidence.shipping_tracking_number);

    properties["Evidence Duplicate Charge ID"] = createRichTextProperty(dispute.evidence.duplicate_charge_id);

    properties["Evidence Duplicate Charge Explanation"] = createRichTextProperty(dispute.evidence.duplicate_charge_explanation);

    properties["Evidence Refund Policy Disclosure"] = createRichTextProperty(dispute.evidence.refund_policy_disclosure);

    properties["Evidence Refund Refusal Explanation"] = createRichTextProperty(dispute.evidence.refund_refusal_explanation);

    properties["Evidence Cancellation Policy Disclosure"] = createRichTextProperty(dispute.evidence.cancellation_policy_disclosure);

    properties["Evidence Cancellation Rebuttal"] = createRichTextProperty(dispute.evidence.cancellation_rebuttal);

    properties["Evidence Access Activity Log"] = createRichTextProperty(dispute.evidence.access_activity_log);

    properties["Evidence Uncategorized Text"] = createRichTextProperty(dispute.evidence.uncategorized_text);
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

  properties["Balance Transactions Count"] = createNumberProperty(balanceTransactionsCount);

  properties["Balance Transactions Net"] = createNumberProperty(totalNet);

  properties["Balance Transactions Fee"] = createNumberProperty(totalFee);

  // Set default values for schema fields not covered above
  if (!properties["Payment Method Type"]) {
    properties["Payment Method Type"] = createSelectProperty(null);
  }

  if (!properties["Card Brand"]) {
    properties["Card Brand"] = createSelectProperty(null);
  }

  if (!properties["Card Case Type"]) {
    properties["Card Case Type"] = createSelectProperty(null);
  }

  if (!properties["Network Reason Code"]) {
    properties["Network Reason Code"] = createRichTextProperty("");
  }

  if (!properties["Evidence Due By"]) {
    properties["Evidence Due By"] = createDateProperty(null);
  }

  if (!properties["Evidence Has Evidence"]) {
    properties["Evidence Has Evidence"] = createCheckboxProperty(false);
  }

  if (!properties["Evidence Past Due"]) {
    properties["Evidence Past Due"] = createCheckboxProperty(false);
  }

  if (!properties["Evidence Submission Count"]) {
    properties["Evidence Submission Count"] = createNumberProperty(0);
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
      properties[field] = createRichTextProperty("");
    }
  });

  if (!properties["Evidence Customer Email"]) {
    properties["Evidence Customer Email"] = createEmailProperty(null);
  }

  return properties;
}
