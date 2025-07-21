import { Hono } from "hono";
import type { Env } from "@/types";
import { secureHeaders } from "hono/secure-headers";

import { notionAuthCallback } from "@/handlers/notion";
import { ENDPOINTS } from "./stripe-frontend-endpoints";

import { configuredCors } from "@/middleware/cors";
import { notionMiddleware } from "@/middleware/notion";
import {
  stripeFrontendMiddleware,
  stripeWebhookMiddleware,
} from "@/middleware/stripe";

import { helloWorldHandler } from "@/handlers/stripe/helloworld";
import { stripeWebhookHandler } from "@/handlers/stripe/webhook";
import { getMembership } from "@/handlers/stripe/membership";
import { getNotionLink, getNotionPages } from "@/handlers/stripe/notion";

import { membershipWebhookHandler } from "@/handlers/membership-webhook";
import { redirectToNotionAuth } from "@/handlers/notion";
const app = new Hono<Env>();

app.use("*", configuredCors);
app.use(secureHeaders());
app.use("/*", notionMiddleware);

app.get("/auth/signin", redirectToNotionAuth);
app.get("/auth/callback", notionAuthCallback);
app.get("/message", (c) => {
  return c.text(`Hello Hono! Notion OAuth client ready`);
});

// Stripe frontend API endpoints:
// The content-security-policy in the Stripe App can only make requests that start with /stripe
app.use("/stripe/*", stripeFrontendMiddleware);
app.post(ENDPOINTS.membership.path, getMembership);
app.post(ENDPOINTS.helloworld.path, helloWorldHandler);
app.get(ENDPOINTS.membership.path, getMembership);
app.get(ENDPOINTS.notionLink.path, getNotionLink);
app.get(ENDPOINTS.notionPages.path, getNotionPages);
// Webhooks from Stripe:
app.post(
  "/webhook/:mode{test|live|sandbox}/stripe",
  stripeWebhookMiddleware,
  stripeWebhookHandler
);

// Membership webhook events aren't validated as coming from Stripe.
// Could be a good follow up task.
app.post(
  "/membership/webhook/:mode{test|live|sandbox}/stripe",
  membershipWebhookHandler
);

export default app;
export { MembershipDurableObject } from "./membership-do";
