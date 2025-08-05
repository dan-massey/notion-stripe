import { AccountDurableObject, type Databases } from "@/durable-objects/account-do";
import { StripeMode } from "@/types";
import { getStubFromNamespace } from "@/durable-objects/utils";

export async function getDatabaseIds(
  durableObjectNamespace: DurableObjectNamespace<AccountDurableObject>,
  stripeMode: StripeMode,
  stripeAccountId: string
): Promise<Databases | null> {
  const membershipDo = getStubFromNamespace(durableObjectNamespace, stripeMode, stripeAccountId);
  const info = await membershipDo.getStatus();

  return info?.notionConnection?.databases ?? null;
}