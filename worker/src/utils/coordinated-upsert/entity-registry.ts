import type { EntityConfigRegistry, EntityConfig } from "./entity-config";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";

// Import converters
import { stripeCustomerToNotionProperties } from "@/converters/customer";
import { stripeProductToNotionProperties } from "@/converters/product";
import { stripeCouponToNotionProperties } from "@/converters/coupon";
import { stripeChargeToNotionProperties } from "@/converters/charge";
import { stripePaymentIntentToNotionProperties } from "@/converters/payment-intent";
import { stripeDisputeToNotionProperties } from "@/converters/dispute";
import { stripePriceToNotionProperties } from "@/converters/price";
import { stripePromotionCodeToNotionProperties } from "@/converters/promotion-code";
import { stripeInvoiceItemToNotionProperties } from "@/converters/invoice-item";
import { stripeInvoiceToNotionProperties } from "@/converters/invoice";
import { stripeInvoiceLineItemToNotionProperties } from "@/converters/invoice-line-item";
import { stripeCreditNoteToNotionProperties } from "@/converters/credit-note";
import { stripeSubscriptionToNotionProperties } from "@/converters/subscription";
import { stripeSubscriptionItemToNotionProperties } from "@/converters/subscription-item";
import { stripeDiscountToNotionProperties } from "@/converters/discount";

/**
 * Helper to extract string ID from Stripe object or string
 */
const extractId = (obj: any): string | null => {
  if (!obj) return null;
  return typeof obj === "string" ? obj : obj.id || null;
};

/**
 * Complete registry of all entity configurations
 */
export const ENTITY_REGISTRY: EntityConfigRegistry = {
  // Core entities with no dependencies
  customer: {
    entityType: "customer",
    stripeExpansions: [
      "subscriptions",
      "sources",
      "invoice_settings.default_payment_method",
      "default_source"
    ],
    dependencies: [],
    titleProperty: "Customer ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      const customer = await context.stripe.customers.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.customer.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
      return customer;
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeCustomerToNotionProperties(expandedEntity);
    }
  },

  product: {
    entityType: "product",
    stripeExpansions: [],
    dependencies: [],
    titleProperty: "Product ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.products.retrieve(
        stripeId,
        {},
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeProductToNotionProperties(expandedEntity);
    }
  },

  coupon: {
    entityType: "coupon",
    stripeExpansions: [],
    dependencies: [],
    titleProperty: "Coupon ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.coupons.retrieve(
        stripeId,
        {},
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeCouponToNotionProperties(expandedEntity);
    }
  },

  // Level 1 dependencies
  payment_intent: {
    entityType: "payment_intent",
    stripeExpansions: ["customer", "payment_method"],
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      }
    ],
    titleProperty: "Payment Intent ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.paymentIntents.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.payment_intent.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripePaymentIntentToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer
      );
    }
  },

  price: {
    entityType: "price",
    stripeExpansions: ["product"],
    dependencies: [
      {
        entityType: "product",
        databaseIdParam: "productDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.product),
        required: false
      }
    ],
    titleProperty: "Price ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.prices.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.price.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripePriceToNotionProperties(
        expandedEntity,
        dependencyPageIds.product
      );
    }
  },

  promotion_code: {
    entityType: "promotion_code",
    stripeExpansions: ["coupon", "customer"], 
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      },
      {
        entityType: "coupon",
        databaseIdParam: "couponDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.coupon),
        required: false
      }
    ],
    titleProperty: "Promotion Code ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.promotionCodes.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.promotion_code.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripePromotionCodeToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer,
        dependencyPageIds.coupon
      );
    }
  },

  // Level 2 dependencies
  charge: {
    entityType: "charge",
    stripeExpansions: ["customer", "payment_intent"],
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      },
      {
        entityType: "payment_intent",
        databaseIdParam: "paymentIntentDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.payment_intent),
        required: false
      }
    ],
    titleProperty: "Charge ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.charges.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.charge.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeChargeToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer,
        dependencyPageIds.payment_intent
      );
    }
  },

  // Level 3+ dependencies - more complex entities
  invoice: {
    entityType: "invoice",
    stripeExpansions: [
      "customer",
      "subscription", 
      "payment_intent",
      "default_payment_method",
      "default_source",
      "payments.data.payment.charge",
      "payments.data.payment.payment_intent",
      "lines",
      "discounts"
    ],
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      },
      {
        entityType: "charge",
        databaseIdParam: "chargeDatabaseId", 
        extractStripeId: (expandedEntity) => {
          // Extract primary charge from payments data
          if (expandedEntity.payments?.data?.[0]?.payment?.charge) {
            return extractId(expandedEntity.payments.data[0].payment.charge);
          }
          return null;
        },
        required: false
      },
      {
        entityType: "payment_intent",
        databaseIdParam: "paymentIntentDatabaseId",
        extractStripeId: (expandedEntity) => {
          // Extract primary payment intent from payments data  
          if (expandedEntity.payments?.data?.[0]?.payment?.payment_intent) {
            return extractId(expandedEntity.payments.data[0].payment.payment_intent);
          }
          return null;
        },
        required: false
      }
    ],
    titleProperty: "Invoice ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.invoices.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.invoice.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeInvoiceToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer,
        dependencyPageIds.charge,
        dependencyPageIds.payment_intent
      );
    }
  },

  subscription: {
    entityType: "subscription",
    stripeExpansions: [
      "customer",
      "latest_invoice",
      "default_payment_method",
      "default_source",
      "items.data.price.product",
      "discounts"
    ],
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      },
      {
        entityType: "invoice",
        databaseIdParam: "invoiceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.latest_invoice),
        required: false
      },
      {
        entityType: "price",
        databaseIdParam: "priceDatabaseId",
        extractStripeId: (expandedEntity) => {
          // Extract primary price from subscription items
          if (expandedEntity.items?.data?.[0]?.price) {
            return extractId(expandedEntity.items.data[0].price);
          }
          return null;
        },
        required: false
      },
      {
        entityType: "product",
        databaseIdParam: "productDatabaseId",
        extractStripeId: (expandedEntity) => {
          // Extract primary product from subscription items
          if (expandedEntity.items?.data?.[0]?.price?.product) {
            return extractId(expandedEntity.items.data[0].price.product);
          }
          return null;
        },
        required: false
      }
    ],
    titleProperty: "Subscription ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.subscriptions.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.subscription.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeSubscriptionToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer,
        dependencyPageIds.invoice,
        dependencyPageIds.price,
        dependencyPageIds.product
      );
    }
  },

  subscription_item: {
    entityType: "subscription_item",
    stripeExpansions: [
    ],
    dependencies: [
      {
        entityType: "subscription",
        databaseIdParam: "subscriptionDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.subscription),
        required: false
      },
      {
        entityType: "price",
        databaseIdParam: "priceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.price),
        required: false
      },
      {
        entityType: "product",
        databaseIdParam: "productDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.price?.product),
        required: false
      }
    ],
    titleProperty: "Subscription Item ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.subscriptionItems.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.subscription_item.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeSubscriptionItemToNotionProperties(
        expandedEntity,
        dependencyPageIds.subscription,
        dependencyPageIds.price,
        dependencyPageIds.product
      );
    }
  },

  credit_note: {
    entityType: "credit_note",
    stripeExpansions: ["customer", "invoice"],
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      },
      {
        entityType: "invoice",
        databaseIdParam: "invoiceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.invoice),
        required: false
      }
    ],
    titleProperty: "Credit Note ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.creditNotes.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.credit_note.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeCreditNoteToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer,
        dependencyPageIds.invoice
      );
    }
  },

  dispute: {
    entityType: "dispute",
    stripeExpansions: ["charge", "charge.payment_intent"],
    dependencies: [
      {
        entityType: "charge",
        databaseIdParam: "chargeDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.charge),
        required: false
      },
      {
        entityType: "payment_intent",
        databaseIdParam: "paymentIntentDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.charge?.payment_intent),
        required: false
      }
    ],
    titleProperty: "Dispute ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.disputes.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.dispute.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeDisputeToNotionProperties(
        expandedEntity,
        dependencyPageIds.charge,
        dependencyPageIds.payment_intent
      );
    }
  },

  invoiceitem: {
    entityType: "invoiceitem",
    stripeExpansions: [
      "customer",
      "invoice", 
      "subscription",
      "price",
      "price.product",
      "discounts"
    ],
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      },
      {
        entityType: "invoice",
        databaseIdParam: "invoiceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.invoice),
        required: false
      },
      {
        entityType: "price",
        databaseIdParam: "priceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.price),
        required: false
      }
    ],
    titleProperty: "Invoice Item ID",
    retrieveFromStripe: async (context: HandlerContext, stripeId: string) => {
      return await context.stripe.invoiceItems.retrieve(
        stripeId,
        { expand: ENTITY_REGISTRY.invoiceitem.stripeExpansions },
        { stripeAccount: context.stripeAccountId }
      );
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeInvoiceItemToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer,
        dependencyPageIds.invoice,
        dependencyPageIds.price
      );
    }
  },

  discount: {
    entityType: "discount",
    stripeExpansions: [], // Discounts are typically passed as objects, not retrieved
    dependencies: [
      {
        entityType: "customer",
        databaseIdParam: "customerDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.customer),
        required: false
      },
      {
        entityType: "coupon", 
        databaseIdParam: "couponDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.coupon),
        required: false
      },
      {
        entityType: "promotion_code",
        databaseIdParam: "promotionCodeDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.promotion_code),
        required: false
      },
      {
        entityType: "subscription",
        databaseIdParam: "subscriptionDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.subscription),
        required: false
      },
      {
        entityType: "invoice",
        databaseIdParam: "invoiceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.invoice),
        required: false
      },
      {
        entityType: "invoiceitem",
        databaseIdParam: "invoiceItemDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.invoice_item),
        required: false
      }
    ],
    titleProperty: "Discount ID",
    retrieveFromStripe: async (_context: HandlerContext, _stripeId: string) => {
      // Discounts are typically embedded in other objects, not retrieved directly
      throw new Error("Discounts should be passed directly, not retrieved by ID");
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeDiscountToNotionProperties(
        expandedEntity,
        dependencyPageIds.customer || "",
        dependencyPageIds.coupon || "",
        dependencyPageIds.promotion_code || "",
        dependencyPageIds.subscription || "",
        dependencyPageIds.invoice || "",
        dependencyPageIds.invoiceitem || ""
      );
    }
  },

  line_item: {
    entityType: "line_item",
    stripeExpansions: [], // Line items are embedded in other objects, not retrieved
    dependencies: [
      {
        entityType: "invoice",
        databaseIdParam: "invoiceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.invoice),
        required: false
      },
      {
        entityType: "price",
        databaseIdParam: "priceDatabaseId",
        extractStripeId: (expandedEntity) => extractId(expandedEntity.pricing?.price_details?.price),
        required: false
      },
      {
        entityType: "subscription",
        databaseIdParam: "subscriptionDatabaseId",
        extractStripeId: (expandedEntity) => {
          // Extract subscription ID from parent details
          if (expandedEntity.parent?.type === "subscription_item_details") {
            return extractId(expandedEntity.parent.subscription_item_details?.subscription);
          } else if (expandedEntity.parent?.type === "invoice_item_details") {
            return extractId(expandedEntity.parent.invoice_item_details?.subscription);
          }
          return null;
        },
        required: false
      },
      {
        entityType: "subscription_item",
        databaseIdParam: "subscriptionItemDatabaseId",
        extractStripeId: (expandedEntity) => {
          // Extract subscription item ID from parent details
          if (expandedEntity.parent?.type === "subscription_item_details") {
            return extractId(expandedEntity.parent.subscription_item_details?.subscription_item);
          }
          return null;
        },
        required: false
      },
      {
        entityType: "invoiceitem",
        databaseIdParam: "invoiceItemDatabaseId",
        extractStripeId: (expandedEntity) => {
          // Extract invoice item ID from parent details
          if (expandedEntity.parent?.type === "invoice_item_details") {
            return extractId(expandedEntity.parent.invoice_item_details?.invoice_item);
          }
          return null;
        },
        required: false
      }
    ],
    titleProperty: "Line Item ID",
    retrieveFromStripe: async (_context: HandlerContext, _stripeId: string) => {
      // Line items are not retrieved by ID - they're embedded in invoices
      throw new Error("Line items should be passed directly, not retrieved by ID");
    },
    convertToNotionProperties: (expandedEntity, dependencyPageIds) => {
      return stripeInvoiceLineItemToNotionProperties(
        expandedEntity,
        dependencyPageIds.invoice,
        dependencyPageIds.price,
        dependencyPageIds.subscription,
        dependencyPageIds.subscription_item,
        dependencyPageIds.invoiceitem
      );
    }
  }
};