export const getAccountStub = (
  env: CloudflareBindings,
  stripeAccountId: string
) => {
  const id = env.ACCOUNT_DURABLE_OBJECT.idFromName(stripeAccountId);
  return env.ACCOUNT_DURABLE_OBJECT.get(id);
};
