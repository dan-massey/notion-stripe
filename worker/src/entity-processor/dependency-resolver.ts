import { DatabaseEntity } from "@/types";
import type {
  EntityConfig,
  ResolvedDependencies,
  StripeTypeMap
} from "./entity-config";
import { ENTITY_REGISTRY } from "@/entity-processor/entity-registry";

/**
 * Performs topological sort on entity dependencies to determine resolution order
 */
export function topologicalSort(
  startEntity: DatabaseEntity,
  registry: typeof ENTITY_REGISTRY
): DatabaseEntity[] {
  const visited = new Set<DatabaseEntity>();
  const visiting = new Set<DatabaseEntity>();
  const result: DatabaseEntity[] = [];

  function visit(entityType: DatabaseEntity) {
    if (visiting.has(entityType)) {
      throw new Error(`Circular dependency detected involving ${entityType}`);
    }
    if (visited.has(entityType)) {
      return;
    }

    visiting.add(entityType);
    
    const config = registry[entityType];
    if (config) {
      // Visit all dependencies first
      for (const dep of config.dependencies) {
        visit(dep.entityType);
      }
    }

    visiting.delete(entityType);
    visited.add(entityType);
    result.push(entityType);
  }

  visit(startEntity);
  return result;
}

/**
 * Extract dependency IDs from an entity for planning purposes
 * This function only extracts IDs - it does not perform any upserts
 */
export function extractDependencyIds<K extends DatabaseEntity>(
  entityType: K,
  expandedEntity: StripeTypeMap[K]
): Record<string, string | null> {
  console.log(`🔗 Extracting dependency IDs for ${entityType}`);
  
  const config = ENTITY_REGISTRY[entityType];
  if (!config) {
    throw new Error(`No configuration found for entity type: ${entityType}`);
  }
  
  console.log(`📋 Dependencies to extract for ${entityType}:`, config.dependencies.map(d => d.entityType));

  const dependencyIds: Record<string, string | null> = {};

  // Extract each dependency ID
  for (const dependency of config.dependencies) {
    const { entityType: depEntityType, extractStripeId } = dependency;
    console.log(`🔍 Extracting dependency: ${depEntityType}`);

    try {
      // Extract the Stripe ID for this dependency from the expanded entity
      const stripeId = extractStripeId(expandedEntity);
      console.log(`   Extracted Stripe ID: ${stripeId}`);
      
      dependencyIds[depEntityType] = stripeId || null;
    } catch (error) {
      console.log(`   ❌ Error extracting ${depEntityType}: ${(error as Error).message}`);
      dependencyIds[depEntityType] = null;
    }
  }

  console.log(`🏁 Dependency ID extraction complete for ${entityType}:`, dependencyIds);
  return dependencyIds;
}

/**
 * Build a dependency plan for an entity type without executing it
 * Returns the order in which dependencies should be processed
 */
export function buildDependencyPlan(
  entityType: DatabaseEntity,
  registry: typeof ENTITY_REGISTRY = ENTITY_REGISTRY
): DatabaseEntity[] {
  try {
    const sortedDependencies = topologicalSort(entityType, registry);
    // Remove the main entity from the list - we only want its dependencies
    return sortedDependencies.filter(dep => dep !== entityType);
  } catch (error) {
    console.warn(`Failed to build dependency plan for ${entityType}:`, error);
    // Fallback to simple dependency list without topological sorting
    const config = registry[entityType];
    return config ? config.dependencies.map(dep => dep.entityType) : [];
  }
}

/**
 * Validates that all required dependencies have been resolved
 */
export function validateDependencies<K extends DatabaseEntity>(
  config: EntityConfig<K>,
  resolvedDependencies: ResolvedDependencies
): void {
  for (const dep of config.dependencies) {
    if (dep.required && !resolvedDependencies.pageIds[dep.entityType]) {
      throw new Error(
        `Required dependency ${dep.entityType} could not be resolved for ${config.entityType}`
      );
    }
  }
}