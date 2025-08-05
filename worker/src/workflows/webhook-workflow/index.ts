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
import { getNotionToken } from "@/workflows/utils/get-notion-token";
import { getAccountStubFromBindings } from "@/durable-objects/utils";
import { Databases } from "@/durable-objects/account-do";
import { getStripe } from "@/workflows/utils/get-stripe";

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
    const accountStub = getAccountStubFromBindings(this.env, event.payload.stripeMode, event.payload.stripeAccountId);
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

    const validatedObject = await step.do(
      "Validate this is a supported object type",
      async () => {
        const stripeEvent = event.payload.stripeEvent;
        const eventType = stripeEvent.type;
        const objectType = stripeEvent.data.object.object;
        const stripeAccountId = event.payload.stripeAccountId;

        console.log(
          `Processing ${eventType} / ${objectType} event for account ${stripeAccountId}`
        );

        if (!isSupportedObjectType(objectType)) {
          return { stripeObject: null, eventType, objectType, stripeAccountId };
        }
        return {
          stripeObject: stripeEvent.data.object as ApiStripeObject,
          eventType,
          objectType,
          stripeAccountId,
        };
      }
    );

    if (!validatedObject.stripeObject) {
      step.do(
        `[Webhook Workflow] Unsupported object type ${validatedObject.objectType}`,
        async () => {
          console.log(
            `[Webhook Workflow] Unsupported object type ${validatedObject.objectType}`
          );
        }
      );
      return;
    }

    if (!validatedObject.stripeObject.id) {
      step.do(
        `[Webhook Workflow] Object ${validatedObject.objectType} missing ID`,
        async () => {
          console.log(
            `[Webhook Workflow] Object ${validatedObject.objectType} missing ID`
          );
        }
      );

      return;
    }

    if (validatedObject.objectType === "discount") {
      await step.do(
        `Process discount: ${validatedObject.eventType} ${validatedObject.stripeObject.id}`,
        async () => {
          const stripe = getStripe(this.env, event.payload.stripeMode);
          const entityProcessor = EntityProcessor.fromWorkflow({
            stripeAccountId: event.payload.stripeAccountId,
            stripeMode: event.payload.stripeMode,
            notionToken,
            coordinatorNamespace: this.env.STRIPE_ENTITY_COORDINATOR,
            stripe,
            accountStub,
          });

          const stepWrapper = (name: string, fn: () => Promise<any>) =>
            step.do(name, fn);

          await entityProcessor.processDiscountEvent(
            validatedObject.stripeObject as Stripe.Discount,
            event.payload.databases,
            stepWrapper
          );
        }
      );
      return;
    }

    // Process the main entity with all its sub-entities using EntityProcessor
    await step.do(
      `Process event with sub-entities: ${validatedObject.eventType} ${validatedObject.stripeObject.id}`,
      async () => {
        if (!validatedObject.stripeObject.id) {
          return null;
        }
        const stripe = getStripe(this.env, event.payload.stripeMode);
        const entityProcessor = EntityProcessor.fromWorkflow({
          stripeAccountId: event.payload.stripeAccountId,
          stripeMode: event.payload.stripeMode,
          notionToken,
          coordinatorNamespace: this.env.STRIPE_ENTITY_COORDINATOR,
          stripe,
          accountStub,
        });

        const stepWrapper = (name: string, fn: () => Promise<any>) =>
          step.do(name, fn);
        await entityProcessor.processEntityComplete(
          validatedObject.objectType as DatabaseEntity,
          validatedObject.stripeObject.id,
          event.payload.databases,
          stepWrapper
        );
      }
    );
  }
}
