import { fetchStripeSignature } from "@stripe/ui-extension-sdk/utils";
import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";

export const makeApiRequest = async (
  endpoint: string,
  requestData: Record<string, any>,
  userContext: ExtensionContextValue["userContext"],
  environment: ExtensionContextValue["environment"]
) => {
  const { mode } = environment;
  const { isSandbox } = userContext.account;
  
  const signaturePayload = {
    user_id: userContext?.id,
    account_id: userContext?.account.id,
  };

  return fetch(`https://willing-grub-included.ngrok-free.app/${endpoint}`, {
    method: "POST",
    headers: {
      "Stripe-Signature": await fetchStripeSignature(),
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json",
      "X-Stripe-Account-Id": userContext.account.id || "",
      "X-Stripe-User-Id": userContext.id || "",
      "X-Stripe-Mode": mode,
      "X-Stripe-Is-Sandbox": isSandbox ? "true" : "false",
    },
    body: JSON.stringify({
      ...requestData,
      ...signaturePayload,
    }),
  });
};