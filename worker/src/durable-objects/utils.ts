import type { AccountDurableObject } from "@/durable-objects/account-do";
import { AppContext, StripeMode } from "@/types";

const getAccountDo = (c: AppContext, stripeMode: StripeMode, stripeAccountId: string) => {
  return getStubFromNamespace(c.env.ACCOUNT_DURABLE_OBJECT, stripeMode, stripeAccountId);
};

export const ensureAccountDo = async (c: AppContext, stripeAccountId: string, stripeMode: StripeMode) => {
  const accountDo = getAccountDo(c, stripeMode, stripeAccountId);
  const status = await accountDo.getStatus();
  
  if (!status && stripeMode) {
    await accountDo.setUp({
      stripeAccountId,
      stripeMode,
    });
  }
  
  return accountDo;
};

export const getAccountStubFromBindings = (
  env: CloudflareBindings,
  stripeMode: StripeMode,
  stripeAccountId: string
) => {
  return getStubFromNamespace(env.ACCOUNT_DURABLE_OBJECT, stripeMode, stripeAccountId);
};

export const getStubFromNamespace = (accountNamespace: DurableObjectNamespace<AccountDurableObject>, stripeMode: StripeMode, stripeAccountId: string) => {
  const id = accountNamespace.idFromName(`${stripeMode}:${stripeAccountId}`);
  return accountNamespace.get(id);
}