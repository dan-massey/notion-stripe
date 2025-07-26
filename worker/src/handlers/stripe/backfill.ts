import type { AppContext } from "@/types";
import { getStatus, setStatus } from "@/utils/backfillStatus";

export const startBackfill = async (c: AppContext) => {
  await c.env.BACKFILL_WORKFLOW.create({
    params: {
      stripeAccountId: c.get("stripeAccountId"),
      stripeMode: c.get("stripeMode"),
      entitiesToBackfill: ["customer", "charge", "invoice", "subscription"],
      entitiesProcessed: 0,
      entityStatus: {
        customer: {
          started: false,
          completed: false,
          nextPage: undefined,
        },
        charge: {
          started: false,
          completed: false,
          nextPage: undefined,
        },
        invoice: {
          started: false,
          completed: false,
          nextPage: undefined,
        },
        subscription: {
          started: false,
          completed: false,
          nextPage: undefined,
        },
      },
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
    status
  });
};
