import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";

/**
 * Get the coordinator instance for a Stripe account
 */
export function getCoordinator(context: HandlerContext, stripeAccountId: string) {
  // Use the Stripe account ID as the Durable Object ID
  const doId = context.env.STRIPE_ENTITY_COORDINATOR.idFromName(stripeAccountId);
  return context.env.STRIPE_ENTITY_COORDINATOR.get(doId);
}

