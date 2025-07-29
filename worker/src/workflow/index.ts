import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { Stripe } from "stripe";
import type { StripeMode } from "@/types";
import type { WorkflowParams } from "./types";

// Import step functions
import { determineEntityToBackfill } from "./steps/determine-entity";
import { fetchStripeData } from "./steps/fetch-stripe-data";
import { convertToNotionProperties } from "./steps/convert-to-notion";
import { getNotionToken } from "./steps/get-notion-token";
import { getDatabaseIds } from "./steps/get-database-ids";
import { writeToNotion } from "./steps/write-to-notion";
import { markCompleted, updateProgress } from "./steps/update-status";

export class BackfillWorkflow extends WorkflowEntrypoint<
  CloudflareBindings,
  WorkflowParams
> {
  getStripe = (stripeMode: StripeMode) => {
    let secret: string = this.env.STRIPE_TEST_KEY;
    if (stripeMode === "live") {
      secret = this.env.STRIPE_LIVE_KEY;
    } else if (stripeMode === "sandbox") {
      secret = this.env.STRIPE_SANDBOX_KEY;
    }
    return new Stripe(secret, {
      typescript: true,
    });
  };

  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const entityToBackfill = await step.do(
      "Determine entity to backfill",
      async () => {
        return determineEntityToBackfill(event.payload);
      }
    );

    if (!entityToBackfill) {
      await step.do("Mark status KV as completed", async () => {
        await markCompleted(
          this.env.BACKFILL_KV,
          event.payload.stripeMode,
          event.payload.stripeAccountId,
          event.payload.entitiesProcessed
        );
      });
      return;
    }

    const stripeListResults = await step.do(
      "Get expanded list with one object from Stripe",
      async () => {
        const stripe = this.getStripe(event.payload.stripeMode);
        return fetchStripeData(stripe, entityToBackfill, event.payload);
      }
    );

    const notionToken = await step.do("Get notion token", async () => {
      const stripe = this.getStripe(event.payload.stripeMode);
      return getNotionToken(stripe, event.payload.stripeAccountId);
    });

    if (!notionToken) {
      return;
    }

    const databaseIds = await step.do("Get membership info", async () => {
      return getDatabaseIds(
        this.env.ACCOUNT_DURABLE_OBJECT,
        event.payload.stripeAccountId
      );
    });

    const notionProperties = await step.do(
      "Convert the stripe object to notion properties",
      async () => {
        if (!stripeListResults.data.length) {
          return null;
        }
        const firstItem = stripeListResults.data[0];
        const stripe = this.getStripe(event.payload.stripeMode);
        return convertToNotionProperties(
          entityToBackfill, 
          firstItem, 
          notionToken, 
          databaseIds, 
          event.payload.stripeAccountId,
          this.env.STRIPE_ENTITY_COORDINATOR,
          stripe
        );
      }
    );

    await step.do("Write to notion", async () => {
      if (!notionProperties) {
        return;
      }
      const obj = stripeListResults.data[0];
      const stripe = this.getStripe(event.payload.stripeMode);
      const id = this.env.ACCOUNT_DURABLE_OBJECT.idFromName(event.payload.stripeAccountId);
      const accountStub = this.env.ACCOUNT_DURABLE_OBJECT.get(id);
      await writeToNotion(
        entityToBackfill,
        notionToken,
        databaseIds,
        obj,
        notionProperties,
        event.payload.stripeAccountId,
        this.env.STRIPE_ENTITY_COORDINATOR,
        stripe,
        accountStub
      );
    });

    await step.do("update workflow status kv", async () => {
      await updateProgress(
        this.env.BACKFILL_KV,
        event.payload.stripeMode,
        event.payload.stripeAccountId,
        event.payload.entitiesProcessed,
        entityToBackfill
      );
    });

    await step.do("start next workflow", async () => {
      const newParams: WorkflowParams = { ...event.payload };
      newParams.entityStatus[entityToBackfill].started = true;
      newParams.entityStatus[entityToBackfill].completed =
        !stripeListResults.has_more;
      newParams.entitiesProcessed = event.payload.entitiesProcessed + 1;

      if (stripeListResults.has_more && stripeListResults.data.length > 0) {
        const lastIdInResult =
          stripeListResults.data[stripeListResults.data.length - 1].id;
        newParams.entityStatus[entityToBackfill].startingAfter = lastIdInResult;
      }

      const newWorkflowInvocation = await this.env.BACKFILL_WORKFLOW.create({
        params: newParams,
      });

      return newWorkflowInvocation.id;
    });
  }
}