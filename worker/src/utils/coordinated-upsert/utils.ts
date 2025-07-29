import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { SupportedEntity } from "@/types";

/**
 * Get the coordinator instance for a Stripe account
 */
export function getCoordinator(context: HandlerContext, stripeAccountId: string) {
  // Use the Stripe account ID as the Durable Object ID
  const doId = context.env.STRIPE_ENTITY_COORDINATOR.idFromName(stripeAccountId);
  return context.env.STRIPE_ENTITY_COORDINATOR.get(doId);
}

/**
 * Get the stored Notion page ID for a Stripe entity
 * This allows us to skip the slow findPageByTitle lookup
 */
export async function getStoredNotionPageId(
  context: HandlerContext,
  entityType: SupportedEntity,
  stripeId: string
): Promise<string | null> {
  const coordinator = getCoordinator(context, context.stripeAccountId);
  const mapping = await coordinator.getEntityMapping(entityType, stripeId);
  return mapping?.notionPageId || null;
}

/**
 * Check if an entity has already been processed
 */
export async function hasEntityMapping(
  context: HandlerContext,
  entityType: SupportedEntity,
  stripeId: string
): Promise<boolean> {
  const coordinator = getCoordinator(context, context.stripeAccountId);
  return await coordinator.hasEntityMapping(entityType, stripeId);
}