import { createMiddleware } from "hono/factory";
import type { Env, StripeMode } from "@/types";
import { HTTPException } from "hono/http-exception";
import { validateStripeWebhookCall, validateStripeFrontendCall } from "@/utils/stripe";

export const stripeWebhookMiddleware = createMiddleware<Env>(
  async (c, next) => {
    const webhookMode = c.req.param("mode") as StripeMode;
    if (!webhookMode || !["test", "live", "sandbox"].includes(webhookMode)) {
      throw new HTTPException(400, { message: "Missing webhook mode" });
    }
    const sig = c.req.header("stripe-signature");
    if (!sig || sig === "") {
      return c.json({ message: "Stripe signature not found" }, 403);
    }

    const { stripe, event } = await validateStripeWebhookCall(
      c,
      webhookMode,
      sig
    );
    c.set("stripe", stripe);
    c.set("stripeEvent", event);
    await next();
  }
);

export const stripeFrontendMiddleware = createMiddleware<Env>(
  async (c, next) => {
    const sig = c.req.header("stripe-signature");
    if (!sig || sig === "") {
      throw new HTTPException(403, { message: "Stripe signature not found" });
    }
    const stripeAccountId: string = c.req.header("X-Stripe-Account-Id") || "";
    const stripeUserId: string = c.req.header("X-Stripe-User-Id") || "";
    const mode = c.req.header("X-Stripe-Mode") as  "live" | "test";
    const isSandbox = c.req.header("X-Stripe-Is-Sandbox") === "true";

    const { stripe, stripeMode } = await validateStripeFrontendCall(
      c,
      mode,
      isSandbox,
      stripeAccountId,
      stripeUserId,
      sig
    );

    c.set("stripe", stripe);
    c.set("stripeAccountId", stripeAccountId);
    c.set("stripeUserId", stripeUserId);
    c.set("stripeMode", stripeMode);

    await next();
  }
);
