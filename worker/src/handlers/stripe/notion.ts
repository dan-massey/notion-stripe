import type { AppContext } from "@/types";
import { getNotionToken, deleteNotionToken } from "@/utils/stripe";
import {
  searchNotion,
  createDatabase,
  type SearchParameters,
  revokeToken,
} from "@/utils/notion";
import { customerSchema } from "@/schemas/customer";
import { getChargeSchema } from "@/schemas/charge";
import { getInvoiceSchema } from "@/schemas/invoice";
import { getSubscriptionSchema } from "@/schemas/subscription";
import { ensureMembershipDo } from "@/utils/do";

export const getNotionLink = async (c: AppContext) => {
  const notionAuthLink = `${c.env.BASE_URL}/auth/signin?account_id=${c.get(
    "stripeAccountId"
  )}&mode=${c.get("stripeMode")}`;
  return c.json({ url: notionAuthLink });
};

export const deleteNotionAuth = async (c: AppContext) => {
  const stripeAccountId = c.get("stripeAccountId");
  if (!stripeAccountId) {
    return c.json({ error: "Stripe account ID not found" }, 400);
  }
  const membership = await ensureMembershipDo(
    c,
    stripeAccountId,
    c.get("stripeMode")
  );
  await membership.setNotionPages({
    stripeAccountId: stripeAccountId,
    stripeMode: c.get("stripeMode") || "test",
    chargeDatabaseId: null,
    customerDatabaseId: null,
    invoiceDatabaseId: null,
    parentPageId: null,
    subscriptionDatabaseId: null,
  });

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

  return c.json({ message: "Notion auth deleted" });
};

export type DatabaseClearResponse = {
  chargeDatabaseId: null;
  customerDatabaseId: null;
  invoiceDatabaseId: null;
  subscriptionDatabaseId: null;
  parentPageId: null;
};

export const clearDatabaseLinks = async (c: AppContext) => {
  const stripeAccountId = c.get("stripeAccountId");
  if (!stripeAccountId) {
    return c.json({ error: "Stripe account ID not found" }, 400);
  }
  const membership = await ensureMembershipDo(
    c,
    stripeAccountId,
    c.get("stripeMode")
  );
  await membership.clearNotionPages();

  const resp: DatabaseClearResponse = {
    chargeDatabaseId: null,
    customerDatabaseId: null,
    invoiceDatabaseId: null,
    subscriptionDatabaseId: null,
    parentPageId: null,
  };
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

export type DatabaseSetupResponse = {
  chargeDatabaseId: string;
  customerDatabaseId: string;
  invoiceDatabaseId: string;
  subscriptionDatabaseId: string;
  parentPageId: string;
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
    "Stripe Customers",
    customerSchema
  );
  const chargesDb = await createDatabase(
    notionToken,
    parentPageId,
    "Stripe Charges",
    getChargeSchema(customersDb.id)
  );
  const invoicesDb = await createDatabase(
    notionToken,
    parentPageId,
    "Stripe Invoices",
    getInvoiceSchema(customersDb.id)
  );

  const subscriptionDb = await createDatabase(
    notionToken,
    parentPageId,
    "Stripe Subscriptions",
    getSubscriptionSchema(customersDb.id, invoicesDb.id)
  );

  const membership = await ensureMembershipDo(
    c,
    stripeAccountId,
    c.get("stripeMode")
  );

  const resp: DatabaseSetupResponse = {
    chargeDatabaseId: chargesDb.id,
    customerDatabaseId: customersDb.id,
    invoiceDatabaseId: invoicesDb.id,
    parentPageId: parentPageId,
    subscriptionDatabaseId: subscriptionDb.id,
  };

  console.log("trying to set notion pages");
  console.log("stripeMode", c.get("stripeMode"));
  console.log({
    stripeAccountId: stripeAccountId,
    stripeMode: c.get("stripeMode") || "test",
    ...resp,
  })

  await membership.setNotionPages({
    stripeAccountId: stripeAccountId,
    stripeMode: c.get("stripeMode") || "test",
    ...resp,
  });

  console.log(await membership.getStatus());

  return c.json(resp);
};
