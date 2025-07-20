import { makeStripeClient } from "@/utils/stripe";
import { createFactory } from "hono/factory";
import { handleCheckoutComplete } from "@/utils/membership";
import type { Stripe } from "stripe";
import type { Env, StripeMode } from "@/types";

const factory = createFactory<Env>();

const checkoutLinks = {
  test: "https://buy.stripe.com/test_bJe9ASfRtdBXd6CeDbc3m00",
  live: "",
  sandbox: "",
};

export const membershipWebhookHandler = factory.createHandlers(async (c) => {
  const mode = c.req.query("mode") as StripeMode;
  const stripe = makeStripeClient(c, mode);
  const event = (await c.req.json()) as Stripe.Event;

  if (!event) {
    return c.json({ message: "No event provided" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutComplete(
      stripe,
      mode,
      c.env.MEMBERSHIP_DURABLE_OBJECT,
      event
    );
    return c.json({ received: true });
  }

  if (!event.type.startsWith("customer.subscription")) {
    return c.json({ received: true });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const stripeAccountId: string = subscription.metadata.stripeAccountId;
  const subscriptionStatus: string = subscription.status;

  const id = c.env.MEMBERSHIP_DURABLE_OBJECT.idFromName(stripeAccountId);
  const membership = c.env.MEMBERSHIP_DURABLE_OBJECT.get(id);

  console.log("Updating membership status for userId:", stripeAccountId);
  console.log("Subscription status:", subscriptionStatus);
  console.log("Subscription trial end:", subscription.trial_end);
  console.log("Subscription cancel at:", subscription.cancel_at);

  await membership.setStatus({
    stripeSubscriptionStatus: subscriptionStatus,
    trialEnd: subscription.trial_end,
    cancelAt: subscription.cancel_at,
  });

  return c.json({ received: true });
});

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

export const getMembership = factory.createHandlers(async (c) => {
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
});
