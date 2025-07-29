import { AccountDurableObject } from "@/account-do";
import type { DatabaseIds } from "../types";

export async function getDatabaseIds(
  accountDurableObject: DurableObjectNamespace<AccountDurableObject>,
  stripeAccountId: string
): Promise<DatabaseIds> {
  const id = accountDurableObject.idFromName(stripeAccountId);
  const membershipDo = accountDurableObject.get(id);
  const info = await membershipDo.getStatus();

  return {
    subscriptionDatabaseId:
      info?.notionConnection?.databases?.subscription.pageId,
    customerDatabaseId: info?.notionConnection?.databases?.customer.pageId,
    chargeDatabaseId: info?.notionConnection?.databases?.charge.pageId,
    invoiceDatabaseId: info?.notionConnection?.databases?.invoice.pageId ,
    creditNoteDatabaseId:
      info?.notionConnection?.databases?.credit_note.pageId,
    disputeDatabaseId: info?.notionConnection?.databases?.dispute.pageId,
    invoiceItemDatabaseId:
      info?.notionConnection?.databases?.invoiceitem.pageId,
    paymentIntentDatabaseId:
      info?.notionConnection?.databases?.payment_intent.pageId,
    priceDatabaseId: info?.notionConnection?.databases?.price.pageId,
    productDatabaseId: info?.notionConnection?.databases?.product.pageId,
    promotionCodeDatabaseId:
      info?.notionConnection?.databases?.promotion_code.pageId,
  };
}