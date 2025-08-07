import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  checkboxProperty,
  selectProperty,
  richTextProperty,
  numberProperty,
  dateProperty,
  createMetadataFields,
  intervalOptions,
  urlProperty
} from "./utils";

export const getPriceSchema = (productDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Price ID": titleProperty(),
  "Link": urlProperty(),
  "Product": relationProperty(productDatabaseId),
  "Active": checkboxProperty(),
  "Type": selectProperty([
    {name: "one_time", color: "blue" as const},
    {name: "recurring", color: "green" as const}
  ]),
  "Billing Scheme": selectProperty([
    {name: "per_unit", color: "blue" as const},
    {name: "tiered", color: "purple" as const}
  ]),
  "Currency": richTextProperty(),
  "Unit Amount": numberProperty(),
  "Unit Amount Decimal": richTextProperty(),
  "Nickname": richTextProperty(),
  "Lookup Key": richTextProperty(),
  "Tax Behavior": selectProperty([
    {name: "inclusive", color: "green" as const},
    {name: "exclusive", color: "orange" as const},
    {name: "unspecified", color: "gray" as const}
  ]),
  "Live Mode": checkboxProperty(),
  "Created Date": dateProperty(),
  "Recurring Interval": selectProperty(intervalOptions),
  "Recurring Interval Count": numberProperty(),
  "Recurring Usage Type": selectProperty([
    {name: "licensed", color: "blue" as const},
    {name: "metered", color: "green" as const}
  ]),
  "Recurring Meter": richTextProperty(),
  "Custom Unit Amount Minimum": numberProperty(),
  "Custom Unit Amount Maximum": numberProperty(),
  "Custom Unit Amount Preset": numberProperty(),
  "Tiers Mode": selectProperty([
    {name: "graduated", color: "blue" as const},
    {name: "volume", color: "purple" as const}
  ]),
  "Tiers Count": numberProperty(),
  "Transform Quantity Divide By": numberProperty(),
  "Transform Quantity Round": selectProperty([
    {name: "up", color: "green" as const},
    {name: "down", color: "red" as const}
  ]),
  "Currency Options Count": numberProperty(),
  "Currency Options": richTextProperty(),
  ...createMetadataFields()
})