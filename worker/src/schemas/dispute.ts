import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  numberProperty,
  richTextProperty,
  selectProperty,
  multiSelectProperty,
  dateProperty,
  checkboxProperty,
  emailProperty,
  createMetadataFields,
  cardBrandOptions
} from "./utils";

export const getDisputeSchema = (chargeDatabaseId: string, paymentIntentDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Dispute ID": titleProperty(),
  "Charge": relationProperty(chargeDatabaseId),
  "Amount": numberProperty(),
  "Currency": richTextProperty(),
  "Status": selectProperty([
    {name: "warning_needs_response", color: "yellow" as const},
    {name: "warning_under_review", color: "yellow" as const},
    {name: "warning_closed", color: "gray" as const},
    {name: "needs_response", color: "orange" as const},
    {name: "under_review", color: "blue" as const},
    {name: "won", color: "green" as const},
    {name: "lost", color: "red" as const}
  ]),
  "Reason": selectProperty([
    {name: "bank_cannot_process", color: "red" as const},
    {name: "check_returned", color: "red" as const},
    {name: "credit_not_processed", color: "orange" as const},
    {name: "customer_initiated", color: "blue" as const},
    {name: "debit_not_authorized", color: "red" as const},
    {name: "duplicate", color: "purple" as const},
    {name: "fraudulent", color: "red" as const},
    {name: "general", color: "gray" as const},
    {name: "incorrect_account_details", color: "orange" as const},
    {name: "insufficient_funds", color: "red" as const},
    {name: "noncompliant", color: "red" as const},
    {name: "product_not_received", color: "orange" as const},
    {name: "product_unacceptable", color: "orange" as const},
    {name: "subscription_canceled", color: "blue" as const},
    {name: "unrecognized", color: "purple" as const}
  ]),
  "Created Date": dateProperty(),
  "Live Mode": checkboxProperty(),
  "Is Charge Refundable": checkboxProperty(),
  "Payment Intent": relationProperty(paymentIntentDatabaseId),
  "Payment Method Type": selectProperty([
    {name: "card", color: "blue" as const},
    {name: "amazon_pay", color: "orange" as const},
    {name: "klarna", color: "purple" as const},
    {name: "paypal", color: "blue" as const}
  ]),
  "Card Brand": selectProperty([
    ...cardBrandOptions,
    {name: "cartes_bancaires", color: "blue" as const},
    {name: "eftpos_au", color: "green" as const},
    {name: "link", color: "purple" as const},
    {name: "unknown", color: "gray" as const}
  ]),
  "Card Case Type": selectProperty([
    {name: "chargeback", color: "red" as const},
    {name: "compliance", color: "orange" as const},
    {name: "inquiry", color: "yellow" as const}
  ]),
  "Network Reason Code": richTextProperty(),
  "Enhanced Eligibility Types": multiSelectProperty([
    {name: "visa_compelling_evidence_3", color: "blue" as const},
    {name: "visa_compliance", color: "purple" as const}
  ]),
  "Evidence Due By": dateProperty(),
  "Evidence Has Evidence": checkboxProperty(),
  "Evidence Past Due": checkboxProperty(),
  "Evidence Submission Count": numberProperty(),
  "Evidence Customer Name": richTextProperty(),
  "Evidence Customer Email": emailProperty(),
  "Evidence Customer Purchase IP": richTextProperty(),
  "Evidence Billing Address": richTextProperty(),
  "Evidence Product Description": richTextProperty(),
  "Evidence Service Date": richTextProperty(),
  "Evidence Shipping Address": richTextProperty(),
  "Evidence Shipping Carrier": richTextProperty(),
  "Evidence Shipping Date": richTextProperty(),
  "Evidence Shipping Tracking Number": richTextProperty(),
  "Evidence Duplicate Charge ID": richTextProperty(),
  "Evidence Duplicate Charge Explanation": richTextProperty(),
  "Evidence Refund Policy Disclosure": richTextProperty(),
  "Evidence Refund Refusal Explanation": richTextProperty(),
  "Evidence Cancellation Policy Disclosure": richTextProperty(),
  "Evidence Cancellation Rebuttal": richTextProperty(),
  "Evidence Access Activity Log": richTextProperty(),
  "Evidence Uncategorized Text": richTextProperty(),
  "Balance Transactions Count": numberProperty(),
  "Balance Transactions Net": numberProperty(),
  "Balance Transactions Fee": numberProperty(),
  ...createMetadataFields()
})