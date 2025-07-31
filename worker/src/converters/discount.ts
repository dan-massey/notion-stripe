import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createUrlProperty,
  createRelationProperty,
  stringFromObject,
} from "@/converters/notion-properties";

export function stripeDiscountToNotionProperties(
  discount: Stripe.Discount,
  customerNotionPageId: string,
  couponNotionPageId: string,
  promotionCodeNotionPageId: string,
  subscriptionNotionPageId: string,
  invoiceNotionPageId: string,
  invoiceItemNotionPageId: string
) {
  const properties = {
    "Discount ID": createTitleProperty(discount.id),
    Coupon: createRelationProperty(couponNotionPageId),
    Customer: createRelationProperty(customerNotionPageId),
    End: createDateProperty(discount.end),
    Start: createDateProperty(discount.start),
    Subscription: createRelationProperty(subscriptionNotionPageId),
    Invoice: createRelationProperty(invoiceNotionPageId),
    "Invoice Item": createRelationProperty(invoiceItemNotionPageId),
    "Promotion Code": createRelationProperty(promotionCodeNotionPageId),
  };

  return properties;
}
