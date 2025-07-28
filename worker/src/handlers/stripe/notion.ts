import type { AppContext } from "@/types";
import type { AccountDurableObject, AccountStatus } from "@/account-do";
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
import { ensureAccountDo } from "@/utils/do";

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
  await accountDo.setNotionPages({
    stripeAccountId: stripeAccountId,
    stripeMode: c.get("stripeMode") || "test",
    chargeDatabaseId: null,
    customerDatabaseId: null,
    invoiceDatabaseId: null,
    parentPageId: null,
    subscriptionDatabaseId: null,
  });
  await accountDo.clearErrors();

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
  await accountDo.clearErrors();
  await accountDo.clearNotionPages();

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

  const accountDo = await ensureAccountDo(
    c,
    stripeAccountId,
    c.get("stripeMode")
  );

  const resp = {
    chargeDatabaseId: chargesDb.id,
    customerDatabaseId: customersDb.id,
    invoiceDatabaseId: invoicesDb.id,
    parentPageId: parentPageId,
    subscriptionDatabaseId: subscriptionDb.id,
  };

  await accountDo.setNotionPages({
    stripeAccountId: stripeAccountId,
    stripeMode: c.get("stripeMode") || "test",
    ...resp,
  });

  const updatedAccountInfo: AccountStatus | null = await accountDo.getStatus();
  if (!updatedAccountInfo) {
    return c.json({ error: "Failed to get account status" }, 500);
  }
  return c.json(updatedAccountInfo);
};
