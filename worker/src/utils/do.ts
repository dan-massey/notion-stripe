import { AppContext, StripeMode } from "@/types";

const getMembershipDo = (c: AppContext, stripeAccountId: string) => {
  const id = c.env.MEMBERSHIP_DURABLE_OBJECT.idFromName(stripeAccountId);
  return c.env.MEMBERSHIP_DURABLE_OBJECT.get(id);
};

export const ensureMembershipDo = async (c: AppContext, stripeAccountId: string, stripeMode?: StripeMode) => {
  const membership = getMembershipDo(c, stripeAccountId);
  const status = await membership.getStatus();
  
  if (!status && stripeMode) {
    await membership.setUp({
      stripeAccountId,
      stripeMode,
    });
  }
  
  return membership;
};
