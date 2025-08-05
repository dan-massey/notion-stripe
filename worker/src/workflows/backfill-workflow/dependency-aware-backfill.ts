import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import type { DatabaseEntity } from "@/types";
import type { WorkflowParams } from "./types";

// Import step functions
import { determineEntityToBackfill } from "./steps/determine-entity";
import { getNotionToken } from "../utils/get-notion-token";
import { getDatabaseIds } from "./steps/get-database-ids";
import { markCompleted, updateProgress } from "./steps/update-status";
import { getNextEntityFromStripe } from "./steps/process-entity-with-dependencies";

// Import entity processing logic
import { EntityProcessor } from "@/entity-processor/entity-processor-refactored";
import { getAccountStubFromBindings } from "@/durable-objects/utils";
import { getStripe } from "@/workflows/utils/get-stripe";

export class DependencyAwareBackfillWorkflow extends WorkflowEntrypoint<
  CloudflareBindings,
  WorkflowParams
> {
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
        const stripe = getStripe(this.env, event.payload.stripeMode);
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
        newParams.entityStatus[entityToBackfill].started = true;
        newParams.entityStatus[entityToBackfill].completed = true;
        newParams.entitiesProcessed = event.payload.entitiesProcessed;
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
      const stripe = getStripe(this.env, event.payload.stripeMode);
      return getNotionToken(stripe, event.payload.stripeAccountId);
    });

    if (!notionToken) {
      return;
    }

    const databaseIds = await step.do("Get database IDs", async () => {
      return getDatabaseIds(
        this.env.ACCOUNT_DURABLE_OBJECT,
        event.payload.stripeMode,
        event.payload.stripeAccountId
      );
    });

    if (!databaseIds) {
      return;
    }

    // Process the main entity with all its sub-entities using EntityProcessor
    const newEntitiesProcessed = await step.do(
      `Process entity with sub-entities: ${entityToBackfill} ${stripeListResults.data[0].id}`,
      async () => {
        const mainEntityData = stripeListResults.data[0];
        const stripe = getStripe(this.env, event.payload.stripeMode);

        const accountStub = getAccountStubFromBindings(
          this.env,
          event.payload.stripeMode,
          event.payload.stripeAccountId
        );

        // Create EntityProcessor with step wrapper
        const entityProcessor = EntityProcessor.fromWorkflow({
          stripeAccountId: event.payload.stripeAccountId,
          stripeMode: event.payload.stripeMode,
          notionToken,
          coordinatorNamespace: this.env.STRIPE_ENTITY_COORDINATOR,
          stripe,
          accountStub,
        });

        // Create step wrapper function for EntityProcessor
        const stepWrapper = (name: string, fn: () => Promise<any>) =>
          step.do(name, fn);
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
        return entityProcessor.getEntitiesProcessedCount();
      }
    );

    await step.do("update workflow status kv", async () => {
      await updateProgress(
        this.env.BACKFILL_KV,
        event.payload.stripeMode,
        event.payload.stripeAccountId,
        event.payload.entitiesProcessed + (newEntitiesProcessed ?? 0),
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
        entitiesProcessed:
          event.payload.entitiesProcessed + (newEntitiesProcessed ?? 0),
      };
    });

    await step.do("start next workflow", async () => {
      const newParams: WorkflowParams = { ...event.payload };
      newParams.entityStatus[entityToBackfill].started = true;
      newParams.entityStatus[entityToBackfill].completed =
        !stripeListResults.has_more;
      newParams.entitiesProcessed =
        event.payload.entitiesProcessed + (newEntitiesProcessed ?? 0);

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
