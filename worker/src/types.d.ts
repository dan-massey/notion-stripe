import type { Notion } from "arctic";
import type { Stripe } from "stripe";
import type { Context as HonoContext } from "hono";

export type StripeMode = "test" | "live" | "sandbox";
export type Env = {
  Bindings: CloudflareBindings;
  Variables: {
    notionAuth: Notion;
    stripe: Stripe;
  } & (
    | { stripeEvent: Stripe.Event; stripeAccountId?: never; stripeUserId?: never, stripeMode?: never }
    | { stripeEvent?: never; stripeAccountId: string; stripeUserId: string, stripeMode: StripeMode }
  );
};

export type AppContext = HonoContext<Env>;
