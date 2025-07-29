import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";

export const getPaymentIntentSchema = (
  customerDatabaseId: string
): CreateDatabaseParameters["properties"] => ({
  "Payment Intent ID": {
    type: "title" as const,
    title: {},
  },
  Customer: {
    type: "relation" as const,
    relation: {
      database_id: customerDatabaseId,
      type: "dual_property" as const,
      dual_property: {},
    },
  },
  Amount: {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Amount Capturable": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Amount Received": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  Currency: {
    type: "rich_text" as const,
    rich_text: {},
  },
  Status: {
    type: "select" as const,
    select: {
      options: [
        { name: "requires_payment_method", color: "yellow" as const },
        { name: "requires_confirmation", color: "yellow" as const },
        { name: "requires_action", color: "orange" as const },
        { name: "processing", color: "blue" as const },
        { name: "requires_capture", color: "purple" as const },
        { name: "canceled", color: "red" as const },
        { name: "succeeded", color: "green" as const },
      ],
    },
  },
  "Capture Method": {
    type: "select" as const,
    select: {
      options: [
        { name: "automatic", color: "blue" as const },
        { name: "automatic_async", color: "blue" as const },
        { name: "manual", color: "orange" as const },
      ],
    },
  },
  "Confirmation Method": {
    type: "select" as const,
    select: {
      options: [
        { name: "automatic", color: "blue" as const },
        { name: "manual", color: "orange" as const },
      ],
    },
  },
  "Created Date": {
    type: "date" as const,
    date: {},
  },
  "Canceled At": {
    type: "date" as const,
    date: {},
  },
  "Cancellation Reason": {
    type: "select" as const,
    select: {
      options: [
        { name: "abandoned", color: "gray" as const },
        { name: "automatic", color: "blue" as const },
        { name: "duplicate", color: "orange" as const },
        { name: "expired", color: "red" as const },
        { name: "failed_invoice", color: "red" as const },
        { name: "fraudulent", color: "red" as const },
        { name: "requested_by_customer", color: "yellow" as const },
        { name: "void_invoice", color: "gray" as const },
      ],
    },
  },
  Description: {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Application Fee Amount": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Live Mode": {
    type: "checkbox" as const,
    checkbox: {},
  },
  "Payment Method": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Payment Method Types": {
    type: "multi_select" as const,
    multi_select: {
      options: [
        { name: "card", color: "blue" as const },
        { name: "card_present", color: "blue" as const },
        { name: "acss_debit", color: "green" as const },
        { name: "affirm", color: "purple" as const },
        { name: "afterpay_clearpay", color: "pink" as const },
        { name: "alipay", color: "blue" as const },
        { name: "amazon_pay", color: "orange" as const },
        { name: "au_becs_debit", color: "green" as const },
        { name: "bacs_debit", color: "green" as const },
        { name: "bancontact", color: "blue" as const },
        { name: "blik", color: "red" as const },
        { name: "boleto", color: "yellow" as const },
        { name: "cashapp", color: "green" as const },
        { name: "customer_balance", color: "gray" as const },
        { name: "eps", color: "red" as const },
        { name: "fpx", color: "blue" as const },
        { name: "giropay", color: "blue" as const },
        { name: "grabpay", color: "green" as const },
        { name: "ideal", color: "orange" as const },
        { name: "klarna", color: "pink" as const },
        { name: "konbini", color: "blue" as const },
        { name: "link", color: "blue" as const },
        { name: "oxxo", color: "red" as const },
        { name: "p24", color: "red" as const },
        { name: "paynow", color: "blue" as const },
        { name: "paypal", color: "blue" as const },
        { name: "pix", color: "green" as const },
        { name: "promptpay", color: "blue" as const },
        { name: "sepa_debit", color: "blue" as const },
        { name: "sofort", color: "orange" as const },
        { name: "us_bank_account", color: "blue" as const },
        { name: "wechat_pay", color: "green" as const },
      ],
    },
  },
  "Setup Future Usage": {
    type: "select" as const,
    select: {
      options: [
        { name: "off_session", color: "blue" as const },
        { name: "on_session", color: "green" as const },
      ],
    },
  },
  "Receipt Email": {
    type: "email" as const,
    email: {},
  },
  "Statement Descriptor": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Statement Descriptor Suffix": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "On Behalf Of": {
    type: "rich_text" as const,
    rich_text: {},
  },
  Application: {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Transfer Group": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Transfer Destination": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Transfer Amount": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Client Secret": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Next Action Type": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Last Payment Error Message": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Last Payment Error Code": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Last Payment Error Type": {
    type: "select" as const,
    select: {
      options: [
        { name: "api_error", color: "red" as const },
        { name: "card_error", color: "orange" as const },
        { name: "idempotency_error", color: "yellow" as const },
        { name: "invalid_request_error", color: "purple" as const },
      ],
    },
  },
  "Automatic Payment Methods Enabled": {
    type: "checkbox" as const,
    checkbox: {},
  },
  "Automatic Payment Methods Allow Redirects": {
    type: "select" as const,
    select: {
      options: [
        { name: "always", color: "green" as const },
        { name: "never", color: "red" as const },
      ],
    },
  },
  "Shipping Name": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Phone": {
    type: "phone_number" as const,
    phone_number: {},
  },
  "Shipping Address Line 1": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Address Line 2": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Address City": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Address State": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Address Country": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Address Postal Code": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Carrier": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Shipping Tracking Number": {
    type: "rich_text" as const,
    rich_text: {},
  },
  Review: {
    type: "rich_text" as const,
    rich_text: {},
  },
  Metadata: {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Last Updated": {
    type: "last_edited_time" as const,
    last_edited_time: {},
  },
  "Record Created": {
    type: "created_time" as const,
    created_time: {},
  },
});