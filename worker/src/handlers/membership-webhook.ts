import { makeStripeClient } from "@/utils/stripe";
import { handleCheckoutComplete } from "@/utils/membership";
import type { Stripe } from "stripe";
import type { AppContext, StripeMode } from "@/types";

export const membershipWebhookHandler = async (c: AppContext) => {
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
};