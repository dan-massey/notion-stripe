import { AppContext } from "@/types";

export const getMembershipDo = (c: AppContext, stripeAccountId: string) => {
  const id = c.env.MEMBERSHIP_DURABLE_OBJECT.idFromName(stripeAccountId);
  return c.env.MEMBERSHIP_DURABLE_OBJECT.get(id);
};
