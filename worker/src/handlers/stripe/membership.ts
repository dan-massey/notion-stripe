import type { AppContext, StripeMode } from "@/types";

const checkoutLinks = {
  test: "https://buy.stripe.com/test_bJe9ASfRtdBXd6CeDbc3m00",
  live: "",
  sandbox: "",
};

export type MembershipResponse = {
  checkoutUrl: string;
  stripeMode?: StripeMode;
  stripeAccountId?: string;
  stripeUserId?: string;
  membership?: {
    stripeSubscriptionStatus?: string | undefined;
    stripeCustomerId?: string | undefined;
    stripeSubscriptionId?: string | undefined;
    trialEnd?: number | null | undefined;
    cancelAt?: number | null | undefined;
    stripeAccountId: string;
    stripeMode: StripeMode;
  };
  manageSubscriptionUrl?: string;
};

export const getMembership = async (c: AppContext) => {
  const mode = c.get("stripeMode");
  const stripeAccountId = c.get("stripeAccountId");
  const stripe = c.get("stripe");

  if (!stripeAccountId || !mode) {
    return c.json({ message: "Stripe account ID not found" }, 400);
  }

  const id = c.env.MEMBERSHIP_DURABLE_OBJECT.idFromName(stripeAccountId);
  const membership = c.env.MEMBERSHIP_DURABLE_OBJECT.get(id);
  const membershipData = await membership.getStatus();

  let resp: MembershipResponse = {
    checkoutUrl: checkoutLinks[mode],
  };
  if (!membershipData || !membershipData.stripeCustomerId) {
    return c.json(resp);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: membershipData.stripeCustomerId,
  });

  resp = {
    ...resp,
    stripeMode: mode,
    stripeAccountId,
    stripeUserId: c.get("stripeUserId"),
    membership: membershipData,
    manageSubscriptionUrl: session.url,
  };

  return c.json(resp);
};


export const getMembershipStatus = async (c: AppContext) => {
  const stripeAccountId = c.get("stripeAccountId");
  if (!stripeAccountId) {
    return c.json({ message: "Stripe account ID not found" }, 400);
  }
  const id = c.env.MEMBERSHIP_DURABLE_OBJECT.idFromName(stripeAccountId);
  const membership = c.env.MEMBERSHIP_DURABLE_OBJECT.get(id);
  const status = await membership.getStatus();

  return c.json({ status });
};
