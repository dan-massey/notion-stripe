import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  selectProperty,
  richTextProperty,
  dateProperty,
  checkboxProperty,
  numberProperty,
  createMetadataFields,
  statusOptions,
  collectionMethodOptions,
  intervalOptions,
  urlProperty
} from "./utils";

export const getSubscriptionSchema = (
  customerDatabaseId: string,
  invoiceDatabaseId: string,
  priceDatabaseId: string,
  productDatabaseId: string
): CreateDatabaseParameters["properties"] => ({
  "Subscription ID": titleProperty(),
  "Link": urlProperty(),
  "Customer": relationProperty(customerDatabaseId),
  "Latest Invoice": relationProperty(invoiceDatabaseId),
  "Status": selectProperty(statusOptions.subscription),
  "Collection Method": selectProperty(collectionMethodOptions),
  "Currency": richTextProperty(),
  "Created Date": dateProperty(),
  "Start Date": dateProperty(),
  "Current Period Start": dateProperty(),
  "Current Period End": dateProperty(),
  "Trial Start": dateProperty(),
  "Trial End": dateProperty(),
  "Billing Cycle Anchor": dateProperty(),
  "Cancel At": dateProperty(),
  "Canceled At": dateProperty(),
  "Ended At": dateProperty(),
  "Cancel At Period End": checkboxProperty(),
  "Live Mode": checkboxProperty(),
  "Billing Mode": selectProperty([
    {name: "classic", color: "gray" as const},
    {name: "flexible", color: "blue" as const}
  ]),
  "Application Fee Percent": numberProperty("percent"),
  "Days Until Due": numberProperty(),
  "Default Payment Method": richTextProperty(),
  "Default Source": richTextProperty(),
  "Description": richTextProperty(),
  "Automatic Tax Enabled": checkboxProperty(),
  "Automatic Tax Disabled Reason": selectProperty([
    {name: "requires_location_inputs", color: "yellow" as const}
  ]),
  "Billing Threshold Amount": numberProperty(),
  "Reset Billing Cycle Anchor": checkboxProperty(),
  "Cancellation Reason": selectProperty([
    {name: "cancellation_requested", color: "orange" as const},
    {name: "payment_disputed", color: "red" as const},
    {name: "payment_failed", color: "red" as const}
  ]),
  "Cancellation Feedback": selectProperty([
    {name: "customer_service", color: "orange" as const},
    {name: "low_quality", color: "red" as const},
    {name: "missing_features", color: "yellow" as const},
    {name: "other", color: "gray" as const},
    {name: "switched_service", color: "blue" as const},
    {name: "too_complex", color: "purple" as const},
    {name: "too_expensive", color: "red" as const},
    {name: "unused", color: "gray" as const}
  ]),
  "Cancellation Comment": richTextProperty(),
  "Trial End Behavior": selectProperty([
    {name: "cancel", color: "red" as const},
    {name: "create_invoice", color: "blue" as const},
    {name: "pause", color: "yellow" as const}
  ]),
  "Pause Collection Behavior": selectProperty([
    {name: "keep_as_draft", color: "yellow" as const},
    {name: "mark_uncollectible", color: "red" as const},
    {name: "void", color: "gray" as const}
  ]),
  "Pause Resumes At": dateProperty(),
  "Pending Invoice Item Interval": selectProperty(intervalOptions),
  "Pending Invoice Item Interval Count": numberProperty(),
  "Next Pending Invoice Item Invoice": dateProperty(),
  "Save Default Payment Method": selectProperty([
    {name: "off", color: "gray" as const},
    {name: "on_subscription", color: "green" as const}
  ]),
  "Application": richTextProperty(),
  "On Behalf Of": richTextProperty(),
  "Schedule": richTextProperty(),
  "Pending Setup Intent": richTextProperty(),
  "Transfer Destination": richTextProperty(),
  "Transfer Amount Percent": numberProperty("percent"),
  "Pending Update Expires At": dateProperty(),
  "Has Pending Update": checkboxProperty(),
  "Subscription Items Count": numberProperty(),
  "Primary Price": relationProperty(priceDatabaseId),
  "Primary Product": relationProperty(productDatabaseId),
  "Primary Price Amount": numberProperty(),
  "Primary Price Interval": selectProperty(intervalOptions),
  "Primary Price Interval Count": numberProperty(),
  "Primary Quantity": numberProperty(),
  "Tax Rate Percentage": numberProperty("percent"),
  "Test Clock": richTextProperty(),
  ...createMetadataFields()
});
