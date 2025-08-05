import type { DatabaseEntity, StripeMode } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { StripeEntityCoordinator } from "@/durable-objects/stripe-entity-coordinator-do";
import type {
  AccountDurableObject,
  Databases,
} from "@/durable-objects/account-do";
import type { StripeTypeMap } from "@/entity-processor/entity-config";
import { Stripe } from "stripe";
import { getCoordinator } from "@/upload-coordinator/utils";
import { ENTITY_REGISTRY } from "./entity-registry";
import {
  EntityCache,
  NotionSyncService,
  DependencyProcessor,
  DiscountProcessor,
  type StepWrapper,
  type EntityDependencyProcessor,
} from "./services";
import { defaultStepWrapper } from "@/workflows/utils/default-step-wrapper";

interface ProcessingContext {
  stripeAccountId: string;
  stripeMode: StripeMode;
  notionToken: string;
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>;
  stripe: Stripe;
  account?: DurableObjectStub<AccountDurableObject>;
}

interface ProcessingResult {
  notionPageId?: string;
  entitiesProcessed: number;
}

interface ProcessingOptions {
  skipSubEntities?: boolean;
  skipDiscounts?: boolean;
  forceUpdate?: boolean;
  isForDependencyResolution?: boolean;
}

interface WorkflowProcessingParams {
  stripeAccountId: string;
  stripeMode: StripeMode;
  notionToken: string;
  coordinatorNamespace: DurableObjectNamespace<StripeEntityCoordinator>;
  stripe: Stripe;
  accountStub: DurableObjectStub<AccountDurableObject>;
}

export class EntityProcessor implements EntityDependencyProcessor {
  constructor(
    private context: ProcessingContext,
    private entityCache: EntityCache,
    private notionSyncService: NotionSyncService,
    private dependencyProcessor: DependencyProcessor,
    private discountProcessor: DiscountProcessor
  ) {}

  getEntitiesProcessedCount(): number {
    return this.entityCache.getProcessedCount();
  }

  private resetCounter(): void {
    this.entityCache.reset();
  }

  async processEntity<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databases: Databases,
    stepWrapper: StepWrapper = defaultStepWrapper,
    options: ProcessingOptions = {}
  ): Promise<{
    pageId: string | undefined;
    expandedEntity: StripeTypeMap[K] | undefined;
  }> {
    const {
      skipSubEntities = false,
      skipDiscounts = false,
      forceUpdate = false,
      isForDependencyResolution = false,
    } = options;

    const config = ENTITY_REGISTRY[entityType];
    if (!config) {
      throw new Error(`No configuration found for entity type: ${entityType}`);
    }

    if (!isForDependencyResolution) {
      this.resetCounter();
    }

    if (this.entityCache.isProcessed(entityType, entityId)) {
      console.log(
        `♻️ Entity ${entityType}:${entityId} already processed in this session, skipping full processing`
      );
      const handlerContext = this.createHandlerContext();
      const coordinator = getCoordinator(
        handlerContext,
        handlerContext.stripeMode,
        handlerContext.stripeAccountId
      );

      try {
        const mapping = await coordinator.getEntityMapping(
          entityType,
          entityId
        );
        return { pageId: mapping?.notionPageId, expandedEntity: undefined };
      } catch (error) {
        console.warn(
          `Failed to get cached page ID for ${entityType}:${entityId}:`,
          error
        );
        return { pageId: undefined, expandedEntity: undefined };
      }
    }

    this.entityCache.markProcessed(entityType, entityId);

    const handlerContext = this.createHandlerContext();

    const expandedEntity: StripeTypeMap[K] = await stepWrapper(
      `Retrieve ${entityType} ${entityId} from Stripe API`,
      async () => {
        return await config.retrieveFromStripe(handlerContext, entityId);
      }
    );

    const dependencyPageIds =
      await this.dependencyProcessor.resolveDependencies(
        entityType,
        expandedEntity,
        databases,
        stepWrapper
      );

    const syncResult = await this.notionSyncService.syncEntity(
      entityType,
      entityId,
      databases,
      dependencyPageIds,
      stepWrapper,
      forceUpdate,
      expandedEntity
    );

    const mainEntityPageId = syncResult.notionPageId;

    // If we don't have a main entity record ID but the entity was processed, 
    // try to get the existing record ID so we can still process discounts/sub-entities
    let effectivePageId = mainEntityPageId;
    if (!mainEntityPageId) {
      console.log(`⚠️ No main entity page ID returned from sync for ${entityType} ${entityId}, attempting to get existing record ID...`);
      try {
        const handlerContext = this.createHandlerContext();
        const coordinator = getCoordinator(handlerContext, handlerContext.stripeMode, handlerContext.stripeAccountId);
        const mapping = await coordinator.getEntityMapping(entityType, entityId);
        effectivePageId = mapping?.notionPageId;
        if (effectivePageId) {
          console.log(`✅ Found existing page ID for ${entityType} ${entityId}: ${effectivePageId}, will process discounts/sub-entities`);
        }
      } catch (error) {
        console.warn(`Failed to get existing mapping for ${entityType} ${entityId}:`, error);
      }
    }
    
    if (!effectivePageId) {
      console.log(`⚠️ No record ID available for ${entityType} ${entityId}, skipping sub-entity and discount processing`);
      return { pageId: mainEntityPageId, expandedEntity };
    }

    
    // If we don't have a main entity record ID but the entity was processed, 
    // we might still want to process discounts/sub-entities
    if (!mainEntityPageId) {
      console.log(`⚠️ No main entity record ID for ${entityType} ${entityId}, skipping sub-entity and discount processing`);
      return { pageId: mainEntityPageId, expandedEntity };
    }

    if (!skipSubEntities) {
      const subEntityProcessor = config.getSubEntityProcessor?.(
        handlerContext,
        this.dependencyProcessor
      );
      if (subEntityProcessor) {
        await subEntityProcessor.processSubEntities(
          expandedEntity,
          databases,
          effectivePageId,
          stepWrapper
        );
      }
    }

    if (
      !skipDiscounts &&
      (entityType === "customer" ||
        entityType === "invoice" ||
        entityType === "subscription" ||
        entityType === "invoiceitem")
    ) {
      console.log(`🎯 DISCOUNT PROCESSING: About to process discounts for ${entityType} ${entityId}, skipDiscounts=${skipDiscounts}, effectiveRecordId=${effectivePageId}`);
      await this.discountProcessor.processEntityDiscount(
        expandedEntity,
        entityType,
        databases,
        effectivePageId,
        stepWrapper
      );
    }

    return { pageId: mainEntityPageId, expandedEntity };
  }

  async processDiscountEvent(
    discountObject: StripeTypeMap["discount"],
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<ProcessingResult> {
    this.resetCounter();

    if (!databases.discount?.pageId) {
      console.warn("Discount database ID not available");
      return {
        entitiesProcessed: this.getEntitiesProcessedCount(),
      };
    }

    await this.discountProcessor.processDiscount(
      discountObject,
      databases,
      {},
      stepWrapper
    );

    return {
      notionPageId: undefined,
      entitiesProcessed: this.getEntitiesProcessedCount(),
    };
  }

  async processEntityComplete(
    entityType: DatabaseEntity,
    entityId: string,
    databases: Databases,
    stepWrapper?: StepWrapper
  ): Promise<ProcessingResult> {
    const result = await this.processEntity(
      entityType,
      entityId,
      databases,
      stepWrapper,
      { forceUpdate: true }
    );

    return {
      notionPageId: result.pageId,
      entitiesProcessed: this.getEntitiesProcessedCount(),
    };
  }

  private createHandlerContext(): HandlerContext {
    if (!this.context.account) {
      throw new Error("Account durable object is required for handler context");
    }

    return {
      stripeAccountId: this.context.stripeAccountId,
      stripeMode: this.context.stripeMode,
      notionToken: this.context.notionToken,
      stripe: this.context.stripe,
      account: this.context.account,
      env: {
        STRIPE_ENTITY_COORDINATOR: this.context.coordinatorNamespace,
      } as Pick<
        HandlerContext["env"],
        "STRIPE_ENTITY_COORDINATOR"
      > as HandlerContext["env"],
    };
  }

  static fromWebhook(handlerContext: HandlerContext): EntityProcessor {
    const context: ProcessingContext = {
      stripeAccountId: handlerContext.stripeAccountId,
      stripeMode: handlerContext.stripeMode,
      notionToken: handlerContext.notionToken,
      coordinatorNamespace: handlerContext.env.STRIPE_ENTITY_COORDINATOR,
      stripe: handlerContext.stripe,
      account: handlerContext.account,
    };

    const entityCache = new EntityCache();
    const notionSyncService = new NotionSyncService(handlerContext);
    const dependencyProcessor = new DependencyProcessor(
      {} as EntityDependencyProcessor
    );
    const discountProcessor = new DiscountProcessor(
      handlerContext,
      dependencyProcessor
    );

    const entityProcessor = new EntityProcessor(
      context,
      entityCache,
      notionSyncService,
      dependencyProcessor,
      discountProcessor
    );

    dependencyProcessor.entityProcessor = entityProcessor;

    return entityProcessor;
  }

  static fromWorkflow(params: WorkflowProcessingParams): EntityProcessor {
    const context: ProcessingContext = {
      stripeAccountId: params.stripeAccountId,
      stripeMode: params.stripeMode,
      notionToken: params.notionToken,
      coordinatorNamespace: params.coordinatorNamespace,
      stripe: params.stripe,
      account: params.accountStub,
    };

    const handlerContext = {
      stripeAccountId: params.stripeAccountId,
      stripeMode: params.stripeMode,
      notionToken: params.notionToken,
      stripe: params.stripe,
      account: params.accountStub,
      env: {
        STRIPE_ENTITY_COORDINATOR: params.coordinatorNamespace,
      } as Pick<
        HandlerContext["env"],
        "STRIPE_ENTITY_COORDINATOR"
      > as HandlerContext["env"],
    };

    const entityCache = new EntityCache();
    const notionSyncService = new NotionSyncService(handlerContext);
    const dependencyProcessor = new DependencyProcessor(
      {} as EntityDependencyProcessor
    );
    const discountProcessor = new DiscountProcessor(
      handlerContext,
      dependencyProcessor
    );

    const entityProcessor = new EntityProcessor(
      context,
      entityCache,
      notionSyncService,
      dependencyProcessor,
      discountProcessor
    );

    dependencyProcessor.entityProcessor = entityProcessor;

    return entityProcessor;
  }
}
