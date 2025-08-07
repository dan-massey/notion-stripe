import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  richTextProperty,
  selectProperty,
  numberProperty,
  urlProperty,
  dateProperty,
  checkboxProperty,
  createMetadataFields
} from "./utils";

export const getCreditNoteSchema = (customerDatabaseId: string, invoiceDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Credit Note ID": titleProperty(),
  "Link": urlProperty(),
  "Customer": relationProperty(customerDatabaseId),
  "Invoice": relationProperty(invoiceDatabaseId),
  "Number": richTextProperty(),
  "Status": selectProperty([
    {name: "issued", color: "green" as const},
    {name: "void", color: "red" as const}
  ]),
  "Amount": numberProperty(),
  "Amount Shipping": numberProperty(),
  "Currency": richTextProperty(),
  "Memo": richTextProperty(),
  "PDF": urlProperty(),
  "Reason": selectProperty([
    {name: "duplicate", color: "orange" as const},
    {name: "fraudulent", color: "red" as const},
    {name: "order_change", color: "blue" as const},
    {name: "product_unsatisfactory", color: "purple" as const}
  ]),
  "Pre Payment Amount": numberProperty(),
  "Post Payment Amount": numberProperty(),
  "Effective At": dateProperty(),
  "Customer Balance Transaction": richTextProperty(),
  "Discount Amount": numberProperty(),
  "Refunds Count": numberProperty(),
  "Shipping Cost Amount Subtotal": numberProperty(),
  "Shipping Cost Amount Tax": numberProperty(),
  "Shipping Cost Amount Total": numberProperty(),
  "Shipping Rate": richTextProperty(),
  "Type": selectProperty([
    {name: "pre_payment", color: "blue" as const},
    {name: "post_payment", color: "green" as const},
    {name: "mixed", color: "purple" as const}
  ]),
  "Voided At": dateProperty(),
  "Created Date": dateProperty(),
  "Discount Amounts Count": numberProperty(),
  "Discount Amounts": richTextProperty(),
  "Lines Count": numberProperty(),
  "Subtotal": numberProperty(),
  "Subtotal Excluding Tax": numberProperty(),
  "Tax Amounts Count": numberProperty(),
  "Tax Amounts": richTextProperty(),
  "Total": numberProperty(),
  "Total Excluding Tax": numberProperty(),
  "Out of Band Amount": numberProperty(),
  "Live Mode": checkboxProperty(),
  ...createMetadataFields()
});