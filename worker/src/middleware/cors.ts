import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';

// See https://docs.stripe.com/stripe-apps/build-backend#handle-cross-origin-resource-sharing-(cors)
export const configuredCors: MiddlewareHandler = cors({
  origin: '*',
  allowHeaders: [
    'Content-Type',
    'content-type',
    'Authorization',
    'Stripe-Signature',
    'stripe-signature',
    'X-Stripe-Account-Id',
    'X-Stripe-User-Id',
    'X-Stripe-Mode',
    'X-Stripe-Is-Sandbox',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: false,
});
