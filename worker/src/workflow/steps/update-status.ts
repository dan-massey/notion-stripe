import { getStatus, setStatus } from "@/utils/backfill-status";
import type { StripeMode, SupportedEntity } from "@/types";
import type { WorkflowParams } from "../types";

export async function markCompleted(
  backfillKv: KVNamespace,
  stripeMode: StripeMode,
  stripeAccountId: string,
  entitiesProcessed: number
): Promise<void> {
  const status = await getStatus(backfillKv, stripeMode, stripeAccountId);
  if (!status) {
    return;
  }
  await setStatus(backfillKv, stripeMode, stripeAccountId, {
    ...status,
    recordsProcessed: entitiesProcessed,
    status: "complete",
    finishedAt: new Date().valueOf(),
  });
}

export async function updateProgress(
  backfillKv: KVNamespace,
  stripeMode: StripeMode,
  stripeAccountId: string,
  entitiesProcessed: number,
  mostRecentEntity: SupportedEntity,
): Promise<void> {
  const status = await getStatus(backfillKv, stripeMode, stripeAccountId);
  if (!status) {
    return;
  }
  await setStatus(backfillKv, stripeMode, stripeAccountId, {
    ...status,
    recordsProcessed: entitiesProcessed + 1,
    currentEntity: mostRecentEntity
  });
}