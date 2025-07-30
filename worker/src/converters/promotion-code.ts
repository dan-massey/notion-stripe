import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createRelationProperty,
} from "@/utils/notion-properties";

export function stripePromotionCodeToNotionProperties(
  promotionCode: Stripe.PromotionCode,
  customerNotionPageId: string | null,
  couponNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Promotion Code ID": createTitleProperty(promotionCode.id),
    Code: createRichTextProperty(promotionCode.code),
    Active: createCheckboxProperty(promotionCode.active),
    "Times Redeemed": createNumberProperty(promotionCode.times_redeemed || 0),
    "Max Redemptions": createNumberProperty(promotionCode.max_redemptions),
    "Created Date": createDateProperty(promotionCode.created),
    "Expires At": createDateProperty(promotionCode.expires_at),
    "Live Mode": createCheckboxProperty(promotionCode.livemode),
    Metadata: createRichTextProperty(
      JSON.stringify(promotionCode.metadata || {})
    ),
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = createRelationProperty(customerNotionPageId);
  }

  if (couponNotionPageId) {
    properties["Coupon"] = createRelationProperty(couponNotionPageId);
  }

  // Handle coupon details
  if (promotionCode.coupon) {
    const coupon = promotionCode.coupon;

    properties["Coupon ID"] = createRichTextProperty(coupon.id);
    properties["Coupon Name"] = createRichTextProperty(coupon.name);
    properties["Coupon Duration"] = createSelectProperty(coupon.duration);
    properties["Coupon Duration In Months"] = createNumberProperty(
      coupon.duration_in_months
    );

    properties["Coupon Amount Off"] = createNumberProperty(coupon.amount_off);
    properties["Coupon Percent Off"] = createNumberProperty(
      coupon.percent_off ? coupon.percent_off / 100 : null
    );

    properties["Coupon Currency"] = createRichTextProperty(
      coupon.currency?.toUpperCase()
    );

    properties["Coupon Valid"] = createCheckboxProperty(coupon.valid);
    properties["Coupon Times Redeemed"] = createNumberProperty(
      coupon.times_redeemed || 0
    );
    properties["Coupon Max Redemptions"] = createNumberProperty(
      coupon.max_redemptions
    );
    properties["Coupon Redeem By"] = createDateProperty(coupon.redeem_by);
    properties["Coupon Created Date"] = createDateProperty(coupon.created);

    // Handle coupon applies_to products
    if (coupon.applies_to?.products && coupon.applies_to.products.length > 0) {
      properties["Coupon Applies To Products"] = createRichTextProperty(
        coupon.applies_to.products.join(", ")
      );
    } else {
      properties["Coupon Applies To Products"] = createRichTextProperty("");
    }

    // Handle coupon currency options
    if (
      coupon.currency_options &&
      Object.keys(coupon.currency_options).length > 0
    ) {
      properties["Coupon Currency Options Count"] = createNumberProperty(
        Object.keys(coupon.currency_options).length
      );
    } else {
      properties["Coupon Currency Options Count"] = createNumberProperty(0);
    }
  } else {
    // Set default values for coupon fields when no coupon is present
    properties["Coupon ID"] = createRichTextProperty("");
    properties["Coupon Name"] = createRichTextProperty("");
    properties["Coupon Duration"] = createSelectProperty(null);
    properties["Coupon Duration In Months"] = createNumberProperty(null);
    properties["Coupon Amount Off"] = createNumberProperty(null);
    properties["Coupon Percent Off"] = createNumberProperty(null);
    properties["Coupon Currency"] = createRichTextProperty("");
    properties["Coupon Valid"] = createCheckboxProperty(false);
    properties["Coupon Times Redeemed"] = createNumberProperty(0);
    properties["Coupon Max Redemptions"] = createNumberProperty(null);
    properties["Coupon Redeem By"] = createDateProperty(null);
    properties["Coupon Created Date"] = createDateProperty(null);
    properties["Coupon Applies To Products"] = createRichTextProperty("");
    properties["Coupon Currency Options Count"] = createNumberProperty(0);
  }

  // Handle restrictions
  if (promotionCode.restrictions) {
    properties["Restrictions First Time Transaction"] = createCheckboxProperty(
      promotionCode.restrictions.first_time_transaction
    );
    properties["Restrictions Minimum Amount"] = createNumberProperty(
      promotionCode.restrictions.minimum_amount
    );
    properties["Restrictions Minimum Amount Currency"] = createRichTextProperty(
      promotionCode.restrictions.minimum_amount_currency?.toUpperCase()
    );

    // Handle restrictions currency options
    if (
      promotionCode.restrictions.currency_options &&
      Object.keys(promotionCode.restrictions.currency_options).length > 0
    ) {
      properties["Restrictions Currency Options Count"] = createNumberProperty(
        Object.keys(promotionCode.restrictions.currency_options).length
      );
    } else {
      properties["Restrictions Currency Options Count"] =
        createNumberProperty(0);
    }
  } else {
    properties["Restrictions First Time Transaction"] =
      createCheckboxProperty(false);
    properties["Restrictions Minimum Amount"] = createNumberProperty(null);
    properties["Restrictions Minimum Amount Currency"] =
      createRichTextProperty("");
    properties["Restrictions Currency Options Count"] = createNumberProperty(0);
  }

  return properties;
}
