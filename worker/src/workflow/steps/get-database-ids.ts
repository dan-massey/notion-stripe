import { AccountDurableObject, type Databases } from "@/account-do";

export async function getDatabaseIds(
  accountDurableObject: DurableObjectNamespace<AccountDurableObject>,
  stripeAccountId: string
): Promise<Databases | null> {
  const id = accountDurableObject.idFromName(stripeAccountId);
  const membershipDo = accountDurableObject.get(id);
  const info = await membershipDo.getStatus();

  return info?.notionConnection?.databases ?? null;
}