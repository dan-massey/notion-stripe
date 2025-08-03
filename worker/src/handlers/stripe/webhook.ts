import type { AppContext, StripeMode } from "@/types";
import type { WorkflowParams } from "@/workflows/webhook-workflow";
import { ensureAccountDo } from "@/durable-objects/utils";
import { deleteNotionToken, getNotionToken } from "@/utils/stripe";
import { getCoordinator } from "@/upload-coordinator/utils";
import { revokeToken } from "@/utils/notion-api";

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
    `[Webhook Handler]: Processing ${event.type} / ${objectType} event for account ${stripeAccountId}`
  );

  // Get required resources in parallel
  const notionTokenPromise = getNotionToken(c, stripeAccountId);
  const accountPromise = ensureAccountDo(c, stripeAccountId, modeFromUrl);
  const [notionToken, account] = await Promise.all([
    notionTokenPromise,
    accountPromise,
  ]);

  const accountStatus = await account.getStatus();

  if (event.type === "account.application.deauthorized") {
    // Cancel subscription
    // Delete account DO
    const stripe = c.get("stripe");
    if (accountStatus?.subscription?.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(
        accountStatus.subscription?.stripeSubscriptionId
      );
    }
    const coordinator = getCoordinator({ env: c.env }, stripeAccountId);
    await coordinator.clearAllMappings();
    await account.deleteSubscription();
    await account.clearNotionPages();
    if (notionToken) {
      try {
        console.log("[Webhook Handler]: Trying to revoke Notion Token");
        await revokeToken(c.env.NOTION_OAUTH_CLIENT_ID, c.env.NOTION_OAUTH_CLIENT_SECRET, notionToken);
      } catch (e) {
        console.log("[Webhook Handler]: Revoking token errored", e);
      }
     }
    return c.json({ message: "Uninstall handled" });
  }

  if (event.type === "account.application.authorized") {
    // Delete the notion token on first install to handle the case
    // where the app has been previously installed, is then
    // uninstalled and then is reinstalled: We can't delete the notion
    // token from Stripe because we lose permissions before the
    // uninstall event is delivered.
    try {
      await deleteNotionToken(c);
    } catch (e) {
      console.log("Error deleting notion token", e);
    }
    return c.json({ message: "Application installed" });
  }

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
    console.log(
      `[Webhook Handler] Inserted webhook workflow run ${insertWorkflow.id}`
    );
    return c.json({ message: "Event processed successfully" });
  } else {
    return c.json({ message: "No databases set up" });
  }
};
