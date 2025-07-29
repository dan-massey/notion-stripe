import type Stripe from "stripe";

export function stripePromotionCodeToNotionProperties(promotionCode: Stripe.PromotionCode, customerNotionPageId: string | null) {
  const properties: Record<string, any> = {
    "Promotion Code ID": {
      title: [
        {
          type: "text",
          text: {
            content: promotionCode.id,
          },
        },
      ],
    },
    "Code": {
      rich_text: [
        {
          type: "text",
          text: {
            content: promotionCode.code || "",
          },
        },
      ],
    },
    "Active": {
      checkbox: promotionCode.active || false,
    },
    "Times Redeemed": {
      number: promotionCode.times_redeemed || 0,
    },
    "Max Redemptions": {
      number: promotionCode.max_redemptions || null,
    },
    "Created Date": {
      date: {
        start: new Date(promotionCode.created * 1000).toISOString().split('T')[0],
      },
    },
    "Expires At": {
      date: promotionCode.expires_at ? {
        start: new Date(promotionCode.expires_at * 1000).toISOString().split('T')[0],
      } : null,
    },
    "Live Mode": {
      checkbox: promotionCode.livemode || false,
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(promotionCode.metadata || {}),
          },
        },
      ],
    },
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = {
      relation: [{ id: customerNotionPageId }],
    };
  }

  // Handle coupon details
  if (promotionCode.coupon) {
    const coupon = promotionCode.coupon;

    properties["Coupon ID"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: coupon.id || "",
          },
        },
      ],
    };

    properties["Coupon Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: coupon.name || "",
          },
        },
      ],
    };

    properties["Coupon Duration"] = {
      select: coupon.duration ? { name: coupon.duration } : null,
    };

    properties["Coupon Duration In Months"] = {
      number: coupon.duration_in_months || null,
    };

    properties["Coupon Amount Off"] = {
      number: coupon.amount_off || null,
    };

    properties["Coupon Percent Off"] = {
      number: coupon.percent_off ? coupon.percent_off / 100 : null,
    };

    properties["Coupon Currency"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: coupon.currency?.toUpperCase() || "",
          },
        },
      ],
    };

    properties["Coupon Valid"] = {
      checkbox: coupon.valid || false,
    };

    properties["Coupon Times Redeemed"] = {
      number: coupon.times_redeemed || 0,
    };

    properties["Coupon Max Redemptions"] = {
      number: coupon.max_redemptions || null,
    };

    properties["Coupon Redeem By"] = {
      date: coupon.redeem_by ? {
        start: new Date(coupon.redeem_by * 1000).toISOString().split('T')[0],
      } : null,
    };

    properties["Coupon Created Date"] = {
      date: {
        start: new Date(coupon.created * 1000).toISOString().split('T')[0],
      },
    };

    // Handle coupon applies_to products
    if (coupon.applies_to?.products && coupon.applies_to.products.length > 0) {
      properties["Coupon Applies To Products"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: coupon.applies_to.products.join(", "),
            },
          },
        ],
      };
    } else {
      properties["Coupon Applies To Products"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: "",
            },
          },
        ],
      };
    }

    // Handle coupon currency options
    if (coupon.currency_options && Object.keys(coupon.currency_options).length > 0) {
      properties["Coupon Currency Options Count"] = {
        number: Object.keys(coupon.currency_options).length,
      };
    } else {
      properties["Coupon Currency Options Count"] = {
        number: 0,
      };
    }
  } else {
    // Set default values for coupon fields when no coupon is present
    properties["Coupon ID"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };

    properties["Coupon Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };

    properties["Coupon Duration"] = {
      select: null,
    };

    properties["Coupon Duration In Months"] = {
      number: null,
    };

    properties["Coupon Amount Off"] = {
      number: null,
    };

    properties["Coupon Percent Off"] = {
      number: null,
    };

    properties["Coupon Currency"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };

    properties["Coupon Valid"] = {
      checkbox: false,
    };

    properties["Coupon Times Redeemed"] = {
      number: 0,
    };

    properties["Coupon Max Redemptions"] = {
      number: null,
    };

    properties["Coupon Redeem By"] = {
      date: null,
    };

    properties["Coupon Created Date"] = {
      date: null,
    };

    properties["Coupon Applies To Products"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };

    properties["Coupon Currency Options Count"] = {
      number: 0,
    };
  }

  // Handle restrictions
  if (promotionCode.restrictions) {
    properties["Restrictions First Time Transaction"] = {
      checkbox: promotionCode.restrictions.first_time_transaction || false,
    };

    properties["Restrictions Minimum Amount"] = {
      number: promotionCode.restrictions.minimum_amount || null,
    };

    properties["Restrictions Minimum Amount Currency"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: promotionCode.restrictions.minimum_amount_currency?.toUpperCase() || "",
          },
        },
      ],
    };

    // Handle restrictions currency options
    if (promotionCode.restrictions.currency_options && Object.keys(promotionCode.restrictions.currency_options).length > 0) {
      properties["Restrictions Currency Options Count"] = {
        number: Object.keys(promotionCode.restrictions.currency_options).length,
      };
    } else {
      properties["Restrictions Currency Options Count"] = {
        number: 0,
      };
    }
  } else {
    properties["Restrictions First Time Transaction"] = {
      checkbox: false,
    };

    properties["Restrictions Minimum Amount"] = {
      number: null,
    };

    properties["Restrictions Minimum Amount Currency"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };

    properties["Restrictions Currency Options Count"] = {
      number: 0,
    };
  }

  return properties;
}