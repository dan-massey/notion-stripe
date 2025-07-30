import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

type PropertyType = CreateDatabaseParameters["properties"][string];

export const titleProperty = (): PropertyType => ({
  "type": "title" as const,
  "title": {}
});

export const richTextProperty = (): PropertyType => ({
  "type": "rich_text" as const,
  "rich_text": {}
});

export const numberProperty = (format: "number" | "percent" = "number"): PropertyType => ({
  "type": "number" as const,
  "number": {
    "format": format
  }
});

export const checkboxProperty = (): PropertyType => ({
  "type": "checkbox" as const,
  "checkbox": {}
});

export const dateProperty = (): PropertyType => ({
  "type": "date" as const,
  "date": {}
});

export const emailProperty = (): PropertyType => ({
  "type": "email" as const,
  "email": {}
});

export const phoneProperty = (): PropertyType => ({
  "type": "phone_number" as const,
  "phone_number": {}
});

export const urlProperty = (): PropertyType => ({
  "type": "url" as const,
  "url": {}
});

export const lastEditedTimeProperty = (): PropertyType => ({
  "type": "last_edited_time" as const,
  "last_edited_time": {}
});

export const createdTimeProperty = (): PropertyType => ({
  "type": "created_time" as const,
  "created_time": {}
});

export const relationProperty = (databaseId: string): PropertyType => ({
  "type": "relation" as const,
  "relation": {
    "database_id": databaseId,
    "type": "dual_property" as const,
    "dual_property": {}
  }
});

type SelectColor = "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";

export const selectProperty = (options: Array<{name: string, color: SelectColor}>): PropertyType => ({
  "type": "select" as const,
  "select": {
    "options": options
  }
});

export const multiSelectProperty = (options: Array<{name: string, color: SelectColor}>): PropertyType => ({
  "type": "multi_select" as const,
  "multi_select": {
    "options": options
  }
});

// Common select option sets
export const statusOptions = {
  charge: [
    {name: "succeeded", color: "green" as SelectColor},
    {name: "pending", color: "yellow" as SelectColor},
    {name: "failed", color: "red" as SelectColor}
  ],
  invoice: [
    {name: "draft", color: "gray" as SelectColor},
    {name: "open", color: "yellow" as SelectColor},
    {name: "paid", color: "green" as SelectColor},
    {name: "uncollectible", color: "red" as SelectColor},
    {name: "void", color: "red" as SelectColor}
  ],
  subscription: [
    {name: "incomplete", color: "red" as SelectColor},
    {name: "incomplete_expired", color: "red" as SelectColor},
    {name: "trialing", color: "yellow" as SelectColor},
    {name: "active", color: "green" as SelectColor},
    {name: "past_due", color: "orange" as SelectColor},
    {name: "canceled", color: "red" as SelectColor},
    {name: "unpaid", color: "red" as SelectColor},
    {name: "paused", color: "gray" as SelectColor}
  ]
};

export const taxExemptOptions = [
  {name: "none", color: "gray" as SelectColor},
  {name: "exempt", color: "green" as SelectColor},
  {name: "reverse", color: "orange" as SelectColor}
];

export const collectionMethodOptions = [
  {name: "charge_automatically", color: "blue" as SelectColor},
  {name: "send_invoice", color: "purple" as SelectColor}
];

export const intervalOptions = [
  {name: "day", color: "blue" as SelectColor},
  {name: "week", color: "green" as SelectColor},
  {name: "month", color: "purple" as SelectColor},
  {name: "year", color: "red" as SelectColor}
];

export const paymentMethodTypeOptions = [
  {name: "card", color: "blue" as SelectColor},
  {name: "card_present", color: "blue" as SelectColor},
  {name: "paypal", color: "purple" as SelectColor},
  {name: "cashapp", color: "green" as SelectColor},
  {name: "link", color: "orange" as SelectColor},
  {name: "us_bank_account", color: "gray" as SelectColor},
  {name: "sepa_debit", color: "gray" as SelectColor}
];

export const cardBrandOptions = [
  {name: "visa", color: "blue" as SelectColor},
  {name: "mastercard", color: "orange" as SelectColor},
  {name: "amex", color: "green" as SelectColor},
  {name: "discover", color: "purple" as SelectColor},
  {name: "jcb", color: "red" as SelectColor},
  {name: "diners", color: "gray" as SelectColor},
  {name: "unionpay", color: "yellow" as SelectColor}
];

export const cardFundingOptions = [
  {name: "credit", color: "blue" as SelectColor},
  {name: "debit", color: "green" as SelectColor},
  {name: "prepaid", color: "yellow" as SelectColor},
  {name: "unknown", color: "gray" as SelectColor}
];

// Address field sets
export const createAddressFields = (prefix: string = "") => {
  const fieldPrefix = prefix ? `${prefix} ` : "";
  return {
    [`${fieldPrefix}Address Line 1`]: richTextProperty(),
    [`${fieldPrefix}Address Line 2`]: richTextProperty(),
    [`${fieldPrefix}City`]: richTextProperty(),
    [`${fieldPrefix}State`]: richTextProperty(),
    [`${fieldPrefix}Postal Code`]: richTextProperty(),
    [`${fieldPrefix}Country`]: richTextProperty()
  };
};

// Standard metadata fields
export const createMetadataFields = () => ({
  "Metadata": richTextProperty(),
  "Last Updated": lastEditedTimeProperty(),
  "Record Created": createdTimeProperty()
});

// Common fields
export const createCommonFields = () => ({
  "Live Mode": checkboxProperty(),
  "Created Date": dateProperty(),
  "Description": richTextProperty(),
  ...createMetadataFields()
});