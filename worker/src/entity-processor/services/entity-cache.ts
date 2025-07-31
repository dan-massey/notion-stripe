import type { DatabaseEntity } from "@/types";

/**
 * Service for tracking processed entities to prevent duplicates and cycles
 */
export class EntityCache {
  private processedEntities = new Set<string>();

  /**
   * Create an entity key for tracking
   */
  private createEntityKey(entityType: DatabaseEntity, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  /**
   * Mark an entity as processed
   */
  markProcessed(entityType: DatabaseEntity, entityId: string): void {
    const entityKey = this.createEntityKey(entityType, entityId);
    this.processedEntities.add(entityKey);
  }

  /**
   * Check if an entity has already been processed
   */
  isProcessed(entityType: DatabaseEntity, entityId: string): boolean {
    const entityKey = this.createEntityKey(entityType, entityId);
    return this.processedEntities.has(entityKey);
  }

  /**
   * Get the count of entities processed
   */
  getProcessedCount(): number {
    return this.processedEntities.size;
  }

  /**
   * Reset the cache (typically called at the start of a processing session)
   */
  reset(): void {
    this.processedEntities.clear();
  }

  /**
   * Get all processed entity keys (useful for debugging)
   */
  getProcessedEntities(): string[] {
    return Array.from(this.processedEntities);
  }
}