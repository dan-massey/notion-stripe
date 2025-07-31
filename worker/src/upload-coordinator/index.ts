import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import { ENTITY_REGISTRY } from "@/entity-processor/entity-registry";
import { getCoordinator } from "./utils";
import { upsertPageByTitle } from "@/utils/notion-api";
import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";

/**
 * Simple coordinated upsert function for any entity type
 * Only handles coordination and database writes - no dependency resolution or entity processing
 */
export async function coordinatedUpsert<K extends DatabaseEntity>(
  context: HandlerContext,
  entityType: K,
  stripeId: string,
  databaseId: string,
  notionProperties: NonNullable<CreatePageParameters['properties']>
): Promise<string | undefined> {
  console.log(`🔄 Starting coordinatedUpsert for ${entityType} ${stripeId}`);
  
  const config = ENTITY_REGISTRY[entityType];
  if (!config) {
    const error = new Error(`No configuration found for entity type: ${entityType}`);
    await context.account.setEntityError(entityType, error.message);
    throw error;
  }

  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: entityType,
      stripeId: stripeId,
      notionToken: context.notionToken,
      databaseId: databaseId,
      titleProperty: config.titleProperty,
      forceUpdate: true,
      upsertOperation: async () => {
        console.log(`💾 Upserting ${entityType} ${stripeId} to Notion database ${databaseId}`);
        const result = await upsertPageByTitle(
          context.notionToken,
          databaseId,
          config.titleProperty,
          stripeId,
          notionProperties
        );
        console.log(`✅ Successfully upserted ${entityType} ${stripeId} to Notion`);
        
        return result;
      }
    });

    // Clear any previous errors for this entity since we succeeded
    await context.account.setEntityError(entityType, null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsert for ${entityType} ${stripeId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await context.account.setEntityError(entityType, errorMessage);
    throw error;
  }
}


