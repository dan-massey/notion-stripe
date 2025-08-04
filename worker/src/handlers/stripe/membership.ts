import type { AppContext, StripeMode } from "@/types";
import { ensureAccountDo } from "@/durable-objects/utils";
import type { AccountResponse } from "@/stripe-frontend-endpoints";
const checkoutLinks = {
  test: "https://buy.stripe.com/test_bJe9ASfRtdBXd6CeDbc3m00",
  live: "https://buy.stripe.com/8x2cN45cPapLfeK8eNc3m01",
  sandbox: "https://buy.stripe.com/test_bJe3cu7qoeFC6vY49J5kk00",
};



export const getMembership = async (c: AppContext) => {
  const mode = c.get("stripeMode");
  const stripeAccountId = c.get("stripeAccountId");
  const stripe = c.get("stripe");

  if (!stripeAccountId || !mode) {
    return c.json({ message: "Stripe account ID not found" }, 400);
  }

  const accountDo = await ensureAccountDo(c, stripeAccountId, mode);
  const accountData = await accountDo.getStatus();

  if (!accountData) {
    throw new Error("Account Data object not ensured!");
  }

  const buyLink = encodeURI(`${checkoutLinks[mode]}?client_reference_id=${stripeAccountId}`);
  let resp: AccountResponse = {
    checkoutUrl: `https://notion.sync-to-db.com/subscribe?subscribeURL=${buyLink}`,
    account: accountData
  };
  if (!accountData || !accountData.subscription?.stripeCustomerId) {
    return c.json(resp);
  }

  let url: string | undefined = undefined;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: accountData.subscription.stripeCustomerId,
    });
    url = session.url;
  } catch (e) {
    console.warn(`Error making billing portal URL: ${(e as Error).message}`);
  }

  resp = {
    ...resp,
    stripeMode: mode,
    stripeAccountId,
    stripeUserId: c.get("stripeUserId"),
    account: accountData,
    manageSubscriptionUrl: url,
  };

  return c.json(resp);
};

export const getMembershipStatus = async (c: AppContext) => {
  const stripeAccountId = c.get("stripeAccountId");
  const mode = c.get("stripeMode");
  if (!stripeAccountId) {
    return c.json({ message: "Stripe account ID not found" }, 400);
  }

  const membership = await ensureAccountDo(c, stripeAccountId, mode);
  const status = await membership.getStatus();

  return c.json({ status });
};
