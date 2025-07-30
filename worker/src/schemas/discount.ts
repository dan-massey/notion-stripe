import type { CreateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  richTextProperty,
  selectProperty,
  numberProperty,
  dateProperty,
  relationProperty,
  createMetadataFields,
} from "./utils";

export const getDiscountSchema = (
  customerDatabaseId: string,
  subscriptionDatabaseId: string,
  invoiceDatabaseId: string,
  invoiceItemDatabaseId: string,
  promotionCodeDatabaseId: string,
  couponDatabaseId: string
): CreateDatabaseParameters["properties"] => ({
  "Discount ID": titleProperty(),
  Coupon: relationProperty(couponDatabaseId),
  Customer: relationProperty(customerDatabaseId),
  End: dateProperty(),
  Start: dateProperty(),
  Subscription: relationProperty(subscriptionDatabaseId),
  Invoice: relationProperty(invoiceDatabaseId),
  "Invoice Item": relationProperty(invoiceItemDatabaseId),
  "Promotion Code": relationProperty(promotionCodeDatabaseId),

  ...createMetadataFields(),
});
