import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  numberProperty,
  richTextProperty,
  checkboxProperty,
  dateProperty,
  createMetadataFields
} from "./utils";

export const getInvoiceItemSchema = (
  customerDatabaseId: string,
  invoiceDatabaseId: string,
  priceDatabaseId: string
): CreateDatabaseParameters["properties"] => {
  const baseProperties: CreateDatabaseParameters["properties"] = {
    "Invoice Item ID": titleProperty(),
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
    "Subscription": richTextProperty(),
    "Subscription Item": richTextProperty(),
    "Test Clock": richTextProperty(),
    "Unit Amount": numberProperty(),
    "Unit Amount Decimal": richTextProperty(),
    "Live Mode": checkboxProperty(),
    "Created Date": dateProperty(),
    "Tax Rates Count": numberProperty(),
    "Tax Rates": richTextProperty(),
    "Discounts Count": numberProperty(),
    "Discounts": richTextProperty(),
    "Price": relationProperty(priceDatabaseId),
    ...createMetadataFields()
  };

  return baseProperties;
};
