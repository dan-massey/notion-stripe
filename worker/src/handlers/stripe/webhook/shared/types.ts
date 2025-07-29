import type { AccountStatus, AccountDurableObject } from "@/account-do";
import type { Env } from "@/types";
import type Stripe from "stripe";

export interface HandlerContext {
  stripe: Stripe;
  notionToken: string;
  stripeAccountId: string;
  accountStatus: AccountStatus;
  account: DurableObjectStub<AccountDurableObject>;
  env: Env["Bindings"];
}

export interface HandlerResult {
  success: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
}

export type WebhookEventHandler = (
  event: Stripe.Event,
  context: HandlerContext
) => Promise<HandlerResult>;