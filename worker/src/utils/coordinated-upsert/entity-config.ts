import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";

/**
 * Represents a dependency of an entity on another entity
 */
export interface EntityDependency {
  /** The entity type this depends on */
  entityType: DatabaseEntity;
  /** Parameter name for the database ID (e.g., 'customerDatabaseId') */
  databaseIdParam: string;
  /** Function to extract the Stripe ID from the expanded entity */
  extractStripeId: (expandedEntity: any) => string | null;
  /** Whether this dependency is required for the entity to be processed */
  required: boolean;
}

/**
 * Configuration for a single entity type in the coordinated upsert system
 */
export interface EntityConfig {
  /** The entity type this config is for */
  entityType: DatabaseEntity;
  /** Stripe API expansion parameters needed to resolve dependencies */
  stripeExpansions: string[];
  /** List of entities this entity depends on */
  dependencies: EntityDependency[];
  /** The property name used as the title in Notion (e.g., 'Customer ID') */
  titleProperty: string;
  /** Function to retrieve the expanded entity from Stripe */
  retrieveFromStripe: (
    context: HandlerContext,
    stripeId: string
  ) => Promise<any>;
  /** Function to convert Stripe entity to Notion properties */
  convertToNotionProperties: (
    expandedEntity: any,
    dependencyPageIds: Record<string, string | null>
  ) => Record<string, any>;
}

/**
 * Registry of all entity configurations
 */
export type EntityConfigRegistry = Record<DatabaseEntity, EntityConfig>;

/**
 * Parameters for dependency resolution
 */
export interface DependencyResolutionParams {
  /** Database IDs for each entity type */
  databaseIds: Partial<Record<DatabaseEntity, string>>;
}

/**
 * Result of dependency resolution for an entity
 */
export interface ResolvedDependencies {
  /** Notion page IDs for each resolved dependency */
  pageIds: Record<string, string | null>;
  /** Any errors that occurred during dependency resolution */
  errors: Array<{ entityType: DatabaseEntity; error: Error }>;
}