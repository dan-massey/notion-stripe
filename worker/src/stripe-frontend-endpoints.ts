// NOTE: Using relative imports instead of @/ path mapping in this file only.
// This is because the stripe-app imports types from this file, and TypeScript
// cross-compilation fails when the stripe-app tries to resolve the worker's @/ paths.
// Using relative imports keeps this file self-contained for cross-workspace usage.
import type { MembershipResponse } from "./handlers/stripe/membership";
import type { HelloWorldResponse } from "./handlers/stripe/helloworld";
import type { NotionPagesResponse } from "./handlers/stripe/notion";



export const ENDPOINTS = {
  helloworld: {
    path: "/stripe/helloworld",
    methods: ["POST"],
    response: {} as HelloWorldResponse,
  },
  membership: {
    path: "/stripe/membership",
    methods: ["GET", "POST"],
    response: {} as MembershipResponse,
  },
  notionLink: {
    path: "/stripe/notion-auth/link",
    methods: ["GET"],
    response: {} as { url: string },
  },
  notionPages: {
    path: "/stripe/notion/pages",
    methods: ["GET"],
    response: {} as NotionPagesResponse,
  }
} as const;


// Auto-generate endpoint lists from ENDPOINTS
export type EndpointKey = keyof typeof ENDPOINTS;
type MethodType = "GET" | "POST";

type EndpointsWithMethod<M extends MethodType> = {
  [K in EndpointKey]: M extends (typeof ENDPOINTS)[K]["methods"][number] 
    ? (typeof ENDPOINTS)[K]["path"] 
    : never;
}[EndpointKey];

export type PostEndpoint = EndpointsWithMethod<"POST">;
export type GetEndpoint = EndpointsWithMethod<"GET">;

// Auto-generate response map
type EndpointResponseMap = {
  [K in EndpointKey as (typeof ENDPOINTS)[K]["path"]]: (typeof ENDPOINTS)[K]["response"];
};

// Helper function to get response type for an endpoint
export type ResponseForEndpoint<T extends string> = T extends keyof EndpointResponseMap 
  ? EndpointResponseMap[T] 
  : never;

export type NotionSecretName = "NOTION_AUTH_TOKEN";