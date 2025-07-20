import { Hono } from "hono";
import type { Env } from "@/types";
import { secureHeaders } from "hono/secure-headers";

import { createAuthLink, notionAuthCallback } from "@/handlers/notion";
import { stripeFrontendHandler, stripeWebhookHandler } from "@/handlers/stripe";
import { ENDPOINTS } from "./stripe-frontend-endpoints";

import { configuredCors } from "@/middleware/cors";
import { notionMiddleware } from "@/middleware/notion";
import {
  stripeFrontendMiddleware,
  stripeWebhookMiddleware,
} from "@/middleware/stripe";
import { membershipWebhookHandler, getMembership } from "@/handlers/membership";

const app = new Hono<Env>();

app.use("*", configuredCors);
app.use(secureHeaders());
app.use("/*", notionMiddleware);

app.get("/auth/notion", ...createAuthLink);
app.get("/auth/callback", ...notionAuthCallback);
app.get("/message", (c) => {
    return c.text(`Hello Hono! Notion OAuth client ready`);
  });

  // Stripe frontend API endpoints:
  // The content-security-policy in the Stripe App can only make requests that start with /stripe
app.post(ENDPOINTS.membership.path, stripeFrontendMiddleware, ...getMembership);
app.post(
    ENDPOINTS.helloworld.path,
    stripeFrontendMiddleware,
    ...stripeFrontendHandler
  );
app.get(ENDPOINTS.membership.path, stripeFrontendMiddleware, ...getMembership);

  // Webhooks from Stripe:
app.post(
    "/webhook/:mode{test|live|sandbox}/stripe",
    stripeWebhookMiddleware,
    ...stripeWebhookHandler
  );

  // Membership webhook events aren't validated as coming from Stripe.
  // Could be a good follow up task.
app.post(
    "/membership/webhook/:mode{test|live|sandbox}/stripe",
    ...membershipWebhookHandler
  );

export default app;
export { MembershipDurableObject } from "./membership-do";
export type AppType = typeof app;