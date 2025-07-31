import type { Stripe } from "stripe";
import type {
  AppContext,
  StripeMode,
  ApiStripeObject,
  StripeApiObjectKinds,
} from "@/types";
import { ensureAccountDo } from "@/durable-objects/utils";
import { getNotionToken } from "@/utils/stripe";
import { HandlerResult, type HandlerContext } from "./webhook/shared/types";
import { handleNotionError } from "./webhook/shared/utils";
import { EntityProcessor } from "@/entity-processor/entity-processor";

const WEBHOOK_OBJECT_KINDS: StripeApiObjectKinds = [
  "customer",
  "invoice",
  "charge",
  "subscription",
  "credit_note",
  "dispute",
  "invoiceitem",
  "price",
  "product",
  "coupon",
  "promotion_code",
  "payment_intent",
  "subscription_item",
];

const tryUpsert = async (
  event: Stripe.Event,
  context: HandlerContext
): Promise<HandlerResult> => {
  const accountStatus = await context.account.getStatus();
  if (!accountStatus) {
    return {
      success: false,
      error: "Account status not found",
      statusCode: 200,
    };
  }
  const databases = accountStatus.notionConnection?.databases;
  if (!databases) {
    return {
      success: false,
      error: "No databases created",
      statusCode: 200,
    };
  }

  const stripeObject = event.data.object as ApiStripeObject;
  if (!WEBHOOK_OBJECT_KINDS.includes(stripeObject.object)) {
    return {
      success: false,
      error: `Unsupported entity: ${stripeObject.object}`,
      statusCode: 200,
    };
  }

  if (!stripeObject.id) {
    return {
      success: false,
      error: `Entity ${stripeObject.object} does not have an ID`,
      statusCode: 200,
    };
  }

  try {
    // Create EntityProcessor from webhook context
    const entityProcessor = EntityProcessor.fromWebhook(context);

    // Process the main entity with all its sub-entities (line items, subscription items, discounts)
    await entityProcessor.processEntityWithSubEntities(
      stripeObject.object,
      stripeObject.id,
      databases
    );

    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, stripeObject.object);
    console.error(`Error upserting ${stripeObject.object} to Notion:`, error);
    return {
      success: false,
      error: `Failed to update ${stripeObject.object} in Notion`,
      statusCode: 200,
    };
  }
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
  console.log(
    `Processing ${event.type} / ${objectType} event for account ${stripeAccountId}`
  );

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

  // Create context for the handler
  const context: HandlerContext = {
    stripe: c.get("stripe"),
    notionToken,
    stripeAccountId,
    account,
    env: c.env,
  };

  // Execute the handler
  const result = await tryUpsert(event, context);

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
