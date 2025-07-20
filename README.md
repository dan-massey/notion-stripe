# Notion-Stripe Integration Monorepo

This project uses **npm workspaces** to manage shared TypeScript types between the Stripe App frontend and Cloudflare Worker backend.

## Project Structure

```
notion-stripe/
├── package.json              # Root workspace configuration
├── stripe-app/               # Stripe App (React frontend)
│   ├── package.json          # @notion-stripe/stripe-app
│   └── src/
└── worker/                   # Cloudflare Worker (backend)
    ├── package.json          # @notion-stripe/worker
    └── src/
```

## Workspace Setup

After cloning, install all dependencies:
```bash
npm install
```

This installs dependencies for both packages and sets up workspace linking.

## Sharing Types Between Packages

The Stripe App can import types directly from the worker:

```typescript
// In stripe-app/src/
import { ApiRequest, ApiResponse } from '@notion-stripe/worker/src/types';
import { StripeWebhookPayload } from '@notion-stripe/worker/src/handlers/stripe';
```

## Development Commands

### Individual Package Commands (still work as before)
```bash
# In stripe-app/
cd stripe-app && npm run lint
cd stripe-app && npm run test

# In worker/
cd worker && npm run dev
cd worker && npm run deploy
```

### Root-Level Convenience Commands
```bash
npm run dev:worker          # Start worker development
npm run lint:stripe-app     # Lint stripe app
npm run test:stripe-app     # Test stripe app  
npm run deploy:worker       # Deploy worker
```

## Frontend
Stripe App served by Stripe.

To set up:
- Create a new Stripe Account (the Platform account for your App)
- Sign in to the Stripe CLI (`stripe signin`)
- Upload the Stripe App (`stripe apps upload`)
- If you create an install link, you can then install the App in a testing account in Live, Test and Sandbox modes.
- stripe-app.json is configured to allow hitting a ngrok tunnel. You may need to update the ngrok URL in the config.
- The frontend has a button that calls the backend. Look at the console and check you're getting a 200.

To set up webhooks:
- In each environment, create a webhook endpoint with the URL of the ngrok tunnel (e.g. `https://willing-grub-included.ngrok-free.app//webhook/:mode{test|live|sandbox}/stripe`)

In the backend, add secrets. You will need to get separate secrets for each environment from the Stripe Platform account in Live, Test and Sandbox. (There will be an automatically generated sandbox for the Platform account after you upload the app.)
```
STRIPE_LIVE_KEY="sk_live_"
STRIPE_TEST_KEY="sk_test_"
STRIPE_SANDBOX_KEY="sk_test_"

STRIPE_APP_SIGNING_SECRET="absec_..."

WEBHOOK_LIVE_SIGNING_SECRET="whsec_..."
WEBHOOK_TEST_SIGNING_SECRET="whsec_..."
WEBHOOK_SANDBOX_SIGNING_SECRET="whsec_..."
```

To make sure frontend requests can be received by the backend, make sure to set headers in every request:
```
        "Stripe-Signature": await fetchStripeSignature(),
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
        "X-Stripe-Account-Id": userContext.account.id || "",
        "X-Stripe-User-Id": userContext.id || "",
        "X-Stripe-Mode": mode,
        "X-Stripe-Is-Sandbox": isSandbox ? "true" : "false",
```

Set up Stripe for payments -- need to do this once per environment (live, test, staging):
- Create a product 
- Set up the billing portal e.g. in test https://dashboard.stripe.com/test/settings/billing/portal
- Create a purchase link e.g. https://dashboard.stripe.com/test/payments/products/prod_Oq4Kp024z53234, and add them to the backend src/handlers/membership.ts in the `checkoutLinks` const
- Create webhooks to handle subscription updates ("/membership/webhook/:mode{test|live|sandbox}/stripe")
  listen for `checkout.session.completed` and all `customer.subscription.*` events

## Backend
Cloudflare Worker with Hono for a Stripe App.

To use ngrok with a consistent URL, specify it when you start the tunnel:
```sh
ngrok http 8787 --url=willing-grub-included.ngrok-free.app
```

Handles:
- Live, test and sandbox webhooks
- Calls from Stripe App frontends
- Subscription management