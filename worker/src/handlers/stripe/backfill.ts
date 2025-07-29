import type { AppContext, SupportedEntity, BackfillTaskStatus } from "@/types";
import { getStatus, setStatus } from "@/utils/backfill-status";

export const startBackfill = async (c: AppContext) => {
  const entities: SupportedEntity[] = [
    "customer",
    "payment_intent",
    "charge",
    "invoice",
    "credit_note",
    "dispute",
    "product",
    "price",
    "subscription",
    "invoiceitem",
    "promotion_code",
  ];

  const statuses = Object.fromEntries(
    entities.map((entity) => [
      entity,
      {
        started: false,
        completed: false,
        startingAfter: undefined,
      },
    ])
  );

  await c.env.BACKFILL_WORKFLOW.create({
    params: {
      stripeAccountId: c.get("stripeAccountId"),
      stripeMode: c.get("stripeMode"),
      entitiesToBackfill: entities,
      entitiesProcessed: 0,
      entityStatus: statuses,
    },
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
