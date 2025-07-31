import { DurableObject } from "cloudflare:workers";
import type { DatabaseEntity } from "@/types";
import { findPageByTitle } from "@/utils/notion-api";

export interface EntityMapping {
  stripeId: string;
  notionPageId: string;
  entityType: DatabaseEntity;
  createdAt: number;
  updatedAt: number;
  dataHash?: string;
}

export interface CoordinatedUpsertOptions {
  entityType: DatabaseEntity;
  stripeId: string;
  notionToken: string;
  databaseId: string;
  titleProperty: string;
  updateHash: string;
  upsertOperation: () => Promise<{ id: string; [key: string]: any }>;
  forceUpdate?: boolean;
}

export class StripeEntityCoordinator extends DurableObject {
  private inProgress = new Map<string, Promise<EntityMapping>>();

  async alarm(): Promise<void> {
    const list = await this.ctx.storage.list<EntityMapping>({
      prefix: "entity:",
    });
    const now = Date.now();
    const EXPIRY_MS = 1000 * 60 * 60 * 24 * 1; // 1 day
    for (const [key, mapping] of list) {
      if ((mapping as EntityMapping).updatedAt < now - EXPIRY_MS) {
        await this.ctx.storage.delete(key);
      }
    }
    await this.ctx.storage.setAlarm(now + EXPIRY_MS);
  }

  async getEntityMapping(
    entityType: DatabaseEntity,
    stripeId: string
  ): Promise<EntityMapping | null> {
    const key = this.getStorageKey(entityType, stripeId);
    const mapping = await this.ctx.storage.get<EntityMapping>(key);
    return mapping || null;
  }

  private async setEntityMapping(
    entityType: DatabaseEntity,
    stripeId: string,
    notionPageId: string,
    dataHash?: string
  ): Promise<EntityMapping> {
    const key = this.getStorageKey(entityType, stripeId);
    const now = Date.now();
    const existing = await this.ctx.storage.get<EntityMapping>(key);
    const mapping: EntityMapping = {
      stripeId,
      notionPageId,
      entityType,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      dataHash,
    };

    await this.ctx.storage.put(key, mapping);
    return mapping;
  }

  /**
   * Check if an entity mapping exists
   */
  private async hasEntityMapping(
    entityType: DatabaseEntity,
    stripeId: string
  ): Promise<boolean> {
    const key = this.getStorageKey(entityType, stripeId);
    const exists = await this.ctx.storage.get(key);
    return exists !== undefined;
  }

  /**
   * Coordinated upsert that prevents race conditions
   */
  async coordinatedUpsert(
    options: CoordinatedUpsertOptions
  ): Promise<EntityMapping> {
    const { entityType, stripeId } = options;
    const lockKey = `${entityType}:${stripeId}`;

    // Check if operation is already in progress
    if (this.inProgress.has(lockKey)) {
      console.log(`Operation already in progress for ${lockKey}, waiting...`);
      return await this.inProgress.get(lockKey)!;
    }

    // Start the coordinated operation
    const operationPromise = this.performCoordinatedUpsert(options);
    this.inProgress.set(lockKey, operationPromise);

    try {
      return await operationPromise;
    } finally {
      this.inProgress.delete(lockKey);
    }
  }

  private async performCoordinatedUpsert(
    options: CoordinatedUpsertOptions
  ): Promise<EntityMapping> {
    const {
      entityType,
      stripeId,
      upsertOperation,
      forceUpdate = false,
      updateHash
    } = options;

    console.log(`[Durable Object] Running coordinated upsert for ${entityType} ${stripeId}`);
    const existingMapping = await this.getEntityMapping(entityType, stripeId);
    if (existingMapping && existingMapping.notionPageId) {
      console.log(`[Durable Object] Found existing mapping: ${entityType} ${stripeId} --> ${existingMapping?.notionPageId}`);
    }

    if (existingMapping && existingMapping.dataHash === updateHash) {
      console.log(
        `[Durable Object] Existing hash for ${entityType} ${stripeId}. Skipping Notion upsert.`
      );
      return await this.setEntityMapping(
        entityType,
        stripeId,
        existingMapping.notionPageId,
        updateHash
      );
    }
    
    if (existingMapping && !forceUpdate) {
      console.log(
        `[Durable Object] Existing mapping for ${entityType} ${stripeId}. No force update. Skipping Notion upsert.`
      );
      return await this.setEntityMapping(
        entityType,
        stripeId,
        existingMapping.notionPageId,
        updateHash
      );
    }
    
    const upsertResult = await upsertOperation();
    
    await this.setEntityMapping(
      entityType,
      stripeId,
      upsertResult.id,
      updateHash
    );
    return (await this.getEntityMapping(entityType, stripeId)) as EntityMapping;
  }

  private getStorageKey(entityType: DatabaseEntity, stripeId: string): string {
    return `entity:${entityType}:${stripeId}`;
  }

  async clearAllMappings(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  private async deleteEntityMapping(
    entityType: DatabaseEntity,
    stripeId: string
  ): Promise<void> {
    const key = this.getStorageKey(entityType, stripeId);
    await this.ctx.storage.delete(key);
  }

  private async getEntityPageId(
    notionToken: string,
    entityType: DatabaseEntity,
    stripeId: string,
    databaseId: string,
    titleProperty: string
  ): Promise<string | null> {
    const existingMapping = await this.getEntityMapping(entityType, stripeId);
    if (existingMapping) {
      return existingMapping.notionPageId;
    }

    try {
      const page = await findPageByTitle(
        notionToken,
        databaseId,
        titleProperty,
        stripeId
      );
      if (page?.id) {
        await this.setEntityMapping(entityType, stripeId, page.id);
        return page.id;
      }
    } catch (error) {
      console.warn(`Failed to resolve ${entityType} ${stripeId}:`, error);
    }

    return null;
  }
}
