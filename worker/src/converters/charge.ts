import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createEmailProperty,
  createUrlProperty,
  createDateProperty,
  createNumberProperty,
  createSelectProperty,
  stringFromObject,
  createPhoneProperty,
  createRelationProperty,
} from "@/utils/notion-properties";

export function stripeChargeToNotionProperties(
  charge: Stripe.Charge,
  customerNotionPageId: string | null,
  paymentIntentNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Charge ID": createTitleProperty(charge.id),
    Amount: createNumberProperty(charge.amount),
    "Amount Captured": createNumberProperty(charge.amount_captured),
    "Amount Refunded": createNumberProperty(charge.amount_refunded),
    Currency: createRichTextProperty(charge.currency?.toUpperCase() || ""),
    Status: createSelectProperty(charge.status ? charge.status : null),
    Paid: createCheckboxProperty(charge.paid || false),
    Captured: createCheckboxProperty(charge.captured || false),
    Refunded: createCheckboxProperty(charge.refunded || false),
    Disputed: createCheckboxProperty(charge.disputed || false),
    "Live Mode": createCheckboxProperty(charge.livemode || false),
    "Created Date": createDateProperty(charge.created),
    Description: createRichTextProperty(charge.description || ""),
    "Receipt Email": createEmailProperty(charge.receipt_email),
    "Receipt URL": createUrlProperty(charge.receipt_url),
    "Statement Descriptor": createRichTextProperty(charge.statement_descriptor),
    "Balance Transaction": createRichTextProperty(
      stringFromObject(charge.balance_transaction)
    ),
    Application: createRichTextProperty(stringFromObject(charge.application)),
    "Application Fee Amount": createNumberProperty(
      charge.application_fee_amount
    ),
    Transfer: createRichTextProperty(stringFromObject(charge.transfer)),
    "Transfer Group": createRichTextProperty(charge.transfer_group),
    "On Behalf Of": createRichTextProperty(
      stringFromObject(charge.on_behalf_of)
    ),
    "Source Transfer": createRichTextProperty(
      stringFromObject(charge.source_transfer)
    ),
    Review: createRichTextProperty(stringFromObject(charge.review)),
    "Refund Count": createNumberProperty(charge.refunds?.data?.length),
    Metadata: createRichTextProperty(JSON.stringify(charge.metadata || {})),
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = createRelationProperty(customerNotionPageId);
  }

  // Add Payment Intent relation if we have the Notion page ID
  if (paymentIntentNotionPageId) {
    properties["Payment Intent"] = createRelationProperty(
      paymentIntentNotionPageId
    );
  }

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
      paymentMethodText += `: ${
        paypal.payer_email || paypal.payer_id || "PayPal"
      }`;
    } else if (charge.payment_method_details.cashapp) {
      const cashapp = charge.payment_method_details.cashapp;
      paymentMethodText += `: ${cashapp.cashtag || "Cash App"}`;
    }
  }

  properties["Payment Method"] = createRichTextProperty(paymentMethodText);
  properties["Payment Method Type"] = createSelectProperty(paymentMethodType);
  properties["Card Brand"] = createSelectProperty(cardBrand);
  properties["Card Last4"] = createRichTextProperty(cardLast4);
  properties["Card Funding"] = createSelectProperty(cardFunding);
  properties["Card Country"] = createRichTextProperty(cardCountry);
  properties["Card Exp Month"] = createNumberProperty(cardExpMonth);
  properties["Card Exp Year"] = createNumberProperty(cardExpYear);

  // Billing details
  if (charge.billing_details) {
    const billing = charge.billing_details;
    properties["Billing Name"] = createRichTextProperty(billing.name);
    properties["Billing Email"] = createEmailProperty(billing.email);
    properties["Billing Phone"] = createPhoneProperty(billing.phone);

    if (billing.address) {
      properties["Billing Address Line 1"] = createRichTextProperty(
        billing.address.line1
      );
      properties["Billing Address Line 2"] = createRichTextProperty(
        billing.address.line2
      );
      properties["Billing City"] = createRichTextProperty(billing.address.city);
      properties["Billing State"] = createRichTextProperty(
        billing.address.state
      );
      properties["Billing Postal Code"] = createRichTextProperty(
        billing.address.postal_code
      );
      properties["Billing Country"] = createRichTextProperty(
        billing.address.country
      );
    }
  }

  // Outcome details
  if (charge.outcome) {
    properties["Outcome Type"] = createSelectProperty(charge.outcome.type);
    properties["Outcome Reason"] = createRichTextProperty(charge.outcome.reason);
    properties["Risk Level"] = createSelectProperty(charge.outcome.risk_level);
    properties["Risk Score"] = createNumberProperty(charge.outcome.risk_score);
  }

  // Fraud details
  if (charge.fraud_details) {
    properties["Fraud Stripe Report"] = createSelectProperty(charge.fraud_details.stripe_report);
    properties["Fraud User Report"] = createSelectProperty(charge.fraud_details.user_report);
  }

  // Failure details
  properties["Failure Code"] = createRichTextProperty(charge.failure_code);
  properties["Failure Message"] = createRichTextProperty(charge.failure_message);

  // Shipping details
  if (charge.shipping) {
    properties["Shipping Name"] = createRichTextProperty(charge.shipping.name);
    properties["Shipping Phone"] = createPhoneProperty(charge.shipping.phone);
    properties["Shipping Carrier"] = createRichTextProperty(charge.shipping.carrier);
    properties["Tracking Number"] = createRichTextProperty(charge.shipping.tracking_number);

    if (charge.shipping.address) {
      properties["Shipping Address Line 1"] = createRichTextProperty(charge.shipping.address.line1);
      properties["Shipping Address Line 2"] = createRichTextProperty(charge.shipping.address.line2);
      properties["Shipping City"] = createRichTextProperty(charge.shipping.address.city);
      properties["Shipping State"] = createRichTextProperty(charge.shipping.address.state);
      properties["Shipping Postal Code"] = createRichTextProperty(charge.shipping.address.postal_code);
      properties["Shipping Country"] = createRichTextProperty(charge.shipping.address.country);
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
        if (card.three_d_secure?.result)
          summary += ` 3DS:${card.three_d_secure.result}`;
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
        if (paypal.seller_protection?.status)
          summary += ` [Protection: ${paypal.seller_protection.status}]`;
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
