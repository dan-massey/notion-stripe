import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  numberProperty,
  richTextProperty,
  selectProperty,
  checkboxProperty,
  emailProperty,
  phoneProperty,
  urlProperty,
  createAddressFields,
  createCommonFields,
  statusOptions,
  paymentMethodTypeOptions,
  cardBrandOptions,
  cardFundingOptions
} from "./utils";

export const getChargeSchema = (customerDatabaseId: string, paymentIntentDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Charge ID": titleProperty(),
  "Link": urlProperty(),
  "Customer": relationProperty(customerDatabaseId),
  "Amount": numberProperty(),
  "Amount Captured": numberProperty(),
  "Amount Refunded": numberProperty(),
  "Currency": richTextProperty(),
  "Status": selectProperty(statusOptions.charge),
  "Paid": checkboxProperty(),
  "Captured": checkboxProperty(),
  "Refunded": checkboxProperty(),
  "Disputed": checkboxProperty(),
  "Payment Intent": relationProperty(paymentIntentDatabaseId),
  "Payment Method": richTextProperty(),
  "Payment Method Type": selectProperty(paymentMethodTypeOptions),
  "Card Brand": selectProperty(cardBrandOptions),
  "Card Last4": richTextProperty(),
  "Card Funding": selectProperty(cardFundingOptions),
  "Card Country": richTextProperty(),
  "Card Exp Month": numberProperty(),
  "Card Exp Year": numberProperty(),
  "Billing Name": richTextProperty(),
  "Billing Email": emailProperty(),
  "Billing Phone": phoneProperty(),
  ...createAddressFields("Billing"),
  "Outcome Type": selectProperty([
    {name: "authorized", color: "green" as const},
    {name: "manual_review", color: "yellow" as const},
    {name: "issuer_declined", color: "red" as const},
    {name: "blocked", color: "red" as const},
    {name: "invalid", color: "red" as const}
  ]),
  "Outcome Reason": richTextProperty(),
  "Risk Level": selectProperty([
    {name: "normal", color: "green" as const},
    {name: "elevated", color: "yellow" as const},
    {name: "highest", color: "red" as const},
    {name: "not_assessed", color: "gray" as const},
    {name: "unknown", color: "gray" as const}
  ]),
  "Risk Score": numberProperty(),
  "Fraud Stripe Report": selectProperty([
    {name: "fraudulent", color: "red" as const}
  ]),
  "Fraud User Report": selectProperty([
    {name: "safe", color: "green" as const},
    {name: "fraudulent", color: "red" as const}
  ]),
  "Failure Code": richTextProperty(),
  "Failure Message": richTextProperty(),
  "Receipt Email": emailProperty(),
  "Receipt URL": urlProperty(),
  "Statement Descriptor": richTextProperty(),
  "Balance Transaction": richTextProperty(),
  "Application": richTextProperty(),
  "Application Fee Amount": numberProperty(),
  "Shipping Name": richTextProperty(),
  "Shipping Phone": phoneProperty(),
  ...createAddressFields("Shipping"),
  "Shipping Carrier": richTextProperty(),
  "Tracking Number": richTextProperty(),
  "Transfer": richTextProperty(),
  "Transfer Group": richTextProperty(),
  "On Behalf Of": richTextProperty(),
  "Source Transfer": richTextProperty(),
  "Review": richTextProperty(),
  "Refund Count": numberProperty(),
  ...createCommonFields()
})