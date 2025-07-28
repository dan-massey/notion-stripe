// NOTE: Using relative imports instead of @/ path mapping in this file only.
// This is because the stripe-app imports types from this file, and TypeScript
// cross-compilation fails when the stripe-app tries to resolve the worker's @/ paths.
// Using relative imports keeps this file self-contained for cross-workspace usage.
import type { HelloWorldResponse } from "./handlers/stripe/helloworld";
import type { SearchResult } from "./utils/notion-api";
import type { StripeMode, BackfillWorkflowStatus } from "./types";
import type { AccountStatus } from "./account-do";
import {
  clearDatabaseLinks,
  deleteNotionAuth,
  getNotionLink,
  getNotionPages,
  setUpDatabases,
  validateAuth,
} from "./handlers/stripe/notion";
import { getMembership } from "./handlers/stripe/membership";
import { helloWorldHandler } from "./handlers/stripe/helloworld";
import { getBackfillStatus, startBackfill } from "./handlers/stripe/backfill";

export type AccountResponse = {
  checkoutUrl: string;
  stripeMode?: StripeMode;
  stripeAccountId?: string;
  stripeUserId?: string;
  account?: AccountStatus;
  manageSubscriptionUrl?: string;
};

type EndpointInfo<T = any> = {
  path: `/stripe/${string}`;
  methods: Array<"POST" | "GET">;
  response: T;
  handler: any;
};

export const ENDPOINTS = {
  helloworld: {
    path: "/stripe/helloworld",
    methods: ["POST"],
    response: {} as HelloWorldResponse,
    handler: helloWorldHandler,
  },
  membership: {
    path: "/stripe/membership",
    methods: ["GET", "POST"],
    response: {} as AccountResponse,
    handler: getMembership,
  },
  notionLink: {
    path: "/stripe/notion-auth/link",
    methods: ["GET"],
    response: {} as { url: string },
    handler: getNotionLink,
  },
  validateNotionAuth: {
    path: "/stripe/notion-auth/validate",
    methods: ["GET"],
    response: {} as { authed: boolean },
    handler: validateAuth,
  },
  notionPages: {
    path: "/stripe/notion/pages",
    methods: ["GET"],
    response: {} as SearchResult,
    handler: getNotionPages,
  },
  setUpDatabases: {
    path: "/stripe/notion/databases",
    methods: ["POST"],
    response: {} as AccountStatus,
    handler: setUpDatabases,
  },
  clearDatabases: {
    path: "/stripe/notion/databases/clear",
    methods: ["POST"],
    response: {} as AccountStatus,
    handler: clearDatabaseLinks,
  },
  deleteNotionAuth: {
    path: "/stripe/notion-auth/delete",
    methods: ["POST"],
    response: {} as AccountStatus,
    handler: deleteNotionAuth,
  },
  startBackfill: {
    path: "/stripe/backfill",
    methods: ["POST"],
    response: {} as { status: BackfillWorkflowStatus },
    handler: startBackfill,
  },
  getBackfillStatus: {
    path: "/stripe/backfill/status",
    methods: ["GET"],
    response: {} as { status: BackfillWorkflowStatus },
    handler: getBackfillStatus,
  },
} as const satisfies Record<string, EndpointInfo>;

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
export type ResponseForEndpoint<T extends string> =
  T extends keyof EndpointResponseMap ? EndpointResponseMap[T] : never;

export type NotionSecretName = "NOTION_AUTH_TOKEN";
