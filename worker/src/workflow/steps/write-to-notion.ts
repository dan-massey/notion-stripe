import { upsertPageByTitle } from "@/utils/notion-api";
import type { SupportedEntity } from "@/types";
import type { DatabaseIds } from "../types";

export async function writeToNotion(
  entityToBackfill: SupportedEntity,
  notionToken: string,
  databaseIds: DatabaseIds,
  obj: any,
  notionProperties: Record<string, any>
): Promise<void> {
  if (!notionProperties || !obj.id) {
    return;
  }

  switch (entityToBackfill) {
    case "customer":
      if (databaseIds.customerDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.customerDatabaseId,
          "Customer ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "charge":
      if (databaseIds.chargeDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.chargeDatabaseId,
          "Charge ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "invoice":
      if (databaseIds.invoiceDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.invoiceDatabaseId,
          "Invoice ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "subscription":
      if (databaseIds.subscriptionDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.subscriptionDatabaseId,
          "Subscription ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "credit_note":
      if (databaseIds.creditNoteDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.creditNoteDatabaseId,
          "Credit Note ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "dispute":
      if (databaseIds.disputeDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.disputeDatabaseId,
          "Dispute ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "invoiceitem":
      if (databaseIds.invoiceItemDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.invoiceItemDatabaseId,
          "Invoice Item ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "payment_intent":
      if (databaseIds.paymentIntentDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.paymentIntentDatabaseId,
          "Payment Intent ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "price":
      if (databaseIds.priceDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.priceDatabaseId,
          "Price ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "product":
      if (databaseIds.productDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.productDatabaseId,
          "Product ID",
          obj.id,
          notionProperties
        );
      }
      break;
    case "promotion_code":
      if (databaseIds.promotionCodeDatabaseId) {
        await upsertPageByTitle(
          notionToken,
          databaseIds.promotionCodeDatabaseId,
          "Promotion Code ID",
          obj.id,
          notionProperties
        );
      }
      break;
    default:
      throw new Error(`Unsupported entity: ${entityToBackfill}`);
  }
}