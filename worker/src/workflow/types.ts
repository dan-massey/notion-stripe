import type { StripeMode, StripeApiObject, BackfillTaskStatus } from "@/types";


export type WorkflowParams = {
  stripeAccountId: string;
  stripeMode: StripeMode;
  entitiesToBackfill: Array<StripeApiObject>;
  entityStatus: Record<StripeApiObject, BackfillTaskStatus>;
  entitiesProcessed: number;
  firstWorkflowId: string | null;
  mostRecentWorkflowId: string | null;
};
