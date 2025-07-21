import type { AppContext } from "@/types";
import type { Stripe } from "stripe";

export type HelloWorldResponse = {
  message: string;
  stripeMode: string | undefined;
  stripeAccountId: string | undefined;
  stripeUserId: string | undefined;
  stripeAccountCustomers: Stripe.Response<Stripe.ApiList<Stripe.Customer>>
};

export const helloWorldHandler = async (c: AppContext) => {
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
};