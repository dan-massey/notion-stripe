import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { Stripe } from "stripe";
import type { StripeMode, DatabaseEntity } from "@/types";
import type { WorkflowParams } from "./types";

// Import step functions
import { determineEntityToBackfill } from "./steps/determine-entity";
import { getNotionToken } from "./steps/get-notion-token";
import { getDatabaseIds } from "./steps/get-database-ids";
import { markCompleted, updateProgress } from "./steps/update-status";
import { getNextEntityFromStripe } from "./steps/process-entity-with-dependencies";

// Import entity processing logic
import { EntityProcessor } from "@/entity-processor/entity-processor-refactored";

export class DependencyAwareBackfillWorkflow extends WorkflowEntrypoint<
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
      "Get next entity from Stripe",
      async () => {
        const stripe = this.getStripe(event.payload.stripeMode);
        const startingAfter =
          event.payload.entityStatus[entityToBackfill].startingAfter;
        return getNextEntityFromStripe(
          stripe,
          entityToBackfill,
          event.payload.stripeAccountId,
          startingAfter
        );
      }
    );
    let entitiesProcessed = 0;

    if (!stripeListResults.data.length) {
      // No more entities of this type, mark as completed and continue
      await step.do("update workflow status kv", async () => {
        await updateProgress(
          this.env.BACKFILL_KV,
          event.payload.stripeMode,
          event.payload.stripeAccountId,
          event.payload.entitiesProcessed,
          entityToBackfill
        );
      });

      await step.do("start next workflow for next entity type", async () => {
        const newParams: WorkflowParams = { ...event.payload };
        newParams.entityStatus[entityToBackfill].completed = true;
        newParams.entitiesProcessed =
          event.payload.entitiesProcessed + entitiesProcessed;
        if (!newParams.firstWorkflowId) {
          newParams.firstWorkflowId = event.instanceId;
        }
        newParams.mostRecentWorkflowId = event.instanceId;

        const newWorkflowInvocation = await this.env.BACKFILL_WORKFLOW.create({
          params: newParams,
        });

        return newWorkflowInvocation.id;
      });
      return;
    }

    const notionToken = await step.do("Get notion token", async () => {
      const stripe = this.getStripe(event.payload.stripeMode);
      return getNotionToken(stripe, event.payload.stripeAccountId);
    });

    if (!notionToken) {
      return;
    }

    const databaseIds = await step.do("Get database IDs", async () => {
      return getDatabaseIds(
        this.env.ACCOUNT_DURABLE_OBJECT,
        event.payload.stripeAccountId
      );
    });

    if (!databaseIds) {
      return;
    }

    const mainEntityData = stripeListResults.data[0];
    const stripe = this.getStripe(event.payload.stripeMode);

    // Build database IDs mapping for coordinated upsert
    const databaseIdsMap: Record<string, string | undefined> = {};
    Object.entries(databaseIds).forEach(([key, value]) => {
      if (value?.pageId) {
        databaseIdsMap[key] = value.pageId;
      }
    });

    // Create handler context for coordinated upsert
    const id = this.env.ACCOUNT_DURABLE_OBJECT.idFromName(
      event.payload.stripeAccountId
    );
    const accountStub = this.env.ACCOUNT_DURABLE_OBJECT.get(id);

    // Create EntityProcessor with step wrapper
    const entityProcessor = EntityProcessor.fromWorkflow({
      stripeAccountId: event.payload.stripeAccountId,
      notionToken,
      coordinatorNamespace: this.env.STRIPE_ENTITY_COORDINATOR,
      stripe,
      accountStub,
    });

    // Create step wrapper function for EntityProcessor
    const stepWrapper = (name: string, fn: () => Promise<any>) =>
      step.do(name, fn);

    // Process the main entity with all its sub-entities using EntityProcessor
    await step.do(
      `Process entity with sub-entities: ${entityToBackfill} ${mainEntityData.id}`,
      async () => {
        if (!mainEntityData.id) {
          return null;
        }

        await entityProcessor.processEntityComplete(
          entityToBackfill as DatabaseEntity,
          mainEntityData.id,
          databaseIds,
          stepWrapper
        );

        // Count the main entity (sub-entities are counted within their respective steps)
        entitiesProcessed = entitiesProcessed + entityProcessor.getEntitiesProcessedCount();
      }
    );

    await step.do("update workflow status kv", async () => {
      await updateProgress(
        this.env.BACKFILL_KV,
        event.payload.stripeMode,
        event.payload.stripeAccountId,
        event.payload.entitiesProcessed + entitiesProcessed,
        entityToBackfill
      );
    });

    await step.do("debug stripe results", async () => {
      return {
        entityToBackfill,
        currentStartingAfter:
          event.payload.entityStatus[entityToBackfill].startingAfter,
        stripeHasMore: stripeListResults.has_more,
        stripeDataLength: stripeListResults.data.length,
        firstEntityId: stripeListResults.data[0]?.id,
        entitiesProcessed: event.payload.entitiesProcessed + entitiesProcessed,
      };
    });

    await step.do("start next workflow", async () => {
      const newParams: WorkflowParams = { ...event.payload };
      newParams.entityStatus[entityToBackfill].started = true;
      newParams.entityStatus[entityToBackfill].completed =
        !stripeListResults.has_more;
      newParams.entitiesProcessed =
        event.payload.entitiesProcessed + entitiesProcessed;

      if (stripeListResults.data.length > 0) {
        const lastIdInResult =
          stripeListResults.data[stripeListResults.data.length - 1].id;
        newParams.entityStatus[entityToBackfill].startingAfter = lastIdInResult;
      }

      if (!newParams.firstWorkflowId) {
        newParams.firstWorkflowId = event.instanceId;
      }
      newParams.mostRecentWorkflowId = event.instanceId;

      const newWorkflowInvocation = await this.env.BACKFILL_WORKFLOW.create({
        params: newParams,
      });

      return {
        workflowId: newWorkflowInvocation.id,
        newStartingAfter:
          newParams.entityStatus[entityToBackfill].startingAfter,
        completed: newParams.entityStatus[entityToBackfill].completed,
      };
    });
  }
}
