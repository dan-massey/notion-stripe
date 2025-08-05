import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { StripeMode } from "@/types";

/**
 * Get the coordinator instance for a Stripe account
 */
export function getCoordinator(context: Pick<HandlerContext, "env">, stripeMode: StripeMode, stripeAccountId: string) {
  // Use the Stripe account ID as the Durable Object ID
  const doId = context.env.STRIPE_ENTITY_COORDINATOR.idFromName(`${stripeMode}:${stripeAccountId}`);
  return context.env.STRIPE_ENTITY_COORDINATOR.get(doId);
}

