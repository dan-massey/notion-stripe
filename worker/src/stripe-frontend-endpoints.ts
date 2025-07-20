import type { MembershipResponse } from "@/handlers/membership";
import type { HelloWorldResponse } from "@/handlers/stripe";

export const ENDPOINTS = {
  helloworld: {
    path: "/stripe",
    methods: ["POST"],
    response: {} as HelloWorldResponse,
  },
  membership: {
    path: "/stripe/membership",
    methods: ["GET", "POST"],
    response: {} as MembershipResponse,
  },
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