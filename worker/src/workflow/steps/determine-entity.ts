import type { SupportedEntity } from "@/types";
import type { WorkflowParams } from "../types";

export function determineEntityToBackfill(params: WorkflowParams): SupportedEntity | null {
  return (
    params.entitiesToBackfill.find(
      (entityName) =>
        !params.entityStatus[entityName].started ||
        !params.entityStatus[entityName].completed
    ) || null
  );
}