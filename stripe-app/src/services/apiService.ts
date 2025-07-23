import { SignaturePayload, StripeMode } from "@/types";
import { fetchStripeSignature } from "@stripe/ui-extension-sdk/utils";
import type {
  PostEndpoint,
  GetEndpoint,
} from "@worker/stripe-frontend-endpoints";

const makeHeaders = (
  stripeSignature: string,
  apiSignaturePayload: SignaturePayload,
  mode: StripeMode,
  isSandbox: boolean
) => {
  return {
    "Content-Type": "application/json",
    "Stripe-Signature": stripeSignature,
    "X-Stripe-Account-Id": apiSignaturePayload.account_id,
    "X-Stripe-User-Id": apiSignaturePayload.user_id,
    "X-Stripe-Mode": mode,
    "X-Stripe-Is-Sandbox": isSandbox ? "true" : "false",
  };
};

export const makeApiPost = async <T extends PostEndpoint>({
  apiUrl,
  endpoint,
  entityId,
  mode,
  isSandbox,
  apiSignaturePayload,
  requestData,
}: {
  apiUrl: string;
  endpoint: T;
  entityId: string | null;
  mode: StripeMode;
  isSandbox: boolean;
  apiSignaturePayload: SignaturePayload;
  requestData: object;
}): Promise<Response> => {
  const stripeSignature = await fetchStripeSignature();
  console.log("MAKING API POST");
  return fetch(`${apiUrl}${endpoint}${entityId ? `/${entityId}` : ""}`, {
    body: JSON.stringify({
      ...requestData,
    }),
    headers: makeHeaders(stripeSignature, apiSignaturePayload, mode, isSandbox),
    method: "POST",
  });
};

export const makeApiGet = async ({
  apiUrl,
  endpoint,
  entityId,
  params,
  mode,
  isSandbox,
  apiSignaturePayload,
}: {
  apiUrl: string;
  endpoint: GetEndpoint;
  entityId: string | null;
  params: Record<string, string> | null;
  mode: StripeMode;
  isSandbox: boolean;
  apiSignaturePayload: SignaturePayload;
}) => {
  const stripeSignature = await fetchStripeSignature();
  return fetch(
    `${apiUrl}${endpoint}${
      entityId ? `/${entityId}` : ""
    }?${new URLSearchParams(params ?? {})}`,
    {
      headers: makeHeaders(
        stripeSignature,
        apiSignaturePayload,
        mode,
        isSandbox
      ),
      method: "GET",
    }
  );
};
