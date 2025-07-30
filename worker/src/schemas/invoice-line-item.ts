import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  selectProperty,
  numberProperty,
  richTextProperty,
  checkboxProperty,
  dateProperty,
  createMetadataFields
} from "./utils";

export const getInvoiceLineItemSchema = (
  invoiceDatabaseId: string, 
  priceDatabaseId: string,
  subscriptionDatabaseId: string,
  subscriptionItemDatabaseId: string,
  invoiceItemDatabaseId: string
): CreateDatabaseParameters["properties"] => {
  return {
    "Line Item ID": titleProperty(),
    "Invoice": relationProperty(invoiceDatabaseId),
    "Price": relationProperty(priceDatabaseId),
    "Parent Type": selectProperty([
      {name: "invoice_item_details", color: "blue" as const},
      {name: "subscription_item_details", color: "green" as const}
    ]),
    "Amount": numberProperty(),
    "Amount Excluding Tax": numberProperty(),
    "Currency": richTextProperty(),
    "Description": richTextProperty(),
    "Discountable": checkboxProperty(),
    "Live Mode": checkboxProperty(),
    "Proration": checkboxProperty(),
    "Quantity": numberProperty(),
    "Subscription": relationProperty(subscriptionDatabaseId),
    "Subscription Item": relationProperty(subscriptionItemDatabaseId),
    "Unit Amount Excluding Tax": richTextProperty(),
    "Invoice Item": relationProperty(invoiceItemDatabaseId),
    "Period Start": dateProperty(),
    "Period End": dateProperty(),
    "Proration Details Credited Items Count": numberProperty(),
    "Proration Details": richTextProperty(),
    "Tax Amounts Count": numberProperty(),
    "Tax Amounts": richTextProperty(),
    "Tax Rates Count": numberProperty(),
    "Tax Rates": richTextProperty(),
    "Discount Amounts Count": numberProperty(),
    "Discount Amounts": richTextProperty(),
    "Discounts Count": numberProperty(),
    "Discounts": richTextProperty(),
    ...createMetadataFields()
  };
};