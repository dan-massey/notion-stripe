import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  relationProperty,
  richTextProperty,
  checkboxProperty,
  numberProperty,
  dateProperty,
  selectProperty,
  createMetadataFields,
  urlProperty,
} from "./utils";

export const getPromotionCodeSchema = (
  customerDatabaseId: string,
  couponDatabaseId: string
): CreateDatabaseParameters["properties"] => {
  const baseProperties: CreateDatabaseParameters["properties"] = {
    "Promotion Code ID": titleProperty(),
    "Link": urlProperty(),
    Customer: relationProperty(customerDatabaseId),
    Code: richTextProperty(),
    Active: checkboxProperty(),
    "Times Redeemed": numberProperty(),
    "Max Redemptions": numberProperty(),
    "Created Date": dateProperty(),
    "Expires At": dateProperty(),
    "Live Mode": checkboxProperty(),
    Coupon: relationProperty(couponDatabaseId),
    "Coupon ID": richTextProperty(),
    "Coupon Name": richTextProperty(),
    "Coupon Duration": selectProperty([
      { name: "forever", color: "green" as const },
      { name: "once", color: "blue" as const },
      { name: "repeating", color: "purple" as const },
    ]),
    "Coupon Duration In Months": numberProperty(),
    "Coupon Amount Off": numberProperty(),
    "Coupon Percent Off": numberProperty("percent"),
    "Coupon Currency": richTextProperty(),
    "Coupon Valid": checkboxProperty(),
    "Coupon Times Redeemed": numberProperty(),
    "Coupon Max Redemptions": numberProperty(),
    "Coupon Redeem By": dateProperty(),
    "Coupon Created Date": dateProperty(),
    "Coupon Applies To Products": richTextProperty(),
    "Coupon Currency Options Count": numberProperty(),
    "Restrictions First Time Transaction": checkboxProperty(),
    "Restrictions Minimum Amount": numberProperty(),
    "Restrictions Minimum Amount Currency": richTextProperty(),
    "Restrictions Currency Options Count": numberProperty(),
    ...createMetadataFields(),
  };

  return baseProperties;
};
