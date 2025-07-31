import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import type {
  StripeMode,
  DatabaseEntity,
  StripeApiObjectKinds,
  StripeApiObject,
  ApiStripeObject,
} from "@/types";
import { Stripe } from "stripe";
import { EntityProcessor } from "@/entity-processor/entity-processor-refactored";
import { getNotionToken } from "@/workflow-utils/get-notion-token";
import { getAccountStub } from "@/workflow-utils/get-account-stub";
import { Databases } from "@/durable-objects/account-do";
import { getStripe } from "@/workflow-utils/get-stripe";

const WEBHOOK_OBJECT_KINDS: StripeApiObjectKinds = [
  "customer",
  "invoice",
  "charge",
  "subscription",
  "credit_note",
  "dispute",
  "invoiceitem",
  "price",
  "product",
  "coupon",
  "promotion_code",
  "payment_intent",
  "subscription_item",
  "discount",
];

function isSupportedObjectType(
  objectType: string
): objectType is StripeApiObject {
  return WEBHOOK_OBJECT_KINDS.includes(objectType as StripeApiObject);
}

export type WorkflowParams = {
  stripeMode: StripeMode;
  stripeAccountId: string;
  databases: Databases;
  stripeEvent: Stripe.Event;
};

export class WebhookEventWorkflow extends WorkflowEntrypoint<
  CloudflareBindings,
  WorkflowParams
> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const accountStub = getAccountStub(this.env, event.payload.stripeAccountId);
    const subscription = await step.do("Get account subscription", async () => {
      const status = await accountStub.getStatus();
      return status?.subscription;
    });

    if (
      subscription?.stripeSubscriptionId &&
      !["active", "trialing", "past_due"].includes(
        subscription?.stripeSubscriptionStatus ?? ""
      )
    ) {
      step.do(
        `[Webhook Workflow] No active subscription ${event.payload.stripeMode}: ${event.payload.stripeAccountId} - not syncing event to Notion.`,
        async () => {
          console.log(
            `[Webhook Workflow] No active subscription ${event.payload.stripeMode}: ${event.payload.stripeAccountId} - not syncing event to Notion.`
          );
        }
      );
      return;
    }

    const notionToken = await step.do("Get notion token", async () => {
      const stripe = getStripe(this.env, event.payload.stripeMode);
      return getNotionToken(stripe, event.payload.stripeAccountId);
    });

    if (!notionToken) {
      return;
    }

    const stripeEvent = event.payload.stripeEvent;
    const eventType = stripeEvent.type;
    const objectType = stripeEvent.data.object.object;
    const stripeAccountId = event.payload.stripeAccountId;

    console.log(
      `Processing ${eventType} / ${objectType} event for account ${stripeAccountId}`
    );

    const stripeObject: ApiStripeObject | undefined = await step.do(
      "Validate this is a supported object type",
      async () => {
        if (!isSupportedObjectType(objectType)) {
          return;
        }
        return stripeEvent.data.object as ApiStripeObject;
      }
    );

    if (!stripeObject) {
      step.do(
        `[Webhook Workflow] Unsupported object type ${objectType}`,
        async () => {
          console.log(
            `[Webhook Workflow] Unsupported object type ${objectType}`
          );
        }
      );
      return;
    }

    if (!stripeObject.id) {
      step.do(
        `[Webhook Workflow] Object ${objectType} missing ID`,
        async () => {
          console.log(`[Webhook Workflow] Object ${objectType} missing ID`);
        }
      );

      return;
    }

    const stripe = getStripe(this.env, event.payload.stripeMode);
    const entityProcessor = EntityProcessor.fromWorkflow({
      stripeAccountId: event.payload.stripeAccountId,
      notionToken,
      coordinatorNamespace: this.env.STRIPE_ENTITY_COORDINATOR,
      stripe,
      accountStub,
    });

    const stepWrapper = (name: string, fn: () => Promise<any>) =>
      step.do(name, fn);

    if (objectType === "discount") {
      await step.do(
        `Process discount: ${eventType} ${stripeObject.id}`,
        async () => {
          await entityProcessor.processDiscountEvent(
            stripeObject as Stripe.Discount,
            event.payload.databases,
            stepWrapper
          );
        }
      );
      return;
    }

    // Process the main entity with all its sub-entities using EntityProcessor
    await step.do(
      `Process event with sub-entities: ${eventType} ${stripeObject.id}`,
      async () => {
        if (!stripeObject.id) {
          return null;
        }
        await entityProcessor.processEntityComplete(
          objectType as DatabaseEntity,
          stripeObject.id,
          event.payload.databases,
          stepWrapper
        );
      }
    );
  }
}
