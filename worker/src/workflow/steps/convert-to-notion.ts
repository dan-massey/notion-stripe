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
import type { SupportedEntity } from "@/types";
import type { StripeEntities, DatabaseIds } from "../types";
import type { StripeEntityCoordinator, RelatedEntityIds } from "@/stripe-entity-coordinator";
import { upsertPageByTitle } from "@/utils/notion-api";
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

// Helper function to resolve related entity page IDs with creation of missing Notion pages
async function resolveRelatedPageIds(
  notionToken: string,
  databaseIds: DatabaseIds,
  entity: StripeEntities,
  stripeAccountId: string,
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>,
  stripe: Stripe
): Promise<RelatedEntityIds> {
  // Get coordinator instance
  const doId = coordinatorNamespace.idFromName(stripeAccountId);
  const coordinator = coordinatorNamespace.get(doId);

  // Start with basic resolution (read-only)
  const results = await coordinator.resolveRelatedEntityIds(notionToken, databaseIds, entity);

  // For any missing relationships, create the Notion pages using coordinator directly
  if (!results.customerPageId && 'customer' in entity && entity.customer && databaseIds.customerDatabaseId) {
    const customerId = typeof entity.customer === 'string' ? entity.customer : entity.customer.id;
    if (customerId) {
      try {
        const mapping = await coordinator.coordinatedUpsert({
          entityType: 'customer',
          stripeId: customerId,
          notionToken,
          databaseId: databaseIds.customerDatabaseId,
          titleProperty: 'Customer ID',
          forceUpdate: false, // Use cache-first for related entities
          upsertOperation: async () => {
            const customer = await stripe.customers.retrieve(customerId, {
              expand: ['subscriptions', 'sources', 'invoice_settings.default_payment_method', 'default_source']
            }, { stripeAccount: stripeAccountId });
            
            if (customer.deleted) {
              throw new Error(`Customer ${customerId} is deleted`);
            }
            
            const properties = stripeCustomerToNotionProperties(customer as import("stripe").Stripe.Customer);
            return await upsertPageByTitle(notionToken, databaseIds.customerDatabaseId!, "Customer ID", customer.id, properties);
          }
        });
        results.customerPageId = mapping.notionPageId;
      } catch (error) {
        console.warn(`Failed to create customer Notion page for ${customerId}:`, error);
      }
    }
  }

  if (!results.productPageId && 'product' in entity && entity.product && databaseIds.productDatabaseId) {
    const productId = typeof entity.product === 'string' ? entity.product : entity.product.id;
    if (productId) {
      try {
        const mapping = await coordinator.coordinatedUpsert({
          entityType: 'product',
          stripeId: productId,
          notionToken,
          databaseId: databaseIds.productDatabaseId,
          titleProperty: 'Product ID',
          forceUpdate: false, // Use cache-first for related entities
          upsertOperation: async () => {
            const product = await stripe.products.retrieve(productId, {}, { stripeAccount: stripeAccountId });
            const properties = stripeProductToNotionProperties(product);
            return await upsertPageByTitle(notionToken, databaseIds.productDatabaseId!, "Product ID", product.id, properties);
          }
        });
        results.productPageId = mapping.notionPageId;
      } catch (error) {
        console.warn(`Failed to create product Notion page for ${productId}:`, error);
      }
    }
  }

  return results;
}

export async function convertToNotionProperties(
  entityToBackfill: SupportedEntity,
  firstItem: StripeEntities,
  notionToken: string,
  databaseIds: DatabaseIds,
  stripeAccountId: string,
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>,
  stripe: Stripe
): Promise<Record<string, any>> {
  // Resolve related page IDs first, creating missing Notion pages as needed
  const relatedPageIds = await resolveRelatedPageIds(
    notionToken, 
    databaseIds, 
    firstItem, 
    stripeAccountId, 
    coordinatorNamespace,
    stripe
  );

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