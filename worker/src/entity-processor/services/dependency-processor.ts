import type { DatabaseEntity } from "@/types";
import type { Databases } from "@/durable-objects/account-do";
import type { StripeTypeMap } from "@/entity-processor/entity-config";
import type { StepWrapper } from "./notion-sync-service";
import { ENTITY_REGISTRY } from "../entity-registry";
import { defaultStepWrapper } from "@/workflows/utils/default-step-wrapper";

/**
 * Interface for processing entity dependencies
 */
export interface EntityDependencyProcessor {
  processEntity<K extends DatabaseEntity>(
    entityType: K,
    entityId: string,
    databases: Databases,
    stepWrapper: StepWrapper,
    options?: { isForDependencyResolution?: boolean }
  ): Promise<{
    pageId: string | undefined;
    expandedEntity: StripeTypeMap[K] | undefined;
  }>;
}

/**
 * Service for resolving entity dependencies and getting their Notion page IDs
 */
export class DependencyProcessor {
  public entityProcessor: EntityDependencyProcessor;

  constructor(entityProcessor: EntityDependencyProcessor) {
    this.entityProcessor = entityProcessor;
  }

  /**
   * Resolve all dependencies for an entity and return their Notion page IDs
   */
  async resolveDependencies<K extends DatabaseEntity>(
    entityType: K,
    expandedEntity: StripeTypeMap[K],
    databases: Databases,
    stepWrapper: StepWrapper = defaultStepWrapper
  ): Promise<Record<string, string | null>> {
    const config = ENTITY_REGISTRY[entityType];
    if (!config || config.dependencies.length === 0) {
      return {};
    }

    console.log(
      `🔗 Processing dependencies for ${entityType}:`,
      config.dependencies.map((d) => d.entityType)
    );

    const pageIds: Record<string, string | null> = {};
    const processedDependencies = new Set<string>();

    // Process each dependency
    for (const [index, dependency] of config.dependencies.entries()) {
      const { entityType: depEntityType, extractStripeId } = dependency;

      const processDependencyStep = async (): Promise<void> => {
        // Check if we have a database ID for this dependency type
        const databaseId = databases[depEntityType]?.pageId;
        if (!databaseId) {
          console.log(`⚠️ No database ID for dependency ${depEntityType}`);
          pageIds[depEntityType] = null;
          return;
        }

        try {
          // Extract the Stripe ID for this dependency
          const stripeId = extractStripeId(expandedEntity);
          if (!stripeId) {
            console.log(`⚠️ No Stripe ID found for ${depEntityType}`);
            pageIds[depEntityType] = null;
            return;
          }

          // Avoid processing the same dependency multiple times
          const dependencyKey = `${depEntityType}:${stripeId}`;
          if (processedDependencies.has(dependencyKey)) {
            console.log(`♻️ Already processed ${depEntityType} ${stripeId}`);
            return;
          }
          processedDependencies.add(dependencyKey);

          // Recursively process this dependency and its dependencies
          const dependencyResult = await this.entityProcessor.processEntity(
            depEntityType,
            stripeId,
            databases,
            stepWrapper,
            { isForDependencyResolution: true }
          );

          pageIds[depEntityType] = dependencyResult.pageId || null;
          console.log(
            `✅ Processed dependency ${depEntityType} ${stripeId}: ${dependencyResult.pageId}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to process dependency ${depEntityType}:`,
            error
          );
          pageIds[depEntityType] = null;
        }
      };

      await stepWrapper(
        `Process dependency ${index + 1}/${
          config.dependencies.length
        }: ${depEntityType}`,
        processDependencyStep
      );
    }

    console.log(
      `🏁 Finished processing dependencies for ${entityType}:`,
      pageIds
    );
    return pageIds;
  }

  /**
   * Extract Stripe ID from an entity for a specific dependency type
   */
  extractStripeIdForDependency<K extends DatabaseEntity>(
    entityType: K,
    expandedEntity: StripeTypeMap[K],
    dependencyEntityType: DatabaseEntity
  ): string | null {
    const config = ENTITY_REGISTRY[entityType];
    if (!config) {
      return null;
    }

    const dependency = config.dependencies.find(
      (d) => d.entityType === dependencyEntityType
    );
    if (!dependency) {
      return null;
    }

    try {
      return dependency.extractStripeId(expandedEntity);
    } catch (error) {
      console.error(
        `Failed to extract Stripe ID for ${dependencyEntityType}:`,
        error
      );
      return null;
    }
  }
}
