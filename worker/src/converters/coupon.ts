import type Stripe from "stripe";
import {
  createDateProperty,
  createNumberProperty,
  createRichTextProperty,
  createSelectProperty,
  createTitleProperty,
} from "@/utils/notion-properties";

export function stripeCouponToNotionProperties(coupon: Stripe.Coupon) {
  const properties: Record<string, any> = {
    "Coupon ID": createTitleProperty(coupon.id),
    "Amount Off": createNumberProperty(coupon.amount_off),
    Currency: createRichTextProperty(coupon.currency),
    Duration: createSelectProperty(coupon.duration),
    Name: createRichTextProperty(coupon.name),
    "Percent Off": createNumberProperty(coupon.percent_off),
    Created: createDateProperty(coupon.created),
    "Max Redemptions": createNumberProperty(coupon.max_redemptions),
    "Redeem By": createDateProperty(coupon.redeem_by),
    "Times Redeemed": createNumberProperty(coupon.times_redeemed),
    Metadata: createRichTextProperty(JSON.stringify(coupon.metadata || {})),
  };
  
  return properties;
}
