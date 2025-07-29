import { EntityProcessor } from "@/utils/entity-processor";
import type { SupportedEntity } from "@/types";
import type { DatabaseIds } from "../types";
import type { StripeEntityCoordinator } from "@/stripe-entity-coordinator";
import type { Stripe } from "stripe";
import { AccountDurableObject } from "@/account-do";

export async function writeToNotion(
  entityToBackfill: SupportedEntity,
  notionToken: string,
  databaseIds: DatabaseIds,
  obj: any,
  notionProperties: Record<string, any>,
  stripeAccountId: string,
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>,
  stripe: Stripe,
  accountStub: DurableObjectStub<AccountDurableObject>
): Promise<void> {
  if (!notionProperties || !obj.id) {
    return;
  }

  const processor = EntityProcessor.fromWorkflow({
    stripeAccountId,
    notionToken,
    coordinatorNamespace,
    stripe,
    accountStub
  });

  await processor.processEntity(
    entityToBackfill,
    obj.id,
    databaseIds,
    { forceUpdate: true }
  );
}