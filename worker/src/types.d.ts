import type { Notion } from "arctic";
import type { Stripe } from "stripe";
import type { Context as HonoContext } from "hono";

export type StripeMode = "test" | "live" | "sandbox";
export type Env = {
  Bindings: CloudflareBindings;
  Variables: {
    notionAuth: Notion;
    stripe: Stripe;
  } & (
    | {
        stripeEvent: Stripe.Event;
        stripeAccountId?: never;
        stripeUserId?: never;
        stripeMode?: never;
      }
    | {
        stripeEvent?: never;
        stripeAccountId: string;
        stripeUserId: string;
        stripeMode: StripeMode;
      }
  );
};

export type AppContext = HonoContext<Env>;

// Invoice line items are never going to arrive as webhook events,
// but they are going to be stored in the database.

export type DatabaseEntities = [
  "customer",
  "invoice",
  "charge",
  "subscription",
  "credit_note",
  "dispute",
  "invoiceitem",
  "subscription_item",
  "price",
  "product",
  "coupon",
  "promotion_code",
  "discount",
  "payment_intent",
  "line_item"
];

export type DatabaseEntity = DatabaseEntities[number];

export type StripeApiObjectKinds = [
  "customer",
  "invoice",
  "charge",
  "subscription",
  "credit_note",
  "dispute",
  "invoiceitem",
  "price",
  "product",
  "coupon",
  "promotion_code",
  "payment_intent",
  "subscription_item"
];

export type StripeApiObject = StripeApiObjectKinds[number];

export type ApiStripeObject =
  | Stripe.Customer
  | Stripe.Charge
  | Stripe.CreditNote
  | Stripe.Dispute
  | Stripe.InvoiceItem
  | Stripe.SubscriptionItem
  | Stripe.Invoice
  | Stripe.PaymentIntent
  | Stripe.Price
  | Stripe.Product
  | Stripe.PromotionCode
  | Stripe.Coupon
  | Stripe.Subscription;

export type DatabaseStripeObject = ApiStripeObject | Stripe.InvoiceLineItem | Stripe.Discount;

export type BackfillWorkflowStatus = {
  startedAt: number;
  status: "started" | "complete";
  recordsProcessed: number;
  finishedAt?: number;
  currentEntity?: SupportedEntity;
};

export type BackfillTaskStatus = {
  started: boolean;
  completed: boolean;
  startingAfter: string | undefined;
};
