import type { StripeApiObject } from "@/types";
import type { WorkflowParams } from "../types";

export function determineEntityToBackfill(params: WorkflowParams): StripeApiObject | null {
  return (
    params.entitiesToBackfill.find(
      (entityName) =>
        !params.entityStatus[entityName].started ||
        !params.entityStatus[entityName].completed
    ) || null
  );
}