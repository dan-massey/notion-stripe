import { StripeMode } from "@/types";
import { Stripe } from "stripe";

export const getStripe = (env: CloudflareBindings, stripeMode: StripeMode) => {
  let secret: string = env.STRIPE_TEST_KEY;
  if (stripeMode === "live") {
    secret = env.STRIPE_LIVE_KEY;
  } else if (stripeMode === "sandbox") {
    secret = env.STRIPE_SANDBOX_KEY;
  }
  return new Stripe(secret, {
    typescript: true,
  });
};
