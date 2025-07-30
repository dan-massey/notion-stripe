import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
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
  phoneProperty,
  createAddressFields,
  createMetadataFields
} from "./utils";

export const getPaymentIntentSchema = (
  customerDatabaseId: string
): CreateDatabaseParameters["properties"] => ({
  "Payment Intent ID": titleProperty(),
  "Customer": relationProperty(customerDatabaseId),
  "Amount": numberProperty(),
  "Amount Capturable": numberProperty(),
  "Amount Received": numberProperty(),
  "Currency": richTextProperty(),
  "Status": selectProperty([
    {name: "requires_payment_method", color: "yellow" as const},
    {name: "requires_confirmation", color: "yellow" as const},
    {name: "requires_action", color: "orange" as const},
    {name: "processing", color: "blue" as const},
    {name: "requires_capture", color: "purple" as const},
    {name: "canceled", color: "red" as const},
    {name: "succeeded", color: "green" as const}
  ]),
  "Capture Method": selectProperty([
    {name: "automatic", color: "blue" as const},
    {name: "automatic_async", color: "blue" as const},
    {name: "manual", color: "orange" as const}
  ]),
  "Confirmation Method": selectProperty([
    {name: "automatic", color: "blue" as const},
    {name: "manual", color: "orange" as const}
  ]),
  "Created Date": dateProperty(),
  "Canceled At": dateProperty(),
  "Cancellation Reason": selectProperty([
    {name: "abandoned", color: "gray" as const},
    {name: "automatic", color: "blue" as const},
    {name: "duplicate", color: "orange" as const},
    {name: "expired", color: "red" as const},
    {name: "failed_invoice", color: "red" as const},
    {name: "fraudulent", color: "red" as const},
    {name: "requested_by_customer", color: "yellow" as const},
    {name: "void_invoice", color: "gray" as const}
  ]),
  "Description": richTextProperty(),
  "Application Fee Amount": numberProperty(),
  "Live Mode": checkboxProperty(),
  "Payment Method": richTextProperty(),
  "Payment Method Types": multiSelectProperty([
    {name: "card", color: "blue" as const},
    {name: "card_present", color: "blue" as const},
    {name: "acss_debit", color: "green" as const},
    {name: "affirm", color: "purple" as const},
    {name: "afterpay_clearpay", color: "pink" as const},
    {name: "alipay", color: "blue" as const},
    {name: "amazon_pay", color: "orange" as const},
    {name: "au_becs_debit", color: "green" as const},
    {name: "bacs_debit", color: "green" as const},
    {name: "bancontact", color: "blue" as const},
    {name: "blik", color: "red" as const},
    {name: "boleto", color: "yellow" as const},
    {name: "cashapp", color: "green" as const},
    {name: "customer_balance", color: "gray" as const},
    {name: "eps", color: "red" as const},
    {name: "fpx", color: "blue" as const},
    {name: "giropay", color: "blue" as const},
    {name: "grabpay", color: "green" as const},
    {name: "ideal", color: "orange" as const},
    {name: "klarna", color: "pink" as const},
    {name: "konbini", color: "blue" as const},
    {name: "link", color: "blue" as const},
    {name: "oxxo", color: "red" as const},
    {name: "p24", color: "red" as const},
    {name: "paynow", color: "blue" as const},
    {name: "paypal", color: "blue" as const},
    {name: "pix", color: "green" as const},
    {name: "promptpay", color: "blue" as const},
    {name: "sepa_debit", color: "blue" as const},
    {name: "sofort", color: "orange" as const},
    {name: "us_bank_account", color: "blue" as const},
    {name: "wechat_pay", color: "green" as const}
  ]),
  "Setup Future Usage": selectProperty([
    {name: "off_session", color: "blue" as const},
    {name: "on_session", color: "green" as const}
  ]),
  "Receipt Email": emailProperty(),
  "Statement Descriptor": richTextProperty(),
  "Statement Descriptor Suffix": richTextProperty(),
  "On Behalf Of": richTextProperty(),
  "Application": richTextProperty(),
  "Transfer Group": richTextProperty(),
  "Transfer Destination": richTextProperty(),
  "Transfer Amount": numberProperty(),
  "Client Secret": richTextProperty(),
  "Next Action Type": richTextProperty(),
  "Last Payment Error Message": richTextProperty(),
  "Last Payment Error Code": richTextProperty(),
  "Last Payment Error Type": selectProperty([
    {name: "api_error", color: "red" as const},
    {name: "card_error", color: "orange" as const},
    {name: "idempotency_error", color: "yellow" as const},
    {name: "invalid_request_error", color: "purple" as const}
  ]),
  "Automatic Payment Methods Enabled": checkboxProperty(),
  "Automatic Payment Methods Allow Redirects": selectProperty([
    {name: "always", color: "green" as const},
    {name: "never", color: "red" as const}
  ]),
  "Shipping Name": richTextProperty(),
  "Shipping Phone": phoneProperty(),
  "Shipping Address Line 1": richTextProperty(),
  "Shipping Address Line 2": richTextProperty(),
  "Shipping Address City": richTextProperty(),
  "Shipping Address State": richTextProperty(),
  "Shipping Address Country": richTextProperty(),
  "Shipping Address Postal Code": richTextProperty(),
  "Shipping Carrier": richTextProperty(),
  "Shipping Tracking Number": richTextProperty(),
  "Review": richTextProperty(),
  ...createMetadataFields()
});