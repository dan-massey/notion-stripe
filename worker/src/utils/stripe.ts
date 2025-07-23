import { Stripe } from "stripe";
import { HTTPException } from "hono/http-exception";
import type { AppContext, StripeMode } from "@/types";
import { NotionSecretName } from "@/stripe-frontend-endpoints";
const NOTION_SECRET_NAME: NotionSecretName = "NOTION_AUTH_TOKEN";

export const makeStripeClient = (c: AppContext, mode: StripeMode) => {
  if (mode === "live") {
    return new Stripe(c.env.STRIPE_LIVE_KEY, {
      typescript: true,
    });
  } else if (mode === "sandbox") {
    return new Stripe(c.env.STRIPE_SANDBOX_KEY, {
      typescript: true,
    });
  }
  return new Stripe(c.env.STRIPE_TEST_KEY, {
    typescript: true,
  });
};

export const getNotionToken = async (
  c: AppContext
): Promise<string | null | undefined> => {
  const stripe = c.get("stripe");

  try {
    const notionSecret = await stripe.apps.secrets.find(
      {
        name: NOTION_SECRET_NAME,
        scope: {
          type: "account",
        },
        expand: ["payload"],
      },
      {
        stripeAccount: c.get("stripeAccountId"),
      }
    );
    return notionSecret.payload;
  } catch (e) {
    return null;
  }
};

export const deleteNotionToken = async (c: AppContext) => {
  const stripe = c.get("stripe");
  try {
    const notionSecret = await stripe.apps.secrets.deleteWhere(
      {
        name: NOTION_SECRET_NAME,
        scope: {
          type: "account",
        },
      },
      {
        stripeAccount: c.get("stripeAccountId"),
      }
    );
    return notionSecret;
  } catch (e) {
    return null;
  }
}


export const createEvent = async (
  stripe: Stripe,
  payload: string,
  signature: string,
  secret?: string
) => {
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret || ""
    );
  } catch (err) {
    const errorMessage = `Event signature verification failed. ${
      err instanceof Error ? err.message : "Internal server error"
    }`;
    console.log(errorMessage);
    throw new HTTPException(403, { message: errorMessage });
  }

  return event;
};

export const validateStripeFrontendCall = async (
  c: AppContext,
  requestMode: StripeMode,
  isSandbox: boolean,
  stripeAccountId: string,
  stripeUserId: string,
  signature: string
) => {
  let stripeMode: StripeMode;
  if (requestMode === "live") {
    stripeMode = "live";
  } else if (isSandbox) {
    stripeMode = "sandbox";
  } else {
    stripeMode = "test";
  }

  const stripe = makeStripeClient(c, stripeMode);

  const payload = JSON.stringify({
    user_id: stripeUserId,
    account_id: stripeAccountId,
  });

  try {
    // Verify the payload and signature from the request with the app secret.
    await createEvent(
      stripe,
      payload,
      signature,
      c.env.STRIPE_APP_SIGNING_SECRET
    );
  } catch (err) {
    throw new HTTPException(403, {
      message: "Request signature verification failed",
    });
  }

  return {
    stripe,
    stripeMode,
  };
};

export const validateStripeWebhookCall = async (
  c: AppContext,
  webhookMode: StripeMode,
  signature: string
) => {
  const stripe = makeStripeClient(c, webhookMode);
  let webhookSecret;
  switch (webhookMode) {
    case "live":
      webhookSecret = c.env.WEBHOOK_LIVE_SIGNING_SECRET;
      break;
    case "test":
      webhookSecret = c.env.WEBHOOK_TEST_SIGNING_SECRET;
      break;
    case "sandbox":
      webhookSecret = c.env.WEBHOOK_SANDBOX_SIGNING_SECRET;
      break;
  }

  if (!webhookSecret) {
    throw new HTTPException(500, { message: "Webhook secret not found" });
  }

  const payload = await c.req.text();
  try {
    let event = await createEvent(stripe, payload, signature, webhookSecret);
    return { stripe, event };
  } catch (err) {
    throw new HTTPException(403, {
      message: "Event signature verification failed",
    });
  }
};
