import { StripeMode, BackfillWorkflowStatus } from "@/types";

const makeKey = (stripeMode: StripeMode, stripeAccountId: string) =>
  `${stripeMode}:${stripeAccountId}`;

export const setStatus = async (
  kv: KVNamespace<string>,
  stripeMode: StripeMode | undefined,
  stripeAccountId: string | undefined,
  status: BackfillWorkflowStatus
) => {
  if (!stripeAccountId || !stripeMode) {
    return;
  }
  await kv.put(makeKey(stripeMode, stripeAccountId), JSON.stringify(status));
};

export const getStatus = async (
  kv: KVNamespace<string>,
  stripeMode: StripeMode | undefined,
  stripeAccountId: string | undefined
) => {
  if (!stripeAccountId || !stripeMode) {
    return;
  }
  const key = makeKey(stripeMode, stripeAccountId);
  const val = await kv.get(key);
  if (val) {
    return JSON.parse(val) as BackfillWorkflowStatus;
  }
};

