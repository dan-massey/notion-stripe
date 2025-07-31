import { DurableObject } from "cloudflare:workers";
import type { DatabaseEntity } from "@/types";
import { findPageByTitle } from "@/utils/notion-api";
import type Stripe from "stripe";

export interface EntityMapping {
  stripeId: string;
  notionPageId: string;
  entityType: DatabaseEntity;
  createdAt: number;
  updatedAt: number;
}

export interface CoordinatedUpsertOptions {
  entityType: DatabaseEntity;
  stripeId: string;
  notionToken: string;
  databaseId: string;
  titleProperty: string;
  upsertOperation: () => Promise<{ id: string; [key: string]: any }>;
  forceUpdate?: boolean; // If true, always run upsertOperation even if mapping exists
}

export interface RelatedEntityIds {
  customerPageId: string | null;
  chargePageId: string | null;
  invoicePageId: string | null;
  paymentIntentPageId: string | null;
  productPageId: string | null;
  pricePageId: string | null;
  subscriptionPageId: string | null;
  disputePageId: string | null;
  creditNotePageId: string | null;
  invoiceItemPageId: string | null;
  lineItemPageId: string | null;
  promotionCodePageId: string | null;
  couponPageId: string | null;
}

export type StripeEntityUnion = 
  | Stripe.Customer 
  | Stripe.Charge 
  | Stripe.Invoice 
  | Stripe.PaymentIntent 
  | Stripe.Product 
  | Stripe.Price 
  | Stripe.Subscription 
  | Stripe.SubscriptionItem
  | Stripe.Dispute 
  | Stripe.CreditNote 
  | Stripe.InvoiceItem 
  | Stripe.InvoiceLineItem 
  | Stripe.PromotionCode
  | Stripe.Coupon
  | Stripe.Discount;

export class StripeEntityCoordinator extends DurableObject {
  private inProgress = new Map<string, Promise<EntityMapping>>();

  /**
   * Get the entity mapping for a given Stripe entity
   */
  private async getEntityMapping(
    entityType: DatabaseEntity, 
    stripeId: string
  ): Promise<EntityMapping | null> {
    const key = this.getStorageKey(entityType, stripeId);
    const mapping = await this.ctx.storage.get<EntityMapping>(key);
    return mapping || null;
  }

  /**
   * Store the entity mapping for a given Stripe entity
   */
  private async setEntityMapping(
    entityType: DatabaseEntity,
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
    const { entityType, stripeId, upsertOperation, forceUpdate = false } = options;

    // Check if we have a mapping and the operation hasn't run yet
    const existingMapping = await this.getEntityMapping(entityType, stripeId);
    
    if (existingMapping && !forceUpdate) {
      console.log(`Found existing mapping for ${entityType}:${stripeId} -> ${existingMapping.notionPageId} (using cache)`);
      // Just update the timestamp and return - the page already exists
      return await this.setEntityMapping(entityType, stripeId, existingMapping.notionPageId);
    }

    // Either no mapping exists, or forceUpdate is true - perform the upsert operation
    if (existingMapping && forceUpdate) {
      console.log(`Found existing mapping for ${entityType}:${stripeId} -> ${existingMapping.notionPageId} (force updating)`);
    } else {
      console.log(`No mapping found, performing upsert operation for ${entityType}:${stripeId}`);
    }
    
    const result = await upsertOperation();
    
    // Store/update the mapping for future use
    await this.setEntityMapping(entityType, stripeId, result.id);
    
    console.log(`Stored mapping ${entityType}:${stripeId} -> ${result.id}`);
    return await this.getEntityMapping(entityType, stripeId) as EntityMapping;
  }

  /**
   * Generate storage key for entity mapping
   */
  private getStorageKey(entityType: DatabaseEntity, stripeId: string): string {
    return `entity:${entityType}:${stripeId}`;
  }

  /**
   * Get all entity mappings (for debugging/administration)
   */
  private async getAllMappings(): Promise<EntityMapping[]> {
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
  private async deleteEntityMapping(entityType: DatabaseEntity, stripeId: string): Promise<void> {
    const key = this.getStorageKey(entityType, stripeId);
    await this.ctx.storage.delete(key);
  }

  /**
   * Get the Notion page ID for a Stripe entity, using cache when possible
   * This is a convenience method for single entity lookups
   */
  private async getEntityPageId(
    notionToken: string,
    entityType: DatabaseEntity,
    stripeId: string,
    databaseId: string,
    titleProperty: string
  ): Promise<string | null> {
    // First check if we have a cached mapping
    const existingMapping = await this.getEntityMapping(entityType, stripeId);
    if (existingMapping) {
      return existingMapping.notionPageId;
    }

    // Fall back to findPageByTitle
    try {
      const page = await findPageByTitle(notionToken, databaseId, titleProperty, stripeId);
      if (page?.id) {
        // Cache the result for future use
        await this.setEntityMapping(entityType, stripeId, page.id);
        return page.id;
      }
    } catch (error) {
      console.warn(`Failed to resolve ${entityType} ${stripeId}:`, error);
    }
    
    return null;
  }
}