import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  richTextProperty,
  emailProperty,
  phoneProperty,
  numberProperty,
  checkboxProperty,
  selectProperty,
  createAddressFields,
  createCommonFields,
  taxExemptOptions
} from "./utils";

export const customerSchema: CreateDatabaseParameters["properties"] = {
  "Customer ID": titleProperty(),
  "Name": richTextProperty(),
  "Email": emailProperty(),
  "Phone": phoneProperty(),
  "Balance": numberProperty(),
  "Currency": richTextProperty(),
  "Delinquent": checkboxProperty(),
  "Tax Exempt": selectProperty(taxExemptOptions),
  "Invoice Prefix": richTextProperty(),
  "Next Invoice Sequence": numberProperty(),
  ...createAddressFields(),
  "Shipping Name": richTextProperty(),
  ...createAddressFields("Shipping"),
  "Shipping Phone": phoneProperty(),
  "Preferred Locales": richTextProperty(),
  "Default Payment Method": richTextProperty(),
  "Default Source": richTextProperty(),
  "Cash Balance Available": checkboxProperty(),
  "Has Active Discount": checkboxProperty(),
  "Discount Type": selectProperty([
    {name: "coupon", color: "green" as const},
    {name: "promotion_code", color: "blue" as const}
  ]),
  "Tax Location Country": richTextProperty(),
  "Tax Location State": richTextProperty(),
  "Tax Automatic Status": selectProperty([
    {name: "supported", color: "green" as const},
    {name: "not_collecting", color: "yellow" as const},
    {name: "failed", color: "red" as const},
    {name: "unrecognized_location", color: "gray" as const}
  ]),
  "Active Subscriptions": numberProperty(),
  "Total Payment Sources": numberProperty(),
  "Test Clock ID": richTextProperty(),
  ...createCommonFields()
};