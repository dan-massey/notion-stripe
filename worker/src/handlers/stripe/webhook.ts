import type {
  AppContext,
  StripeMode,
} from "@/types";
import type { WorkflowParams } from "@/webhook-workflow";
import { ensureAccountDo } from "@/durable-objects/utils";
import { getNotionToken } from "@/utils/stripe";


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


  if (accountStatus.notionConnection?.databases) {
    const params: WorkflowParams = {
      stripeMode: modeFromUrl,
      stripeAccountId: stripeAccountId,
      databases: accountStatus.notionConnection?.databases,
      stripeEvent: event,
    };
    const insertWorkflow = await c.env.WEBHOOK_WORKFLOW.create({
      id: event.id,
      params: params,
    });
    console.log(`[Webhook Handler] Inserted webhook workflow run ${insertWorkflow.id}`);
      return c.json({ message: "Event processed successfully" });
  } else {
      return c.json({ message: "No databases set up" });
  }

};
