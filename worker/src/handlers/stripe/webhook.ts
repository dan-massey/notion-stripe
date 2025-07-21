import type { AppContext } from "@/types";

export const stripeWebhookHandler = async (c: AppContext) => {
  return c.json({ message: "Event received" });
};
