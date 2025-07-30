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
import {
  createEntityDependencyPlan,
  getNextEntityFromStripe,
} from "./steps/process-entity-with-dependencies";

// Import coordinated upsert logic
import {
  coordinatedUpsert,
  coordinatedUpsertLineItem,
  coordinatedUpsertDiscount,
} from "@/utils/coordinated-upsert/generic-upsert";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import { ENTITY_REGISTRY } from "@/utils/coordinated-upsert/entity-registry";

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
        newParams.entitiesProcessed = event.payload.entitiesProcessed + entitiesProcessed;
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

    // Create dependency plan for the main entity
    const dependencyPlan = await step.do("Create dependency plan", async () => {
      return createEntityDependencyPlan(
        stripe,
        entityToBackfill,
        mainEntityData,
        event.payload.stripeAccountId
      );
    });

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

    const context: HandlerContext = {
      stripe,
      stripeAccountId: event.payload.stripeAccountId,
      notionToken,
      account: accountStub,
      env: this.env,
    };

    // Process each dependency in order
    for (const [index, depStep] of dependencyPlan.dependencySteps.entries()) {
      await step.do(
        `Upsert dependency ${index + 1}: ${depStep.entityType} ${
          depStep.stripeId
        }`,
        async () => {
          try {
            await coordinatedUpsert(
              context,
              depStep.entityType as DatabaseEntity,
              depStep.stripeId,
              { databaseIds: databaseIdsMap }
            );
            entitiesProcessed++;
          } catch (error) {
            // Continue processing - failed dependencies shouldn't block the main entity
          }
        }
      );
    }

    // Debug step to inspect inputs before processing main entity
    const debugMainEntityInputs = await step.do(
      `Debug main entity inputs: ${entityToBackfill} ${mainEntityData.id}`,
      async () => {
        return {
          entityType: entityToBackfill,
          stripeId: mainEntityData.id,
          databaseIdsAvailable: Object.keys(databaseIdsMap),
          dependencyStepsProcessed: dependencyPlan.dependencySteps.length,
          mainEntityKeys: Object.keys(mainEntityData),
          debug: "About to call coordinatedUpsert",
        };
      }
    );

    // Process the main entity
    const mainEntityPageId = await step.do(
      `Upsert main entity: ${entityToBackfill} ${mainEntityData.id}`,
      async () => {
        if (!mainEntityData.id) {
          return null;
        }

        const pageId = await coordinatedUpsert(
          context,
          entityToBackfill as DatabaseEntity,
          mainEntityData.id,
          { databaseIds: databaseIdsMap }
        );

        entitiesProcessed++;
        return pageId;
      }
    );

    // Special handling for invoice events: process line items
    if (entityToBackfill === "invoice" && mainEntityPageId && databaseIds) {
      const expandedInvoice = await step.do(
        `Process line items for invoice ${mainEntityData.id}`,
        async () => {
          console.log(
            `🧾 Processing line items for invoice ${mainEntityData.id}`
          );

          if (!mainEntityData.id) {
            return;
          }

          // Get the expanded invoice to ensure we have line items
          const expandedInvoice =
            (await ENTITY_REGISTRY.invoice.retrieveFromStripe(
              context,
              mainEntityData.id
            )) as Stripe.Invoice;

          if (!expandedInvoice.lines?.data?.length) {
            console.log(`No line items found for invoice ${mainEntityData.id}`);
            return;
          }

          console.log(
            `Found ${expandedInvoice.lines.data.length} line items for invoice ${mainEntityData.id}`
          );

          return expandedInvoice;
        }
      );

      if (expandedInvoice) {
        let lineCount = 1;
        for (const lineItem of expandedInvoice.lines.data) {
          await step.do(
            `Processing invoice line item ${lineCount} for invoice ${mainEntityData.id}`,
            async () => {
              try {
                await coordinatedUpsertLineItem(
                  context,
                  lineItem,
                  databaseIds,
                  mainEntityPageId,
                  null // Let the line item resolver handle price relationships
                );
                entitiesProcessed++;
              } catch (error) {
                console.error(
                  `❌ Failed to process line item ${lineItem.id}:`,
                  error
                );
                // Continue processing other line items even if one fails
              }
              lineCount++;
            }
          );
        }
      }
    }

    // Special handling for subscription events: process subscription items
    if (
      entityToBackfill === "subscription" &&
      mainEntityPageId &&
      databaseIds
    ) {
      const expandedSubscription = await step.do(
        `Process subscription items for subscription ${mainEntityData.id}`,
        async () => {
          if (!mainEntityData.id) {
            return;
          }

          // Get the expanded subscription to ensure we have subscription items
          const expandedSubscription =
            (await ENTITY_REGISTRY.subscription.retrieveFromStripe(
              context,
              mainEntityData.id
            )) as Stripe.Subscription;

          return expandedSubscription;
        }
      );

      if (expandedSubscription?.items?.data?.length) {
        let lineCount = 0;
        for (const subscriptionItem of expandedSubscription.items.data) {
          await step.do(
            `Processing subscription item ${lineCount} for invoice ${mainEntityData.id}`,
            async () => {
              try {
                await coordinatedUpsert(
                  context,
                  "subscription_item" as DatabaseEntity,
                  subscriptionItem.id,
                  { databaseIds: databaseIdsMap }
                );

                entitiesProcessed++;
              } catch (error) {
                // Continue processing other subscription items even if one fails
              }
              lineCount++;
            }
          );
        }
      }
    }

    // Special handling for entities with discounts: process discount
    if (
      mainEntityPageId &&
      ["customer", "invoice", "subscription", "invoiceitem"].includes(
        entityToBackfill
      ) &&
      databaseIds
    ) {
      await step.do(
        `Process discount for ${entityToBackfill} ${mainEntityData.id}`,
        async () => {
          if (!mainEntityData.id) {
            return;
          }

          // Type guard to ensure entityToBackfill is a valid discount parent type
          if (
            !["customer", "invoice", "subscription", "invoiceitem"].includes(
              entityToBackfill
            )
          ) {
            return `Entity type ${entityToBackfill} does not support discounts`;
          }

          // Get the expanded entity to ensure we have discount data
          const expandedEntity = await ENTITY_REGISTRY[
            entityToBackfill
          ].retrieveFromStripe(context, mainEntityData.id);

          if (!expandedEntity.discount) {
            return `No discount found for ${entityToBackfill} ${mainEntityData.id}`;
          }

          try {
            await coordinatedUpsertDiscount(
              context,
              expandedEntity.discount,
              databaseIds,
              mainEntityPageId,
              entityToBackfill as
                | "customer"
                | "invoice"
                | "subscription"
                | "invoiceitem"
            );

            entitiesProcessed++;
          } catch (error) {
            // Continue processing - discount processing shouldn't block the workflow
          }
        }
      );
    }

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
      newParams.entitiesProcessed = event.payload.entitiesProcessed + entitiesProcessed;

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
