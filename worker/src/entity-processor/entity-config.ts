import type { DatabaseEntity } from "@/types";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type { Stripe } from "stripe";
import type { ISubEntityProcessor } from "./services/sub-entity-processor";
import type { DependencyProcessor } from "./services/dependency-processor";

export type StripeTypeMap = {
  customer: Stripe.Customer;
  product: Stripe.Product;
  coupon: Stripe.Coupon;
  payment_intent: Stripe.PaymentIntent;
  price: Stripe.Price;
  promotion_code: Stripe.PromotionCode;
  charge: Stripe.Charge;
  invoice: Stripe.Invoice;
  subscription: Stripe.Subscription;
  subscription_item: Stripe.SubscriptionItem;
  credit_note: Stripe.CreditNote;
  dispute: Stripe.Dispute;
  invoiceitem: Stripe.InvoiceItem;
  discount: Stripe.Discount;
  line_item: Stripe.InvoiceLineItem;
};

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
export interface EntityConfig<K extends DatabaseEntity> {
  /** The entity type this config is for */
  entityType: K;
  /** Whether this entity supports list operations for backfilling */
  isListable?: boolean;
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
  ) => Promise<StripeTypeMap[K]>;
  /** Stripe list function reference for backfill operations */
  listFromStripe?: (stripe: Stripe) => (listOptions: any, requestOptions: Stripe.RequestOptions) => Promise<any>;
  /** Function to convert Stripe entity to Notion properties */
  convertToNotionProperties: (
    expandedEntity: StripeTypeMap[K],
    dependencyPageIds: Record<string, string | null>
  ) => Record<string, any>;
  getSubEntityProcessor?: (
    context: HandlerContext,
    dependencyProcessor: DependencyProcessor
  ) => ISubEntityProcessor;
}

/**
 * Registry of all entity configurations
 */
export type EntityConfigRegistry = {
  [K in DatabaseEntity]: EntityConfig<K>;
};

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