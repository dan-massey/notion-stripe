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


import { stripeWebhookHandler } from "@/handlers/stripe/webhook";


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

// Stripe frontend endpoints are defined in the ENDPOINTS const and added programatically.
Object.values(ENDPOINTS).forEach((endpointInfo) => {
  const methods = endpointInfo.methods as readonly string[];
  if (methods.includes("POST")) {
    app.post(endpointInfo.path, endpointInfo.handler);
  }
  if (methods.includes("GET")) {
    app.get(endpointInfo.path, endpointInfo.handler);
  }
});

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
export { AccountDurableObject } from "./account-do";
export { BackfillWorkflow } from "./workflow";