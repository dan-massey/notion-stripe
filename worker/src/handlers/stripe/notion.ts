import type { AppContext } from "@/types";
import type {
  AccountDurableObject,
  AccountStatus,
} from "@/durable-objects/account-do";
import { getNotionToken, deleteNotionToken } from "@/utils/stripe";
import {
  searchNotion,
  createDatabase,
  type SearchParameters,
  revokeToken,
  introspectToken,
  type OauthIntrospectResponse,
} from "@/utils/notion-api";
import { customerSchema } from "@/schemas/customer";
import { getChargeSchema } from "@/schemas/charge";
import { getInvoiceSchema } from "@/schemas/invoice";
import { getSubscriptionSchema } from "@/schemas/subscription";
import { getSubscriptionItemSchema } from "@/schemas/subscription-item";
import { ensureAccountDo } from "@/durable-objects/utils";
import { getCreditNoteSchema } from "@/schemas/credit-note";
import { getDisputeSchema } from "@/schemas/dispute";
import { getInvoiceItemSchema } from "@/schemas/invoice-item";
import { getPriceSchema } from "@/schemas/price";
import { productSchema } from "@/schemas/product";
import { getInvoiceLineItemSchema } from "@/schemas/invoice-line-item";
import { getPromotionCodeSchema } from "@/schemas/promotion-code";
import { getPaymentIntentSchema } from "@/schemas/payment-intent";
import { getCouponSchema } from "@/schemas/coupon";
import { getDiscountSchema } from "@/schemas/discount";
import { getCoordinator } from "@/upload-coordinator/utils";

export const getNotionLink = async (c: AppContext) => {
  const notionAuthLink = `${c.env.BASE_URL}/auth/signin?account_id=${c.get(
    "stripeAccountId"
  )}&mode=${c.get("stripeMode")}`;
  return c.json({ url: notionAuthLink });
};

const resetNotionConnection = async (
  c: AppContext,
  stripeAccountId: string,
  accountDo: DurableObjectStub<AccountDurableObject>
) => {
  await accountDo.clearNotionPages();

  const coordinator = getCoordinator({ env: c.env }, stripeAccountId);
  await coordinator.clearAllMappings();

  try {
    const token = await getNotionToken(c, stripeAccountId);
    !!token &&
      (await revokeToken(
        c.env.NOTION_OAUTH_CLIENT_ID,
        c.env.NOTION_OAUTH_CLIENT_SECRET,
        token
      ));
  } catch (error) {
    console.error("Error deleting Notion token:", error);
  }
  await deleteNotionToken(c);
};

export const deleteNotionAuth = async (c: AppContext) => {
  const stripeAccountId = c.get("stripeAccountId");
  if (!stripeAccountId) {
    return c.json({ error: "Stripe account ID not found" }, 400);
  }
  const accountDo = await ensureAccountDo(
    c,
    stripeAccountId,
    c.get("stripeMode")
  );
  resetNotionConnection(c, stripeAccountId, accountDo);
  let resp: AccountStatus | null = await accountDo.getStatus();

  if (!resp) {
    return c.json({ error: "Failed to get account status" }, 500);
  }

  return c.json(resp);
};

export const validateAuth = async (c: AppContext) => {
  const stripeAccountId = c.get("stripeAccountId");
  if (!stripeAccountId) {
    return c.json({ error: "Stripe account ID not found" }, 400);
  }
  let token: string | null | undefined;
  let isAuthed: boolean = false;
  try {
    token = await getNotionToken(c, stripeAccountId);
    console.log("[Validate Auth]: Retrieved Notion Token");
  } catch (error) {
    console.error("Error deleting Notion token:", error);
  }

  if (token) {
    try {
      const tokenResp = await introspectToken(
        c.env.NOTION_OAUTH_CLIENT_ID,
        c.env.NOTION_OAUTH_CLIENT_SECRET,
        token
      );
      const body = (await tokenResp.json()) as OauthIntrospectResponse;
      if (tokenResp.status === 200 && body.active === true) {
        isAuthed = true;
        console.log("[Validate Auth]: Validated Notion Token");
      }
    } catch (e) {
      // Don't do anything with the error.
    }
  }

  if (!isAuthed) {
    const accountDo = await ensureAccountDo(
      c,
      stripeAccountId,
      c.get("stripeMode")
    );
    await resetNotionConnection(c, stripeAccountId, accountDo);
  }
  return c.json({ authed: isAuthed });
};

export const clearDatabaseLinks = async (c: AppContext) => {
  const stripeAccountId = c.get("stripeAccountId");
  if (!stripeAccountId) {
    return c.json({ error: "Stripe account ID not found" }, 400);
  }
  const accountDo = await ensureAccountDo(
    c,
    stripeAccountId,
    c.get("stripeMode")
  );

  await accountDo.clearNotionPages();
  const coordinator = getCoordinator({ env: c.env }, stripeAccountId);
  await coordinator.clearAllMappings();

  const resp: AccountStatus | null = await accountDo.getStatus();
  if (!resp) {
    return c.json({ error: "Failed to get account status" }, 500);
  }
  return c.json(resp);
};

export const getNotionPages = async (c: AppContext) => {
  const token = await getNotionToken(c, c.get("stripeAccountId") || "");
  if (!token) {
    return c.json({ error: "Notion auth token not found" }, 404);
  }
  const cursor = c.req.query("nextCursor");
  const searchValue = c.req.query("searchValue");

  try {
    const body: SearchParameters = {
      filter: {
        property: "object",
        value: "page",
      },
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
      page_size: 5,
    };

    if (cursor) {
      body.start_cursor = cursor;
    }

    if (searchValue) {
      body.query = searchValue;
    }

    const data = await searchNotion(token, body);

    return c.json(data);
  } catch (error) {
    console.error("Error fetching Notion pages:", error);
    return c.json({ error: "Failed to fetch pages" }, 500);
  }
};

export const setUpDatabases = async (c: AppContext) => {
  const notionToken = await getNotionToken(c, c.get("stripeAccountId") || "");
  const stripeAccountId = c.get("stripeAccountId");
  if (!notionToken) {
    return c.json({ error: "Notion auth token not found" }, 404);
  }
  if (!stripeAccountId) {
    return c.json({ error: "Stripe account ID not found" }, 400);
  }

  const parentPageId = (await c.req.json()).parentPageId;

  const customersDb = await createDatabase(
    notionToken,
    parentPageId,
    "Customers",
    customerSchema
  );

  const paymentIntentDb = await createDatabase(
    notionToken,
    parentPageId,
    "Payments",
    getPaymentIntentSchema(customersDb.id)
  );

  const chargesDb = await createDatabase(
    notionToken,
    parentPageId,
    "Charges",
    getChargeSchema(customersDb.id, paymentIntentDb.id)
  );

  const invoicesDb = await createDatabase(
    notionToken,
    parentPageId,
    "Invoices",
    getInvoiceSchema(customersDb.id, chargesDb.id, paymentIntentDb.id)
  );

  const creditNoteDb = await createDatabase(
    notionToken,
    parentPageId,
    "Credit Notes",
    getCreditNoteSchema(customersDb.id, invoicesDb.id)
  );

  const disputeDb = await createDatabase(
    notionToken,
    parentPageId,
    "Disputes",
    getDisputeSchema(chargesDb.id, paymentIntentDb.id)
  );

  const productDb = await createDatabase(
    notionToken,
    parentPageId,
    "Products",
    productSchema
  );

  const priceDb = await createDatabase(
    notionToken,
    parentPageId,
    "Prices",
    getPriceSchema(productDb.id)
  );

  const subscriptionDb = await createDatabase(
    notionToken,
    parentPageId,
    "Subscriptions",
    getSubscriptionSchema(
      customersDb.id,
      invoicesDb.id,
      priceDb.id,
      productDb.id
    )
  );

  const subscriptionItemDb = await createDatabase(
    notionToken,
    parentPageId,
    "Subscription Items",
    getSubscriptionItemSchema(subscriptionDb.id, priceDb.id, productDb.id)
  );

  const invoiceItemDb = await createDatabase(
    notionToken,
    parentPageId,
    "Invoice Items",
    getInvoiceItemSchema(
      customersDb.id,
      invoicesDb.id,
      priceDb.id,
      subscriptionDb.id,
      subscriptionItemDb.id
    )
  );

  const invoiceLineItemDb = await createDatabase(
    notionToken,
    parentPageId,
    "Invoice Line Items",
    getInvoiceLineItemSchema(
      invoicesDb.id,
      priceDb.id,
      subscriptionDb.id,
      subscriptionItemDb.id,
      invoiceItemDb.id
    )
  );

  const couponsDb = await createDatabase(
    notionToken,
    parentPageId,
    "Coupons",
    getCouponSchema(productDb.id)
  );

  const promotionCodeDb = await createDatabase(
    notionToken,
    parentPageId,
    "Promotion Codes",
    getPromotionCodeSchema(customersDb.id, couponsDb.id)
  );

  const discountDb = await createDatabase(
    notionToken,
    parentPageId,
    "Discounts",
    getDiscountSchema(
      customersDb.id,
      subscriptionDb.id,
      invoicesDb.id,
      invoiceItemDb.id,
      promotionCodeDb.id,
      couponsDb.id
    )
  );

  const accountDo = await ensureAccountDo(
    c,
    stripeAccountId,
    c.get("stripeMode")
  );

  await accountDo.setNotionPages({
    stripeAccountId: stripeAccountId,
    stripeMode: c.get("stripeMode") || "test",
    parentPageId: parentPageId,
    databases: {
      customer: { pageId: customersDb.id, title: "Customers" },
      charge: { pageId: chargesDb.id, title: "Charges" },
      credit_note: { pageId: creditNoteDb.id, title: "Credit Notes" },
      dispute: { pageId: disputeDb.id, title: "Disputes" },
      invoice: { pageId: invoicesDb.id, title: "Invoices" },
      invoiceitem: { pageId: invoiceItemDb.id, title: "Invoice Items" },
      line_item: { pageId: invoiceLineItemDb.id, title: "Invoice Line Items" },
      price: { pageId: priceDb.id, title: "Prices" },
      product: { pageId: productDb.id, title: "Products" },
      promotion_code: { pageId: promotionCodeDb.id, title: "Promotion Codes" },
      subscription: { pageId: subscriptionDb.id, title: "Subscriptions" },
      subscription_item: {
        pageId: subscriptionItemDb.id,
        title: "Subscription Items",
      },
      payment_intent: { pageId: paymentIntentDb.id, title: "Payments" },
      discount: { pageId: discountDb.id, title: "Discounts" },
      coupon: { pageId: couponsDb.id, title: "Coupons" },
    },
  });

  const updatedAccountInfo: AccountStatus | null = await accountDo.getStatus();
  if (!updatedAccountInfo) {
    return c.json({ error: "Failed to get account status" }, 500);
  }
  return c.json(updatedAccountInfo);
};
