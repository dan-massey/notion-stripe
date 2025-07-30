import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { StripeEntityCoordinator } from "@/stripe-entity-coordinator";
import type { AccountDurableObject, Databases } from "@/account-do";
import { Stripe } from "stripe";
import { coordinatedUpsert } from "./coordinated-upsert";

interface ProcessingContext {
  stripeAccountId: string;
  notionToken: string;
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>;
  stripe: Stripe;
  account?: DurableObjectStub<AccountDurableObject>;
}

interface WorkflowProcessingParams {
  stripeAccountId: string;
  notionToken: string;
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>;
  stripe: Stripe;
  accountStub: DurableObjectStub<AccountDurableObject>;
}

interface ProcessingOptions {
  forceUpdate?: boolean;
}

export class EntityProcessor {
  constructor(private context: ProcessingContext) {}

  /**
   * Process any supported entity type using the appropriate coordinated upsert function
   */
  async processEntity(
    entityType: DatabaseEntity,
    entityId: string,
    databases: Databases,
    options: ProcessingOptions = {}
  ): Promise<string | undefined> {
    // Create handler context that coordinated upsert functions expect
    const handlerContext: HandlerContext = {
      stripeAccountId: this.context.stripeAccountId,
      notionToken: this.context.notionToken,
      stripe: this.context.stripe,
      account: this.context.account || {} as DurableObjectStub<AccountDurableObject>,
      env: {
        STRIPE_ENTITY_COORDINATOR: this.context.coordinatorNamespace
      } as HandlerContext['env']
    };

    // Check if the main database for this entity exists
    if (!databases[entityType].pageId) {
      return undefined;
    }

    // Build database IDs object - include all possible dependencies
    const databaseIds: Record<string, string | undefined> = {};
    for (const [key, db] of Object.entries(databases)) {
      databaseIds[key] = db.pageId;
    }

    // Use the new generic coordinated upsert system
    return coordinatedUpsert(handlerContext, entityType, entityId, {
      databaseIds: databaseIds
    });
  }

  /**
   * Create EntityProcessor from webhook handler context
   */
  static fromWebhook(handlerContext: HandlerContext): EntityProcessor {
    return new EntityProcessor({
      stripeAccountId: handlerContext.stripeAccountId,
      notionToken: handlerContext.notionToken,
      coordinatorNamespace: handlerContext.env.STRIPE_ENTITY_COORDINATOR,
      stripe: handlerContext.stripe,
      account: handlerContext.account
    });
  }

  /**
   * Create EntityProcessor from workflow parameters
   */
  static fromWorkflow(params: WorkflowProcessingParams): EntityProcessor {
    return new EntityProcessor({
      stripeAccountId: params.stripeAccountId,
      notionToken: params.notionToken,
      coordinatorNamespace: params.coordinatorNamespace,
      stripe: params.stripe,
      account: params.accountStub
    });
  }
}