import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  urlProperty,
  relationProperty,
  selectProperty,
  numberProperty,
  richTextProperty,
  checkboxProperty,
  dateProperty,
  createMetadataFields
} from "./utils";

export const getInvoiceItemSchema = (
  customerDatabaseId: string,
  invoiceDatabaseId: string,
  priceDatabaseId: string,
  subscriptionDatabaseId: string,
  subscriptionItemDatabaseId: string
): CreateDatabaseParameters["properties"] => {
  const baseProperties: CreateDatabaseParameters["properties"] = {
    "Invoice Item ID": titleProperty(),
    "Link": urlProperty(),
    "Customer": relationProperty(customerDatabaseId),
    "Invoice": relationProperty(invoiceDatabaseId),
    "Amount": numberProperty(),
    "Currency": richTextProperty(),
    "Description": richTextProperty(),
    "Discountable": checkboxProperty(),
    "Period Start": dateProperty(),
    "Period End": dateProperty(),
    "Proration": checkboxProperty(),
    "Quantity": numberProperty(),
    "Test Clock": richTextProperty(),
    "Live Mode": checkboxProperty(),
    "Created Date": dateProperty(),
    "Price": relationProperty(priceDatabaseId),
    "Product": richTextProperty(),
    "Unit Amount Decimal": richTextProperty(),
    "Parent Type": selectProperty([
      {name: "subscription_details", color: "blue" as const}
    ]),
    "Subscription": relationProperty(subscriptionDatabaseId),
    "Subscription Item": relationProperty(subscriptionItemDatabaseId),
    "Tax Rates Count": numberProperty(),
    "Tax Rates": richTextProperty(),
    "Discounts Count": numberProperty(),
    "Discounts": richTextProperty(),
    ...createMetadataFields()
  };

  return baseProperties;
};
