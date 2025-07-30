import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  richTextProperty,
  dateProperty,
  checkboxProperty,
  numberProperty,
  selectProperty,
  createMetadataFields,
  intervalOptions
} from "./utils";

export const getSubscriptionItemSchema = (
  subscriptionDatabaseId: string,
  priceDatabaseId: string,
  productDatabaseId: string
): CreateDatabaseParameters["properties"] => ({
  "Subscription Item ID": titleProperty(),
  "Subscription": relationProperty(subscriptionDatabaseId),
  "Price": relationProperty(priceDatabaseId),
  "Product": relationProperty(productDatabaseId),
  "Quantity": numberProperty(),
  "Created Date": dateProperty(),
  "Current Period Start": dateProperty(),
  "Current Period End": dateProperty(),
  
  // Billing thresholds
  "Usage Threshold": numberProperty(),
  
  // Price details from embedded price object
  "Price Active": checkboxProperty(),
  "Price Currency": richTextProperty(),
  "Price Unit Amount": numberProperty(),
  "Price Unit Amount Decimal": richTextProperty(),
  "Price Billing Scheme": selectProperty([
    {name: "per_unit", color: "blue" as const},
    {name: "tiered", color: "purple" as const}
  ]),
  "Price Type": selectProperty([
    {name: "one_time", color: "gray" as const},
    {name: "recurring", color: "green" as const}
  ]),
  "Price Nickname": richTextProperty(),
  "Price Lookup Key": richTextProperty(),
  
  // Recurring details from price.recurring
  "Price Interval": selectProperty(intervalOptions),
  "Price Interval Count": numberProperty(),
  "Price Usage Type": selectProperty([
    {name: "licensed", color: "blue" as const},
    {name: "metered", color: "purple" as const}
  ]),
  "Price Meter": richTextProperty(),
  
  // Tax behavior
  "Price Tax Behavior": selectProperty([
    {name: "inclusive", color: "green" as const},
    {name: "exclusive", color: "blue" as const},
    {name: "unspecified", color: "gray" as const}
  ]),
  
  // Tax rates
  "Tax Rates Count": numberProperty(),
  "Primary Tax Rate": richTextProperty(),
  "Primary Tax Rate Percentage": numberProperty("percent"),
  "Primary Tax Rate Display Name": richTextProperty(),
  "Primary Tax Rate Country": richTextProperty(),
  "Primary Tax Rate State": richTextProperty(),
  "Primary Tax Rate Jurisdiction": richTextProperty(),
  "Primary Tax Rate Inclusive": checkboxProperty(),
  "Primary Tax Rate Active": checkboxProperty(),
  
  // Transform quantity
  "Transform Quantity Divide By": numberProperty(),
  "Transform Quantity Round": selectProperty([
    {name: "up", color: "green" as const},
    {name: "down", color: "red" as const}
  ]),
  
  // Tiers mode
  "Price Tiers Mode": selectProperty([
    {name: "graduated", color: "blue" as const},
    {name: "volume", color: "purple" as const}
  ]),
  
  // Custom unit amount
  "Custom Unit Amount Enabled": checkboxProperty(),
  "Custom Unit Amount Minimum": numberProperty(),
  "Custom Unit Amount Maximum": numberProperty(),
  "Custom Unit Amount Preset": numberProperty(),
  
  // Discounts
  "Discounts Count": numberProperty(),
  "Discounts Applied": richTextProperty(),
  
  ...createMetadataFields()
});