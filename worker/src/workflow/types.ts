import type { StripeMode, SupportedEntity, BackfillTaskStatus } from "@/types";
import { Stripe } from "stripe";

export type StripeEntities =
  | Stripe.Customer
  | Stripe.PaymentIntent
  | Stripe.Charge
  | Stripe.Invoice
  | Stripe.CreditNote
  | Stripe.Dispute
  | Stripe.Product
  | Stripe.Price
  | Stripe.Subscription
  | Stripe.InvoiceItem
  | Stripe.PromotionCode;

export type WorkflowParams = {
  stripeAccountId: string;
  stripeMode: StripeMode;
  entitiesToBackfill: Array<SupportedEntity>;
  entityStatus: Record<SupportedEntity, BackfillTaskStatus>;
  entitiesProcessed: number;
};

export type DatabaseIds = {
  subscriptionDatabaseId?: string;
  customerDatabaseId?: string;
  chargeDatabaseId?: string;
  invoiceDatabaseId?: string;
  creditNoteDatabaseId?: string;
  disputeDatabaseId?: string;
  invoiceItemDatabaseId?: string;
  paymentIntentDatabaseId?: string;
  priceDatabaseId?: string;
  productDatabaseId?: string;
  promotionCodeDatabaseId?: string;
};