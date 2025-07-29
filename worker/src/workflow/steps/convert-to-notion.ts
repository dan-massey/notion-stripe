import { stripeCustomerToNotionProperties } from "@/converters/customer";
import { stripeChargeToNotionProperties } from "@/converters/charge";
import { stripeInvoiceToNotionProperties } from "@/converters/invoice";
import { stripeSubscriptionToNotionProperties } from "@/converters/subscription";
import { stripeCreditNoteToNotionProperties } from "@/converters/credit-note";
import { stripeDisputeToNotionProperties } from "@/converters/dispute";
import { stripeInvoiceItemToNotionProperties } from "@/converters/invoice-item";
import { stripePaymentIntentToNotionProperties } from "@/converters/payment-intent";
import { stripePriceToNotionProperties } from "@/converters/price";
import { stripeProductToNotionProperties } from "@/converters/product";
import { stripePromotionCodeToNotionProperties } from "@/converters/promotion-code";
import { findPageByTitle } from "@/utils/notion-api";
import type { SupportedEntity } from "@/types";
import type { StripeEntities, DatabaseIds } from "../types";
import { Stripe } from "stripe";

// Type guards
const isCustomer = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.Customer =>
  entityType === "customer";
const isCharge = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.Charge =>
  entityType === "charge";
const isInvoice = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.Invoice =>
  entityType === "invoice";
const isSubscription = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.Subscription => 
  entityType === "subscription";
const isCreditNote = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.CreditNote => 
  entityType === "credit_note";
const isDispute = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.Dispute =>
  entityType === "dispute";
const isInvoiceItem = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.InvoiceItem => 
  entityType === "invoiceitem";
const isPaymentIntent = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.PaymentIntent => 
  entityType === "payment_intent";
const isPrice = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.Price =>
  entityType === "price";
const isProduct = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.Product =>
  entityType === "product";
const isPromotionCode = (entity: StripeEntities, entityType: SupportedEntity): entity is Stripe.PromotionCode =>
  entityType === "promotion_code";

// Helper function to resolve related entity page IDs
async function resolveRelatedPageIds(
  notionToken: string,
  databaseIds: DatabaseIds,
  entity: StripeEntities
): Promise<{
  customerPageId: string | null;
  invoicePageId: string | null;
  chargePageId: string | null;
  paymentIntentPageId: string | null;
  productPageId: string | null;
  pricePageId: string | null;
}> {
  const results = {
    customerPageId: null as string | null,
    invoicePageId: null as string | null,
    chargePageId: null as string | null,
    paymentIntentPageId: null as string | null,
    productPageId: null as string | null,
    pricePageId: null as string | null,
  };

  // Resolve customer if present and database exists
  if ('customer' in entity && entity.customer && databaseIds.customerDatabaseId) {
    const customerId = typeof entity.customer === 'string' ? entity.customer : entity.customer.id;
    const customerPage = await findPageByTitle(
      notionToken,
      databaseIds.customerDatabaseId,
      "Customer ID",
      customerId
    );
    results.customerPageId = customerPage?.id || null;
  }

  // Resolve invoice if present and database exists
  if ('invoice' in entity && entity.invoice && databaseIds.invoiceDatabaseId) {
    const invoiceId = typeof entity.invoice === 'string' ? entity.invoice : entity.invoice.id;
    const invoicePage = await findPageByTitle(
      notionToken,
      databaseIds.invoiceDatabaseId,
      "Invoice ID",
      invoiceId as string
    );
    results.invoicePageId = invoicePage?.id || null;
  }

  // Resolve charge if present and database exists
  if ('charge' in entity && entity.charge && databaseIds.chargeDatabaseId) {
    const chargeId = typeof entity.charge === 'string' ? entity.charge : entity.charge.id;
    const chargePage = await findPageByTitle(
      notionToken,
      databaseIds.chargeDatabaseId,
      "Charge ID",
      chargeId
    );
    results.chargePageId = chargePage?.id || null;
  }

  // Resolve payment intent if present and database exists
  if ('payment_intent' in entity && entity.payment_intent && databaseIds.paymentIntentDatabaseId) {
    const paymentIntentId = typeof entity.payment_intent === 'string' ? entity.payment_intent : entity.payment_intent.id;
    const paymentIntentPage = await findPageByTitle(
      notionToken,
      databaseIds.paymentIntentDatabaseId,
      "Payment Intent ID",
      paymentIntentId
    );
    results.paymentIntentPageId = paymentIntentPage?.id || null;
  }

  // Resolve product if present and database exists
  if ('product' in entity && entity.product && databaseIds.productDatabaseId) {
    const productId = typeof entity.product === 'string' ? entity.product : entity.product.id;
    const productPage = await findPageByTitle(
      notionToken,
      databaseIds.productDatabaseId,
      "Product ID",
      productId
    );
    results.productPageId = productPage?.id || null;
  }

  return results;
}

export async function convertToNotionProperties(
  entityToBackfill: SupportedEntity,
  firstItem: StripeEntities,
  notionToken: string,
  databaseIds: DatabaseIds
): Promise<Record<string, any>> {
  // Resolve related page IDs first
  const relatedPageIds = await resolveRelatedPageIds(notionToken, databaseIds, firstItem);

  switch (entityToBackfill) {
    case "customer":
      if (isCustomer(firstItem, entityToBackfill))
        return stripeCustomerToNotionProperties(firstItem);
      throw new Error("Expected customer object");
      
    case "charge":
      if (isCharge(firstItem, entityToBackfill))
        return stripeChargeToNotionProperties(
          firstItem, 
          relatedPageIds.customerPageId, 
          relatedPageIds.paymentIntentPageId
        );
      throw new Error("Expected charge object");
      
    case "invoice":
      if (isInvoice(firstItem, entityToBackfill))
        return stripeInvoiceToNotionProperties(
          firstItem, 
          relatedPageIds.customerPageId, 
          relatedPageIds.chargePageId, 
          relatedPageIds.paymentIntentPageId
        );
      throw new Error("Expected invoice object");
      
    case "subscription":
      if (isSubscription(firstItem, entityToBackfill))
        return stripeSubscriptionToNotionProperties(
          firstItem, 
          relatedPageIds.customerPageId, 
          relatedPageIds.invoicePageId, 
          null, // primaryPriceNotionPageId - would need additional logic to resolve
          null  // primaryProductNotionPageId - would need additional logic to resolve
        );
      throw new Error("Expected subscription object");
      
    case "credit_note":
      if (isCreditNote(firstItem, entityToBackfill))
        return stripeCreditNoteToNotionProperties(
          firstItem, 
          relatedPageIds.customerPageId, 
          relatedPageIds.invoicePageId
        );
      throw new Error("Expected credit_note object");
      
    case "dispute":
      if (isDispute(firstItem, entityToBackfill))
        return stripeDisputeToNotionProperties(
          firstItem, 
          relatedPageIds.chargePageId, 
          relatedPageIds.paymentIntentPageId
        );
      throw new Error("Expected dispute object");
      
    case "invoiceitem":
      if (isInvoiceItem(firstItem, entityToBackfill))
        return stripeInvoiceItemToNotionProperties(
          firstItem, 
          relatedPageIds.customerPageId, 
          relatedPageIds.invoicePageId, 
          null // priceNotionPageId - would need additional logic to resolve
        );
      throw new Error("Expected invoiceitem object");
      
    case "payment_intent":
      if (isPaymentIntent(firstItem, entityToBackfill))
        return stripePaymentIntentToNotionProperties(
          firstItem, 
          relatedPageIds.customerPageId
        );
      throw new Error("Expected payment_intent object");
      
    case "price":
      if (isPrice(firstItem, entityToBackfill))
        return stripePriceToNotionProperties(
          firstItem, 
          relatedPageIds.productPageId
        );
      throw new Error("Expected price object");
      
    case "product":
      if (isProduct(firstItem, entityToBackfill))
        return stripeProductToNotionProperties(firstItem);
      throw new Error("Expected product object");
      
    case "promotion_code":
      if (isPromotionCode(firstItem, entityToBackfill))
        return stripePromotionCodeToNotionProperties(
          firstItem, 
          relatedPageIds.customerPageId
        );
      throw new Error("Expected promotion_code object");
      
    default:
      throw new Error(`Unsupported entity: ${entityToBackfill}`);
  }
}