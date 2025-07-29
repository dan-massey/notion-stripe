import { DurableObject } from "cloudflare:workers";
import type { SupportedEntity } from "./types";

export interface EntityMapping {
  stripeId: string;
  notionPageId: string;
  entityType: SupportedEntity;
  createdAt: number;
  updatedAt: number;
}

export interface CoordinatedUpsertOptions {
  entityType: SupportedEntity;
  stripeId: string;
  notionToken: string;
  databaseId: string;
  titleProperty: string;
  upsertOperation: () => Promise<{ id: string; [key: string]: any }>;
}

export class StripeEntityCoordinator extends DurableObject {
  private inProgress = new Map<string, Promise<EntityMapping>>();

  /**
   * Get the entity mapping for a given Stripe entity
   */
  async getEntityMapping(
    entityType: SupportedEntity, 
    stripeId: string
  ): Promise<EntityMapping | null> {
    const key = this.getStorageKey(entityType, stripeId);
    const mapping = await this.ctx.storage.get<EntityMapping>(key);
    return mapping || null;
  }

  /**
   * Store the entity mapping for a given Stripe entity
   */
  async setEntityMapping(
    entityType: SupportedEntity,
    stripeId: string,
    notionPageId: string
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
    };

    await this.ctx.storage.put(key, mapping);
    return mapping;
  }

  /**
   * Check if an entity mapping exists
   */
  async hasEntityMapping(
    entityType: SupportedEntity,
    stripeId: string
  ): Promise<boolean> {
    const key = this.getStorageKey(entityType, stripeId);
    const exists = await this.ctx.storage.get(key);
    return exists !== undefined;
  }

  /**
   * Coordinated upsert that prevents race conditions
   */
  async coordinatedUpsert(options: CoordinatedUpsertOptions): Promise<EntityMapping> {
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
      const result = await operationPromise;
      return result;
    } finally {
      this.inProgress.delete(lockKey);
    }
  }

  /**
   * Internal method to perform the actual coordinated upsert
   */
  private async performCoordinatedUpsert(options: CoordinatedUpsertOptions): Promise<EntityMapping> {
    const { entityType, stripeId, upsertOperation } = options;

    // Check if we have a mapping and the operation hasn't run yet
    const existingMapping = await this.getEntityMapping(entityType, stripeId);
    
    if (existingMapping) {
      console.log(`Found existing mapping for ${entityType}:${stripeId} -> ${existingMapping.notionPageId}`);
      // Just update the timestamp and return - the page already exists
      return await this.setEntityMapping(entityType, stripeId, existingMapping.notionPageId);
    }

    // No mapping exists, perform the upsert operation
    console.log(`No mapping found, performing upsert operation for ${entityType}:${stripeId}`);
    const result = await upsertOperation();
    
    // Store the mapping for future use
    await this.setEntityMapping(entityType, stripeId, result.id);
    
    console.log(`Stored new mapping ${entityType}:${stripeId} -> ${result.id}`);
    return await this.getEntityMapping(entityType, stripeId) as EntityMapping;
  }

  /**
   * Generate storage key for entity mapping
   */
  private getStorageKey(entityType: SupportedEntity, stripeId: string): string {
    return `entity:${entityType}:${stripeId}`;
  }

  /**
   * Get all entity mappings (for debugging/administration)
   */
  async getAllMappings(): Promise<EntityMapping[]> {
    const mappings: EntityMapping[] = [];
    const list = await this.ctx.storage.list({ prefix: 'entity:' });
    
    for (const [_, mapping] of list) {
      mappings.push(mapping as EntityMapping);
    }
    
    return mappings;
  }

  /**
   * Clear all mappings (for testing/reset)
   */
  async clearAllMappings(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  /**
   * Delete a specific entity mapping
   */
  async deleteEntityMapping(entityType: SupportedEntity, stripeId: string): Promise<void> {
    const key = this.getStorageKey(entityType, stripeId);
    await this.ctx.storage.delete(key);
  }
}