import type { SupportedEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { StripeEntityCoordinator } from "@/stripe-entity-coordinator";
import type { AccountDurableObject } from "@/account-do";
import type { DatabaseIds } from "@/workflow/types";
import { Stripe } from "stripe";
import {
  coordinatedUpsertCustomer,
  coordinatedUpsertProduct,
  coordinatedUpsertCharge,
  coordinatedUpsertPaymentIntent,
  coordinatedUpsertInvoice,
  coordinatedUpsertSubscription,
  coordinatedUpsertCreditNote,
  coordinatedUpsertDispute,
  coordinatedUpsertInvoiceItem,
  coordinatedUpsertPrice,
  coordinatedUpsertPromotionCode
} from "./coordinated-upsert";

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
    entityType: SupportedEntity,
    entityId: string,
    databaseIds: DatabaseIds,
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
      } as HandlerContext['env'],
      accountStatus: {} as HandlerContext['accountStatus']
    };

    // Note: forceUpdate is now built into the coordinated upsert functions

    switch (entityType) {
      case "customer":
        if (!databaseIds.customerDatabaseId) return undefined;
        return coordinatedUpsertCustomer(
          handlerContext,
          entityId,
          databaseIds.customerDatabaseId,
        );

      case "product":
        if (!databaseIds.productDatabaseId) return undefined;
        return coordinatedUpsertProduct(
          handlerContext,
          entityId,
          databaseIds.productDatabaseId,
        );

      case "charge":
        if (!databaseIds.chargeDatabaseId) return undefined;
        return coordinatedUpsertCharge(
          handlerContext,
          entityId,
          databaseIds.chargeDatabaseId,
          databaseIds.customerDatabaseId,
          databaseIds.paymentIntentDatabaseId,
        );

      case "payment_intent":
        if (!databaseIds.paymentIntentDatabaseId) return undefined;
        return coordinatedUpsertPaymentIntent(
          handlerContext,
          entityId,
          databaseIds.paymentIntentDatabaseId,
          databaseIds.customerDatabaseId,
        );

      case "invoice":
        if (!databaseIds.invoiceDatabaseId) return undefined;
        return coordinatedUpsertInvoice(
          handlerContext,
          entityId,
          databaseIds.invoiceDatabaseId,
          databaseIds.customerDatabaseId,
          databaseIds.subscriptionDatabaseId,
        );

      case "subscription":
        if (!databaseIds.subscriptionDatabaseId) return undefined;
        return coordinatedUpsertSubscription(
          handlerContext,
          entityId,
          databaseIds.subscriptionDatabaseId,
          databaseIds.customerDatabaseId,
        );

      case "credit_note":
        if (!databaseIds.creditNoteDatabaseId) return undefined;
        return coordinatedUpsertCreditNote(
          handlerContext,
          entityId,
          databaseIds.creditNoteDatabaseId,
          databaseIds.customerDatabaseId,
          databaseIds.invoiceDatabaseId,
        );

      case "dispute":
        if (!databaseIds.disputeDatabaseId) return undefined;
        return coordinatedUpsertDispute(
          handlerContext,
          entityId,
          databaseIds.disputeDatabaseId,
          databaseIds.chargeDatabaseId,
        );

      case "invoiceitem":
        if (!databaseIds.invoiceItemDatabaseId) return undefined;
        return coordinatedUpsertInvoiceItem(
          handlerContext,
          entityId,
          databaseIds.invoiceItemDatabaseId,
          databaseIds.customerDatabaseId,
          databaseIds.invoiceDatabaseId
        );

      case "price":
        if (!databaseIds.priceDatabaseId) return undefined;
        return coordinatedUpsertPrice(
          handlerContext,
          entityId,
          databaseIds.priceDatabaseId,
          databaseIds.productDatabaseId,
        );

      case "promotion_code":
        if (!databaseIds.promotionCodeDatabaseId) return undefined;
        return coordinatedUpsertPromotionCode(
          handlerContext,
          entityId,
          databaseIds.promotionCodeDatabaseId,
        );

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
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