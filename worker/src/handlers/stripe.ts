import type { Env } from "@/types";
import { createFactory } from "hono/factory";
import type { Stripe } from "stripe";

const factory = createFactory<Env>();

export type HelloWorldResponse = {
  message: string;
  stripeMode: string | undefined;
  stripeAccountId: string | undefined;
  stripeUserId: string | undefined;
  stripeAccountCustomers: Stripe.Response<Stripe.ApiList<Stripe.Customer>>
};

export const stripeFrontendHandler = factory.createHandlers(async (c) => {
  const stripe = c.get("stripe");
  const stripeAccountCustomers = await stripe.customers.list(
    {},
    {
      stripeAccount: c.get("stripeAccountId"),
    }
  );
  const resp: HelloWorldResponse = {
    message: "Hello World",
    stripeMode: c.get("stripeMode"),
    stripeAccountId: c.get("stripeAccountId"),
    stripeUserId: c.get("stripeUserId"),
    stripeAccountCustomers,
  };
  return c.json(resp);
});

export const stripeWebhookHandler = factory.createHandlers(async (c) => {
  return c.json({ message: "Event received" });
});

export const getMembershipStatus = factory.createHandlers(async (c) => {
  const stripeAccountId = c.get("stripeAccountId");
  if (!stripeAccountId) {
    return c.json({ message: "Stripe account ID not found" }, 400);
  }
  const id = c.env.MEMBERSHIP_DURABLE_OBJECT.idFromName(stripeAccountId);
  const membership = c.env.MEMBERSHIP_DURABLE_OBJECT.get(id);
  const status = await membership.getStatus();

  return c.json({ status });
});
