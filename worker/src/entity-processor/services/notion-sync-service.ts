import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { Databases } from "@/durable-objects/account-do";
import type { StripeTypeMap } from "@/entity-processor/entity-config";
import { coordinatedUpsert } from "@/upload-coordinator";
import { ENTITY_REGISTRY } from "../entity-registry";

export type StepWrapper = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

/**
 * Result of a sync operation
 */
export interface SyncResult {
  notionPageId?: string;
  success: boolean;
  error?: string;
}

/**
 * Service for syncing individual Stripe entities to Notion
 */
export class NotionSyncService {
  constructor(private handlerContext: HandlerContext) {}

  /**
   * Sync a single entity to Notion
   */
  async syncEntity<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databases: Databases,
    dependencyPageIds: Record<string, string | null> = {},
    stepWrapper?: StepWrapper,
    forceUpdate: boolean = false,
    preRetrievedEntity?: StripeTypeMap[K]
  ): Promise<SyncResult> {
    try {
      // Check if the main database for this entity exists
      if (!databases[entityType].pageId) {
        return {
          success: false,
          error: `Database for ${entityType} not found`
        };
      }

      const config = ENTITY_REGISTRY[entityType];
      if (!config) {
        return {
          success: false,
          error: `No configuration found for entity type: ${entityType}`
        };
      }

      // Get the entity data
      const expandedEntity = await this.getEntityData(
        entityType, 
        entityId, 
        config, 
        preRetrievedEntity, 
        stepWrapper
      );

      // Convert to Notion properties
      const notionProperties = config.convertToNotionProperties(
        expandedEntity,
        dependencyPageIds
      );

      // Perform the coordinated upsert
      const notionPageId = await this.upsertToNotion(
        entityType,
        entityId,
        databases[entityType].pageId!,
        notionProperties,
        forceUpdate,
        stepWrapper
      );

      if (notionPageId) {
        console.log(`✅ Successfully synced ${entityType} ${entityId}`);
        return {
          notionPageId,
          success: true
        };
      }

      return {
        success: false,
        error: `Failed to upsert ${entityType} to Notion`
      };

    } catch (error) {
      console.error(`❌ Failed to sync ${entityType} ${entityId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get entity data from Stripe or use pre-retrieved entity
   */
  private async getEntityData<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    config: any,
    preRetrievedEntity?: StripeTypeMap[K],
    stepWrapper?: StepWrapper
  ): Promise<StripeTypeMap[K]> {
    if (preRetrievedEntity) {
      return preRetrievedEntity;
    }

    if (stepWrapper) {
      return await stepWrapper(
        `Retrieve ${entityType} ${entityId} from Stripe API`,
        async () => {
          return await config.retrieveFromStripe(this.handlerContext, entityId);
        }
      );
    } else {
      return await config.retrieveFromStripe(this.handlerContext, entityId);
    }
  }

  /**
   * Upsert entity to Notion
   */
  private async upsertToNotion<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databaseId: string,
    notionProperties: any,
    forceUpdate: boolean,
    stepWrapper?: StepWrapper
  ): Promise<string | undefined> {
    if (stepWrapper) {
      return await stepWrapper(
        `Upsert ${entityType} ${entityId} to Notion`,
        async () => {
          return await coordinatedUpsert(
            this.handlerContext,
            entityType,
            entityId,
            databaseId,
            notionProperties,
            forceUpdate
          );
        }
      );
    } else {
      return await coordinatedUpsert(
        this.handlerContext,
        entityType,
        entityId,
        databaseId,
        notionProperties,
        forceUpdate
      );
    }
  }
}