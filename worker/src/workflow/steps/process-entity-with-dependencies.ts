import { Stripe } from "stripe";
import type { StripeApiObject, DatabaseEntity, ApiStripeObject } from "@/types";
import { ENTITY_REGISTRY } from "@/utils/coordinated-upsert/entity-registry";
import { topologicalSort } from "@/utils/coordinated-upsert/dependency-resolver";

type StripeListResponse<T> = {
  data: T[];
  has_more: boolean;
};

export type EntityDependencyPlan = {
  mainEntity: StripeApiObject;
  mainEntityData: any;
  dependencySteps: Array<{
    entityType: StripeApiObject;
    stripeId: string;
    entityData: any;
  }>;
};

/**
 * Analyzes a main entity and determines what dependencies need to be processed first
 * Returns a plan with dependency steps in the correct order
 */
export async function createEntityDependencyPlan(
  stripe: Stripe,
  mainEntityType: StripeApiObject,
  mainEntityData: any,
  stripeAccountId: string
): Promise<EntityDependencyPlan> {
  console.log(`📋 Creating dependency plan for ${mainEntityType} ${mainEntityData.id}`);
  
  const config = ENTITY_REGISTRY[mainEntityType as DatabaseEntity];
  if (!config) {
    throw new Error(`No configuration found for entity type: ${mainEntityType}`);
  }

  const dependencySteps: Array<{
    entityType: StripeApiObject;
    stripeId: string;
    entityData: any;
  }> = [];

  // Get dependencies in topological order
  const orderedDependencies = topologicalSort(mainEntityType as DatabaseEntity, ENTITY_REGISTRY);
  
  // Remove the main entity from the list - we only want its dependencies
  const dependencyTypes = orderedDependencies.filter(dep => dep !== mainEntityType);

  console.log(`🔗 Dependencies to resolve for ${mainEntityType}:`, dependencyTypes);

  // Process each dependency type in order
  for (const depType of dependencyTypes) {
    const depConfig = config.dependencies.find(d => d.entityType === depType);
    if (!depConfig) continue; // This dependency isn't directly needed by the main entity

    try {
      // Extract the Stripe ID for this dependency from the main entity
      const depStripeId = depConfig.extractStripeId(mainEntityData);
      console.log(`   ${depType}: ${depStripeId}`);
      
      if (depStripeId) {
        // Fetch the dependency data from Stripe
        const depEntityConfig = ENTITY_REGISTRY[depType];
        if (depEntityConfig) {
          console.log(`📡 Fetching ${depType} ${depStripeId} from Stripe`);
          const depEntityData = await depEntityConfig.retrieveFromStripe(
            { stripe, stripeAccountId } as any, // Minimal context for retrieval
            depStripeId
          );
          
          dependencySteps.push({
            entityType: depType as StripeApiObject,
            stripeId: depStripeId,
            entityData: depEntityData
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to resolve dependency ${depType} for ${mainEntityType}:`, error);
      // Continue with other dependencies - non-critical dependencies shouldn't block processing
    }
  }

  console.log(`✅ Created plan for ${mainEntityType} with ${dependencySteps.length} dependency steps`);

  return {
    mainEntity: mainEntityType,
    mainEntityData,
    dependencySteps
  };
}

/**
 * Gets the next entity to process from Stripe for a given entity type
 * Similar to the existing workflow's fetchStripeData logic
 */
export async function getNextEntityFromStripe(
  stripe: Stripe,
  entityType: StripeApiObject,
  stripeAccountId: string,
  startingAfter?: string
): Promise<StripeListResponse<ApiStripeObject>> {
  const listOptions: any = { 
    limit: 1 
  };
  
  if (startingAfter) {
    listOptions.starting_after = startingAfter;
  }

  const requestOptions = { stripeAccount: stripeAccountId };

  // Get expansion fields from ENTITY_REGISTRY and prepend with "data."
  // Filter out fields that would exceed Stripe's 4-level expansion limit
  const config = ENTITY_REGISTRY[entityType as DatabaseEntity];
  if (config && config.stripeExpansions.length > 0) {
    const filteredExpansions = config.stripeExpansions.filter(field => {
      // Count periods to determine depth. Since we prepend "data.", we need to limit to 3 levels max
      const periodCount = (field.match(/\./g) || []).length;
      return periodCount <= 2; // data.field.subfield.subsubfield = 3 periods = 4 levels total
    });
    
    if (filteredExpansions.length > 0) {
      listOptions.expand = filteredExpansions.map(field => `data.${field}`);
    }
  }

  switch (entityType) {
    case 'customer':
      return await stripe.customers.list(listOptions, requestOptions);
    case 'product':
      return await stripe.products.list(listOptions, requestOptions);
    case 'price':
      return await stripe.prices.list(listOptions, requestOptions);
    case 'coupon':
      return await stripe.coupons.list(listOptions, requestOptions);
    case 'promotion_code':
      return await stripe.promotionCodes.list(listOptions, requestOptions);
    case 'payment_intent':
      return await stripe.paymentIntents.list(listOptions, requestOptions);
    case 'charge':
      return await stripe.charges.list(listOptions, requestOptions);
    case 'invoice':
      return await stripe.invoices.list(listOptions, requestOptions);
    case 'subscription':
      return await stripe.subscriptions.list(listOptions, requestOptions);
    case 'invoiceitem':
      return await stripe.invoiceItems.list(listOptions, requestOptions);
    case 'credit_note':
      return await stripe.creditNotes.list(listOptions, requestOptions);
    case 'dispute':
      return await stripe.disputes.list(listOptions, requestOptions);
    default:
      throw new Error(`Unsupported entity type for listing: ${entityType}`);
  }
}