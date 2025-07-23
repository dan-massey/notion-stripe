import type { Stripe } from "stripe";
import type { MembershipDurableObject } from "@/membership-do";
import { StripeMode } from "@/types";

export const handleCheckoutComplete = async (
  stripe: Stripe,
  mode: StripeMode,
  membershipDO: DurableObjectNamespace<MembershipDurableObject>,
  event: Stripe.Event
) => {
  const session = event.data.object as Stripe.Checkout.Session;
  let customerId: string;
  if (typeof session.customer === "string") {
    customerId = session.customer;
  } else if (session.customer) {
    customerId = session.customer.id;
  } else {
    throw new Error("Customer ID not found");
  }

  let subscriptionId: string;
  let subscriptionStatus: string;
  let trialEnd: number | null;
  let cancelAt: number | null;

  if (typeof session.subscription === "string") {
    subscriptionId = session.subscription;
    const subObj = await stripe.subscriptions.retrieve(subscriptionId);
    subscriptionStatus = subObj.status;
    trialEnd = subObj.trial_end;
    cancelAt = subObj.cancel_at;
  } else if (session.subscription) {
    subscriptionId = session.subscription.id;
    subscriptionStatus = session.subscription.status;
    trialEnd = session.subscription.trial_end;
    cancelAt = session.subscription.cancel_at;
  } else {
    throw new Error("Subscription ID not found");
  }

  const stripeAccountId = session.client_reference_id;
  if (!stripeAccountId) {
    throw new Error("Stripe account ID not found.");
  }
  const id = membershipDO.idFromName(stripeAccountId);
  const membership = await membershipDO.get(id);

  await stripe.subscriptions.update(subscriptionId, {
    metadata: {
      stripeAccountId: session.client_reference_id,
    },
  });

  await membership.setUp({
    stripeAccountId: stripeAccountId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: subscriptionStatus,
    trialEnd: trialEnd,
    cancelAt: cancelAt,
    stripeMode: mode
  });
};
