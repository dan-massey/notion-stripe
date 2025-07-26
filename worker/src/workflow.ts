import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import type { StripeMode } from "@/types";
import { Stripe } from "stripe";
import { stripeCustomerToNotionProperties } from "@/utils/customer";
import { stripeChargeToNotionProperties } from "@/utils/charge";
import { stripeInvoiceToNotionProperties } from "@/utils/invoice";
import { stripeSubscriptionToNotionProperties } from "@/utils/subscription";
import { NOTION_SECRET_NAME } from "@/utils/stripe";
import { upsertPageByTitle } from "@/utils/notion";
import { getStatus, setStatus } from "@/utils/backfillStatus";

const ALL_ENTITIES = ["customer", "charge", "invoice", "subscription"] as const;
type Entity = (typeof ALL_ENTITIES)[number];
type StripeEntities =
  | Stripe.Customer
  | Stripe.Invoice
  | Stripe.Charge
  | Stripe.Subscription;

type BackfillTaskStatus = {
  started: boolean;
  completed: boolean;
  startingAfter: string | undefined;
};

type Params = {
  stripeAccountId: string;
  stripeMode: StripeMode;
  entitiesToBackfill: Array<Entity>;
  entityStatus: Record<Entity, BackfillTaskStatus>;
  entitiesProcessed: number;
};

export class BackfillWorkflow extends WorkflowEntrypoint<
  CloudflareBindings,
  Params
> {
  getStripe = (stripeMode: StripeMode) => {
    let secret: string = this.env.STRIPE_TEST_KEY;
    if (stripeMode === "live") {
      secret = this.env.STRIPE_LIVE_KEY;
    } else if (stripeMode === "sandbox") {
      secret = this.env.STRIPE_SANDBOX_KEY;
    }
    return new Stripe(secret, {
      typescript: true,
    });
  };

  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const entityToBackfill: Entity | null = await step.do(
      "Determine entity to backfill",
      async () => {
        const params = event.payload;
        return (
          params.entitiesToBackfill.find(
            (entityName) =>
              !params.entityStatus[entityName].started ||
              !params.entityStatus[entityName].completed
          ) || null
        );
      }
    );

    if (!entityToBackfill) {
      await step.do("Mark status KV as completed", async () => {
        const status = await getStatus(
          this.env.BACKFILL_KV,
          event.payload.stripeMode,
          event.payload.stripeAccountId
        );
        if (!status) {
          return;
        }
        await setStatus(
          this.env.BACKFILL_KV,
          event.payload.stripeMode,
          event.payload.stripeAccountId,
          {
            ...status,
            recordsProcessed: event.payload.entitiesProcessed,
            status: "complete",
            finishedAt: new Date().valueOf(),
          }
        );
      });
      return;
    }

    const stripeListResults = await step.do(
      "Get expanded list with one object from Stripe",
      async () => {
        const params = event.payload;
        const stripe = this.getStripe(params.stripeMode);

        const listOptions = {
          limit: 1,
          starting_after: params.entityStatus[entityToBackfill].startingAfter,
        };
        const requestOptions = { stripeAccount: params.stripeAccountId };

        switch (entityToBackfill) {
          case "customer":
            return await stripe.customers.list(
              {
                ...listOptions,
                expand: [
                  "data.subscriptions",
                  "data.sources",
                  "data.invoice_settings.default_payment_method",
                  "data.default_source",
                ],
              },
              requestOptions
            );
          case "charge":
            return await stripe.charges.list(
              {
                ...listOptions,
                expand: ["data.invoice", "data.balance_transaction"],
              },
              requestOptions
            );
          case "invoice":
            return await stripe.invoices.list(
              {
                ...listOptions,
                expand: [
                  "data.customer",
                  "data.subscription",
                  "data.payment_intent",
                  "data.default_payment_method",
                  "data.default_source",
                ],
              },
              requestOptions
            );
          case "subscription":
            return await stripe.subscriptions.list(
              {
                ...listOptions,
                expand: [
                  "data.customer",
                  "data.latest_invoice",
                  "data.default_payment_method",
                  "data.default_source",
                ],
              },
              requestOptions
            );
          default:
            throw new Error(`Unsupported entity: ${entityToBackfill}`);
        }
      }
    );

    const isCustomer = (entity: StripeEntities): entity is Stripe.Customer => {
      return entityToBackfill === "customer";
    };

    const isCharge = (entity: StripeEntities): entity is Stripe.Charge => {
      return entityToBackfill === "charge";
    };

    const isInvoice = (entity: StripeEntities): entity is Stripe.Invoice => {
      return entityToBackfill === "invoice";
    };

    const isSubscription = (
      entity: StripeEntities
    ): entity is Stripe.Subscription => {
      return entityToBackfill === "subscription";
    };

    const notionProperties = await step.do(
      "Convert the stripe object to notion properties",
      async () => {
        const firstItem = stripeListResults.data[0];
        switch (entityToBackfill) {
          case "customer":
            if (isCustomer(firstItem)) {
              return stripeCustomerToNotionProperties(firstItem);
            }
            throw new Error("Expected customer object");
          case "charge":
            if (isCharge(firstItem)) {
              return stripeChargeToNotionProperties(firstItem);
            }
            throw new Error("Expected charge object");
          case "invoice":
            if (isInvoice(firstItem)) {
              return stripeInvoiceToNotionProperties(firstItem);
            }
            throw new Error("Expected invoice object");
          case "subscription":
            if (isSubscription(firstItem)) {
              return stripeSubscriptionToNotionProperties(firstItem);
            }
            throw new Error("Expected subscription object");
          default:
            throw new Error(`Unsupported entity: ${entityToBackfill}`);
        }
      }
    );

    const notionToken = await step.do("Get notion token", async () => {
      const stripe = this.getStripe(event.payload.stripeMode);
      try {
        const notionSecret = await stripe.apps.secrets.find(
          {
            name: NOTION_SECRET_NAME,
            scope: {
              type: "account",
            },
            expand: ["payload"],
          },
          {
            stripeAccount: event.payload.stripeAccountId,
          }
        );
        return notionSecret.payload;
      } catch (e) {
        return null;
      }
    });

    if (!notionToken) {
      return;
    }

    const databaseIds = await step.do("Get membership info", async () => {
      const id = this.env.MEMBERSHIP_DURABLE_OBJECT.idFromName(
        event.payload.stripeAccountId
      );
      const membershipDo = this.env.MEMBERSHIP_DURABLE_OBJECT.get(id);
      const info = await membershipDo.getStatus();

      return {
        subscriptionDatabaseId: info?.subscriptionDatabaseId,
        customerDatabaseId: info?.customerDatabaseId,
        chargeDatabaseId: info?.chargeDatabaseId,
        invoiceDatabaseId: info?.invoiceDatabaseId,
      };
    });

    await step.do("Write to notion", async () => {
      const obj = stripeListResults.data[0];
      switch (entityToBackfill) {
        case "customer":
          databaseIds.customerDatabaseId &&
            obj.id &&
            (await upsertPageByTitle(
              notionToken,
              databaseIds.customerDatabaseId,
              "Customer ID",
              obj.id,
              notionProperties
            ));
          break;
        case "charge":
          databaseIds.chargeDatabaseId &&
            obj.id &&
            (await upsertPageByTitle(
              notionToken,
              databaseIds.chargeDatabaseId,
              "Charge ID",
              obj.id,
              notionProperties
            ));
          break;
        case "invoice":
          databaseIds.invoiceDatabaseId &&
            obj.id &&
            (await upsertPageByTitle(
              notionToken,
              databaseIds.invoiceDatabaseId,
              "Invoice ID",
              obj.id,
              notionProperties
            ));
          break;
        case "subscription":
          databaseIds.subscriptionDatabaseId &&
            obj.id &&
            (await upsertPageByTitle(
              notionToken,
              databaseIds.subscriptionDatabaseId,
              "Subscription ID",
              obj.id,
              notionProperties
            ));
          break;
        default:
          throw new Error(`Unsupported entity: ${entityToBackfill}`);
      }
    });

    await step.do("update workflow status kv", async () => {
      const status = await getStatus(
        this.env.BACKFILL_KV,
        event.payload.stripeMode,
        event.payload.stripeAccountId
      );
      if (!status) {
        return;
      }
      await setStatus(
        this.env.BACKFILL_KV,
        event.payload.stripeMode,
        event.payload.stripeAccountId,
        {
          ...status,
          recordsProcessed: event.payload.entitiesProcessed + 1,
        }
      );
    });

    await step.do("start next workflow", async () => {
      const newParams: Params = { ...event.payload };
      newParams.entityStatus[entityToBackfill].started = true;
      newParams.entityStatus[entityToBackfill].completed =
        !stripeListResults.has_more;
      newParams.entitiesProcessed = event.payload.entitiesProcessed + 1;

      const lastIdInResult =
        stripeListResults.data[stripeListResults.data.length - 1].id;
      if (stripeListResults.has_more && stripeListResults.data.length > 0) {
        newParams.entityStatus[entityToBackfill].startingAfter = lastIdInResult;
      }

      await this.env.BACKFILL_WORKFLOW.create({
        params: newParams,
      });
    });
  }
}
