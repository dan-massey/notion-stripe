import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  richTextProperty,
  selectProperty,
  numberProperty,
  dateProperty,
  createMetadataFields
} from "./utils";

export const getCouponSchema =
  (productDatabaseId: string): CreateDatabaseParameters["properties"] => ({
    "Coupon ID": titleProperty(),
    "Amount Off": numberProperty(),
    "Currency": richTextProperty(),
    "Duration": selectProperty([
        {name: "forever", color: "orange" as const},
        {name: "once", color: "purple" as const},
        {name: "repeating", color: "red" as const},
    ]),
    "Name": richTextProperty(),
    "Percent Off": numberProperty(),
    "Created": dateProperty(),
    "Max Redemptions": numberProperty(),
    "Redeem By": dateProperty(),
    "Times Redeemed": numberProperty(),
    ...createMetadataFields()
  });
