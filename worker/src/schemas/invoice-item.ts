import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";

export const getInvoiceItemSchema = (
  customerDatabaseId: string,
  invoiceDatabaseId: string,
  priceDatabaseId: string
): CreateDatabaseParameters["properties"] => {
  const baseProperties: CreateDatabaseParameters["properties"] = {
    "Invoice Item ID": {
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
    Invoice: {
      type: "relation" as const,
      relation: {
        database_id: invoiceDatabaseId,
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
    Currency: {
      type: "rich_text" as const,
      rich_text: {},
    },
    Description: {
      type: "rich_text" as const,
      rich_text: {},
    },
    Discountable: {
      type: "checkbox" as const,
      checkbox: {},
    },
    "Period Start": {
      type: "date" as const,
      date: {},
    },
    "Period End": {
      type: "date" as const,
      date: {},
    },
    Proration: {
      type: "checkbox" as const,
      checkbox: {},
    },
    Quantity: {
      type: "number" as const,
      number: {
        format: "number" as const,
      },
    },
    Subscription: {
      type: "rich_text" as const,
      rich_text: {},
    },
    "Subscription Item": {
      type: "rich_text" as const,
      rich_text: {},
    },
    "Test Clock": {
      type: "rich_text" as const,
      rich_text: {},
    },
    "Unit Amount": {
      type: "number" as const,
      number: {
        format: "number" as const,
      },
    },
    "Unit Amount Decimal": {
      type: "rich_text" as const,
      rich_text: {},
    },
    "Live Mode": {
      type: "checkbox" as const,
      checkbox: {},
    },
    "Created Date": {
      type: "date" as const,
      date: {},
    },
    "Tax Rates Count": {
      type: "number" as const,
      number: {
        format: "number" as const,
      },
    },
    "Tax Rates": {
      type: "rich_text" as const,
      rich_text: {},
    },
    "Discounts Count": {
      type: "number" as const,
      number: {
        format: "number" as const,
      },
    },
    Discounts: {
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
    "Price": {
      type: "relation" as const,
      relation: {
        database_id: priceDatabaseId,
        type: "dual_property" as const,
        dual_property: {},
      },
    },
  };

  return baseProperties;
};
