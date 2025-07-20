import React, { createContext, useContext, ReactNode } from "react";
import { makeApiPost, makeApiGet } from "./apiService";
import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import type {
  PostEndpoint,
  GetEndpoint,
  ResponseForEndpoint,
} from "@worker/stripe-frontend-endpoints";

interface ApiContextType {
  // Raw response methods (existing behavior)
  post: (
    endpoint: PostEndpoint,
    entityId?: string | null,
    requestData?: object
  ) => Promise<Response>;
  get: (
    endpoint: GetEndpoint,
    entityId?: string | null,
    params?: Record<string, string> | null
  ) => Promise<Response>;
  // Typed response methods (new - automatically parse JSON with correct types)
  postTyped: <T extends PostEndpoint>(
    endpoint: T,
    entityId?: string | null,
    requestData?: object
  ) => Promise<ResponseForEndpoint<T>>;
  getTyped: <T extends GetEndpoint>(
    endpoint: T,
    entityId?: string | null,
    params?: Record<string, string> | null
  ) => Promise<ResponseForEndpoint<T>>;
  userContext: ExtensionContextValue["userContext"];
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

interface ApiProviderProps {
  children: ReactNode;
  userContext: ExtensionContextValue["userContext"];
  environment: ExtensionContextValue["environment"];
  apiUrl: string;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  userContext,
  environment,
  apiUrl,
}) => {
  const post = async (
    endpoint: PostEndpoint,
    entityId: string | null = null,
    requestData: object = {}
  ) => {
    return makeApiPost({
      apiUrl,
      endpoint,
      entityId,
      mode: environment.mode,
      isSandbox: userContext.account.isSandbox,
      apiSignaturePayload: {
        user_id: userContext.id || "",
        account_id: userContext.account.id || "",
      },
      requestData,
    });
  };

  const get = async (
    endpoint: GetEndpoint,
    entityId: string | null = null,
    params: Record<string, string> | null = null
  ) => {
    return makeApiGet({
      apiUrl,
      endpoint,
      entityId,
      params,
      mode: environment.mode,
      isSandbox: userContext.account.isSandbox,
      apiSignaturePayload: {
        user_id: userContext.id || "",
        account_id: userContext.account.id || "",
      },
    });
  };

  // Typed wrapper methods that automatically parse JSON responses
  const postTyped = async <T extends PostEndpoint>(
    endpoint: T,
    entityId: string | null = null,
    requestData: object = {}
  ): Promise<ResponseForEndpoint<T>> => {
    const response = await post(endpoint, entityId, requestData);
    if (!response.ok) {
      throw new Error(`API POST failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<ResponseForEndpoint<T>>;
  };

  const getTyped = async <T extends GetEndpoint>(
    endpoint: T,
    entityId: string | null = null,
    params: Record<string, string> | null = null
  ): Promise<ResponseForEndpoint<T>> => {
    const response = await get(endpoint, entityId, params);
    if (!response.ok) {
      throw new Error(`API GET failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<ResponseForEndpoint<T>>;
  };

  return (
    <ApiContext.Provider value={{ post, get, postTyped, getTyped, userContext }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
};