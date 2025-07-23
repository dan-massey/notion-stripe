import type { AppContext, StripeMode } from "@/types";
import { getMembershipDo } from "@/utils/do";
import type { MembershipResponse } from "@/stripe-frontend-endpoints";
const checkoutLinks = {
  test: "https://buy.stripe.com/test_bJe9ASfRtdBXd6CeDbc3m00",
  live: "",
  sandbox: "",
};



export const getMembership = async (c: AppContext) => {
  const mode = c.get("stripeMode");
  const stripeAccountId = c.get("stripeAccountId");
  const stripe = c.get("stripe");

  if (!stripeAccountId || !mode) {
    return c.json({ message: "Stripe account ID not found" }, 400);
  }

  const membership = getMembershipDo(c, stripeAccountId);
  const membershipData = await membership.getStatus();

  let resp: MembershipResponse = {
    checkoutUrl: `${checkoutLinks[mode]}?client_reference_id=${stripeAccountId}`,
    membership: membershipData
  };
  if (!membershipData || !membershipData.stripeCustomerId) {
    await membership.setUp({
      stripeAccountId: stripeAccountId,
      stripeMode: mode,
    });
    return c.json(resp);
  }

  console.log(membershipData);

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

  const membership = getMembershipDo(c, stripeAccountId);
  const status = await membership.getStatus();

  return c.json({ status });
};
