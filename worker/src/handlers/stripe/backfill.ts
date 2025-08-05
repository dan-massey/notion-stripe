import type { AppContext, StripeApiObject, BackfillTaskStatus } from "@/types";
import { getStatus, setStatus } from "@/utils/backfill-status";
import { WorkflowParams } from "@/workflows/backfill-workflow/types";
import { validateBackfillEntitiesComplete } from "@/entity-processor/entity-registry";

export const startBackfill = async (c: AppContext) => {
  const entities: Array<StripeApiObject> = [
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
    "payment_intent"
  ];

  // Validate that all listable entities are included
  validateBackfillEntitiesComplete(entities);

  const statuses = Object.fromEntries(
    entities.map((entity) => [
      entity,
      {
        started: false,
        completed: false,
        startingAfter: undefined,
      },
    ])
  ) as Record<StripeApiObject, BackfillTaskStatus>;

  const stripeAccountId = c.get("stripeAccountId");
  const stripeMode = c.get("stripeMode");

  if (!stripeAccountId || ! stripeMode) {
    return c.json({message: "Failed to start backfill"});
  }

  const params: WorkflowParams = {
    stripeAccountId: stripeAccountId,
    stripeMode: stripeMode,
    entitiesToBackfill: entities,
    entitiesProcessed: 0,
    entityStatus: statuses,
    firstWorkflowId: null,
    mostRecentWorkflowId: null
  };

  await c.env.BACKFILL_WORKFLOW.create({
    params: params,
    id: `${stripeMode}-${stripeAccountId}-${0}-${crypto.randomUUID()}`
  });
  const status = {
    recordsProcessed: 0,
    status: "started",
    startedAt: new Date().valueOf(),
  } as const;
  await setStatus(
    c.env.BACKFILL_KV,
    c.get("stripeMode"),
    c.get("stripeAccountId"),
    status
  );

  return c.json({ status });
};

export const getBackfillStatus = async (c: AppContext) => {
  const status = await getStatus(
    c.env.BACKFILL_KV,
    c.get("stripeMode"),
    c.get("stripeAccountId")
  );

  return c.json({
    status,
  });
};
