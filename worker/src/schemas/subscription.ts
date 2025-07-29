import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";

export const getSubscriptionSchema = (
  customerDatabaseId: string,
  invoiceDatabaseId: string,
  priceDatabaseId: string,
  productDatabaseId: string
): CreateDatabaseParameters["properties"] => ({
  "Subscription ID": {
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
  "Latest Invoice": {
    type: "relation" as const,
    relation: {
      database_id: invoiceDatabaseId,
      type: "dual_property" as const,
      dual_property: {},
    },
  },
  Status: {
    type: "select" as const,
    select: {
      options: [
        { name: "incomplete", color: "red" as const },
        { name: "incomplete_expired", color: "red" as const },
        { name: "trialing", color: "yellow" as const },
        { name: "active", color: "green" as const },
        { name: "past_due", color: "orange" as const },
        { name: "canceled", color: "red" as const },
        { name: "unpaid", color: "red" as const },
        { name: "paused", color: "gray" as const },
      ],
    },
  },
  "Collection Method": {
    type: "select" as const,
    select: {
      options: [
        { name: "charge_automatically", color: "blue" as const },
        { name: "send_invoice", color: "purple" as const },
      ],
    },
  },
  Currency: {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Created Date": {
    type: "date" as const,
    date: {},
  },
  "Start Date": {
    type: "date" as const,
    date: {},
  },
  "Current Period Start": {
    type: "date" as const,
    date: {},
  },
  "Current Period End": {
    type: "date" as const,
    date: {},
  },
  "Trial Start": {
    type: "date" as const,
    date: {},
  },
  "Trial End": {
    type: "date" as const,
    date: {},
  },
  "Billing Cycle Anchor": {
    type: "date" as const,
    date: {},
  },
  "Cancel At": {
    type: "date" as const,
    date: {},
  },
  "Canceled At": {
    type: "date" as const,
    date: {},
  },
  "Ended At": {
    type: "date" as const,
    date: {},
  },
  "Cancel At Period End": {
    type: "checkbox" as const,
    checkbox: {},
  },
  "Live Mode": {
    type: "checkbox" as const,
    checkbox: {},
  },
  "Billing Mode": {
    type: "select" as const,
    select: {
      options: [
        { name: "classic", color: "gray" as const },
        { name: "flexible", color: "blue" as const },
      ],
    },
  },
  "Application Fee Percent": {
    type: "number" as const,
    number: {
      format: "percent" as const,
    },
  },
  "Days Until Due": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Default Payment Method": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Default Source": {
    type: "rich_text" as const,
    rich_text: {},
  },
  Description: {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Automatic Tax Enabled": {
    type: "checkbox" as const,
    checkbox: {},
  },
  "Automatic Tax Disabled Reason": {
    type: "select" as const,
    select: {
      options: [{ name: "requires_location_inputs", color: "yellow" as const }],
    },
  },
  "Billing Threshold Amount": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Reset Billing Cycle Anchor": {
    type: "checkbox" as const,
    checkbox: {},
  },
  "Cancellation Reason": {
    type: "select" as const,
    select: {
      options: [
        { name: "cancellation_requested", color: "orange" as const },
        { name: "payment_disputed", color: "red" as const },
        { name: "payment_failed", color: "red" as const },
      ],
    },
  },
  "Cancellation Feedback": {
    type: "select" as const,
    select: {
      options: [
        { name: "customer_service", color: "orange" as const },
        { name: "low_quality", color: "red" as const },
        { name: "missing_features", color: "yellow" as const },
        { name: "other", color: "gray" as const },
        { name: "switched_service", color: "blue" as const },
        { name: "too_complex", color: "purple" as const },
        { name: "too_expensive", color: "red" as const },
        { name: "unused", color: "gray" as const },
      ],
    },
  },
  "Cancellation Comment": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Trial End Behavior": {
    type: "select" as const,
    select: {
      options: [
        { name: "cancel", color: "red" as const },
        { name: "create_invoice", color: "blue" as const },
        { name: "pause", color: "yellow" as const },
      ],
    },
  },
  "Pause Collection Behavior": {
    type: "select" as const,
    select: {
      options: [
        { name: "keep_as_draft", color: "yellow" as const },
        { name: "mark_uncollectible", color: "red" as const },
        { name: "void", color: "gray" as const },
      ],
    },
  },
  "Pause Resumes At": {
    type: "date" as const,
    date: {},
  },
  "Pending Invoice Item Interval": {
    type: "select" as const,
    select: {
      options: [
        { name: "day", color: "blue" as const },
        { name: "week", color: "green" as const },
        { name: "month", color: "purple" as const },
        { name: "year", color: "red" as const },
      ],
    },
  },
  "Pending Invoice Item Interval Count": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Next Pending Invoice Item Invoice": {
    type: "date" as const,
    date: {},
  },
  "Save Default Payment Method": {
    type: "select" as const,
    select: {
      options: [
        { name: "off", color: "gray" as const },
        { name: "on_subscription", color: "green" as const },
      ],
    },
  },
  Application: {
    type: "rich_text" as const,
    rich_text: {},
  },
  "On Behalf Of": {
    type: "rich_text" as const,
    rich_text: {},
  },
  Schedule: {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Pending Setup Intent": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Transfer Destination": {
    type: "rich_text" as const,
    rich_text: {},
  },
  "Transfer Amount Percent": {
    type: "number" as const,
    number: {
      format: "percent" as const,
    },
  },
  "Pending Update Expires At": {
    type: "date" as const,
    date: {},
  },
  "Has Pending Update": {
    type: "checkbox" as const,
    checkbox: {},
  },
  "Subscription Items Count": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },

  "Primary Price": {
    type: "relation" as const,
    relation: {
      database_id: priceDatabaseId,
      type: "dual_property" as const,
      dual_property: {},
    },
  },

  "Primary Product": {
    type: "relation" as const,
    relation: {
      database_id: productDatabaseId,
      type: "dual_property" as const,
      dual_property: {},
    },
  },

  "Primary Price Amount": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Primary Price Interval": {
    type: "select" as const,
    select: {
      options: [
        { name: "day", color: "blue" as const },
        { name: "week", color: "green" as const },
        { name: "month", color: "purple" as const },
        { name: "year", color: "red" as const },
      ],
    },
  },
  "Primary Price Interval Count": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Primary Quantity": {
    type: "number" as const,
    number: {
      format: "number" as const,
    },
  },
  "Tax Rate Percentage": {
    type: "number" as const,
    number: {
      format: "percent" as const,
    },
  },
  "Test Clock": {
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
