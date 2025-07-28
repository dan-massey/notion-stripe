import type { AppContext, StripeMode } from "@/types";
import { ensureAccountDo } from "@/utils/do";
import { getNotionToken } from "@/utils/stripe";
import {
  handleCustomerEvent,
  handleChargeEvent,
  handleInvoiceEvent,
  handleSubscriptionEvent,
  type HandlerContext,
  type HandlerResult,
} from "./webhook-handlers";
import type Stripe from "stripe";

type WebhookEventHandler = (
  event: Stripe.Event,
  context: HandlerContext
) => Promise<HandlerResult>;

const EVENT_HANDLERS: Record<string, WebhookEventHandler> = {
  customer: handleCustomerEvent,
  charge: handleChargeEvent,
  invoice: handleInvoiceEvent,
  subscription: handleSubscriptionEvent,
};

export const stripeWebhookHandler = async (c: AppContext) => {
  const modeFromUrl = c.req.param("mode") as StripeMode;
  const event = c.get("stripeEvent");
  const stripeAccountId = event?.account;

  if (modeFromUrl === "test" && event?.livemode === true) {
    return c.json({ message: "Live event sent to test endpoint, ignoring." });
  }

  if (modeFromUrl === "live" && event?.livemode === false) {
    return c.json({ message: "Test event sent to live endpoint, ignoring." });
  }

  if (!stripeAccountId) {
    throw new Error("Missing Stripe Account ID on webhook event.");
  }

  const objectType = event?.data.object.object;
  console.log(`Processing ${objectType} event for account ${stripeAccountId}`);

  // Get required resources in parallel
  const notionTokenPromise = getNotionToken(c, stripeAccountId);
  const accountPromise = ensureAccountDo(c, stripeAccountId, modeFromUrl);
  const [notionToken, account] = await Promise.all([
    notionTokenPromise,
    accountPromise,
  ]);

  const accountStatus = await account.getStatus();

  // Check if we have a Notion token
  if (!notionToken) {
    console.warn("No Notion token available");
    return c.json({ message: "No Notion token available" });
  }

  if (!accountStatus) {
    console.warn("No account status available");
    return c.json({ message: "No account status available" });
  }

  if (
    !accountStatus?.subscription?.stripeSubscriptionId &&
    !["active", "trialing", "past_due"].includes(
      accountStatus?.subscription?.stripeSubscriptionStatus ?? ""
    )
  ) {
    return c.json({
      message: `No active subscription for ${modeFromUrl} ${stripeAccountId} not syncing event to Notion.`,
    });
  }

  // Get the appropriate handler for this object type
  const handler = EVENT_HANDLERS[objectType];
  if (!handler) {
    console.warn(`No handler found for object type: ${objectType}`);
    return c.json({ message: `Unsupported object type: ${objectType}` });
  }

  // Create context for the handler
  const context: HandlerContext = {
    stripe: c.get("stripe"),
    notionToken,
    stripeAccountId,
    accountStatus,
    account,
  };

  // Execute the handler
  const result = await handler(event, context);

  // Return appropriate response based on result
  if (!result.success) {
    const response = result.error
      ? { error: result.error }
      : { message: result.message };
    const statusCode = result.statusCode || 400;
    return c.json(response, statusCode as any);
  }

  return c.json({ message: result.message || "Event processed successfully" });
};
