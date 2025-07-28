import { AppContext, StripeMode } from "@/types";

const getAccountDo = (c: AppContext, stripeAccountId: string) => {
  const id = c.env.ACCOUNT_DURABLE_OBJECT.idFromName(stripeAccountId);
  return c.env.ACCOUNT_DURABLE_OBJECT.get(id);
};

export const ensureAccountDo = async (c: AppContext, stripeAccountId: string, stripeMode?: StripeMode) => {
  const accountDo = getAccountDo(c, stripeAccountId);
  const status = await accountDo.getStatus();
  
  if (!status && stripeMode) {
    await accountDo.setUp({
      stripeAccountId,
      stripeMode,
    });
  }
  
  return accountDo;
};
