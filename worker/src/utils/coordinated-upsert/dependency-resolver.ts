import { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type {
  EntityConfig,
  DependencyResolutionParams,
  ResolvedDependencies
} from "./entity-config";
import { ENTITY_REGISTRY } from "./entity-registry";
import { getCoordinator } from "./utils";

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
 * Resolves all dependencies for a given entity in the correct order
 */
export async function resolveDependencies(
  context: HandlerContext,
  entityType: DatabaseEntity,
  expandedEntity: any,
  params: DependencyResolutionParams
): Promise<ResolvedDependencies> {
  console.log(`🔗 Starting dependency resolution for ${entityType}`);
  
  const config = ENTITY_REGISTRY[entityType];
  if (!config) {
    throw new Error(`No configuration found for entity type: ${entityType}`);
  }
  
  console.log(`📋 Dependencies to resolve for ${entityType}:`, config.dependencies.map(d => d.entityType));

  const coordinator = getCoordinator(context, context.stripeAccountId);
  const pageIds: Record<string, string | null> = {};
  const errors: Array<{ entityType: DatabaseEntity; error: Error }> = [];

  // Get topological order for all dependencies
  const dependencyTypes = config.dependencies.map(dep => dep.entityType);
  const allDependencies = new Set<DatabaseEntity>();
  
  // Collect all transitive dependencies
  for (const depType of dependencyTypes) {
    try {
      const depOrder = topologicalSort(depType, ENTITY_REGISTRY);
      depOrder.forEach(dep => allDependencies.add(dep));
    } catch (error) {
      console.warn(`Failed to resolve dependency tree for ${depType}:`, error);
    }
  }

  // Resolve each dependency that's relevant to this entity
  for (const dependency of config.dependencies) {
    const { entityType: depEntityType, extractStripeId, required } = dependency;
    console.log(`🔍 Processing dependency: ${depEntityType}`);
    
    // Check if we have a database ID for this dependency type
    const databaseId = params.databaseIds[depEntityType];
    console.log(`   Database ID: ${databaseId}`);
    if (!databaseId) {
      if (required) {
        console.log(`   ❌ Missing required database ID for ${depEntityType}`);
        errors.push({
          entityType: depEntityType,
          error: new Error(`Missing required database ID for ${depEntityType}`)
        });
      } else {
        console.log(`   ⚠️  No database ID for optional dependency ${depEntityType}`);
      }
      pageIds[depEntityType] = null;
      continue;
    }

    try {
      // Extract the Stripe ID for this dependency from the expanded entity
      const stripeId = extractStripeId(expandedEntity);
      console.log(`   Extracted Stripe ID: ${stripeId}`);
      if (!stripeId) {
        console.log(`   ⚠️  No Stripe ID found for ${depEntityType}, setting to null`);
        pageIds[depEntityType] = null;
        continue;
      }

      // Check if we already have a cached mapping
      console.log(`   🔎 Looking up existing page ID for ${depEntityType} ${stripeId}`);
      let pageId = await coordinator.getEntityPageId(
        context.notionToken,
        depEntityType,
        stripeId,
        databaseId,
        ENTITY_REGISTRY[depEntityType]?.titleProperty || `${depEntityType} ID`
      );
      console.log(`   ${pageId ? '✅' : '❌'} Found cached page ID: ${pageId}`);

      // If no cached mapping exists, recursively resolve this dependency
      if (!pageId) {
        console.log(`   🔄 No cached page found, resolving ${depEntityType} ${stripeId} recursively`);
        const depConfig = ENTITY_REGISTRY[depEntityType];
        if (depConfig) {
          try {
            // Retrieve the dependency entity from Stripe
            const depExpandedEntity = await depConfig.retrieveFromStripe(context, stripeId);
            
            // Recursively resolve dependencies of the dependency
            const depResolved = await resolveDependencies(
              context,
              depEntityType,
              depExpandedEntity,
              params
            );

            // Convert to Notion properties
            const depProperties = depConfig.convertToNotionProperties(
              depExpandedEntity,
              depResolved.pageIds
            );

            // Perform coordinated upsert
            const mapping = await coordinator.coordinatedUpsert({
              entityType: depEntityType,
              stripeId: stripeId,
              notionToken: context.notionToken,
              databaseId: databaseId,
              titleProperty: depConfig.titleProperty,
              forceUpdate: true,
              upsertOperation: async () => {
                const { upsertPageByTitle } = await import("@/utils/notion-api");
                return await upsertPageByTitle(
                  context.notionToken,
                  databaseId,
                  depConfig.titleProperty,
                  stripeId,
                  depProperties
                );
              }
            });

            pageId = mapping.notionPageId;
            
            // Clear any previous errors since we succeeded
            await context.account.setEntityError(depEntityType, null);
          } catch (error) {
            console.warn(`Failed to resolve dependency ${depEntityType} for ${entityType}:`, error);
            errors.push({ entityType: depEntityType, error: error as Error });
            pageId = null;
          }
        }
      }

      pageIds[depEntityType] = pageId;
      console.log(`   ✅ Final page ID for ${depEntityType}: ${pageId}`);
    } catch (error) {
      console.log(`   ❌ Error resolving ${depEntityType}: ${(error as Error).message}`);
      console.warn(`Error resolving dependency ${depEntityType}:`, error);
      errors.push({ entityType: depEntityType, error: error as Error });
      pageIds[depEntityType] = null;
    }
  }

  console.log(`🏁 Dependency resolution complete for ${entityType}:`, pageIds);
  return { pageIds, errors };
}

/**
 * Validates that all required dependencies have been resolved
 */
export function validateDependencies(
  config: EntityConfig,
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