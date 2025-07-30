import type { Stripe } from "stripe";
import type { AppContext, StripeMode, ApiStripeObject, StripeApiObjectKinds } from "@/types";
import { ensureAccountDo } from "@/utils/do";
import { getNotionToken } from "@/utils/stripe";
import { coordinatedUpsert, coordinatedUpsertLineItem, coordinatedUpsertDiscount } from "@/utils/coordinated-upsert";
import { HandlerResult, type HandlerContext } from "./webhook/shared/types";
import { handleNotionError } from "./webhook/shared/utils";
import { ENTITY_REGISTRY } from "@/utils/coordinated-upsert/entity-registry";

const WEBHOOK_OBJECT_KINDS: StripeApiObjectKinds = [
  "customer",
  "invoice",
  "charge",
  "subscription",
  "credit_note",
  "dispute",
  "invoiceitem",
  "price",
  "product",
  "coupon",
  "promotion_code",
  "payment_intent",
  "subscription_item"
]

/**
 * Process invoice line items when an invoice event occurs
 * This retrieves the expanded invoice and processes all line items
 */
const processInvoiceLineItems = async (
  context: HandlerContext,
  invoice: Stripe.Invoice,
  databases: any,
  invoiceNotionPageId: string
): Promise<void> => {
  if (!invoice.id) {
    console.warn('Invoice ID is missing, cannot process line items');
    return;
  }
  
  console.log(`🧾 Processing line items for invoice ${invoice.id}`);
  
  // Get the expanded invoice from the entity registry to ensure we have line items
  const expandedInvoice = await ENTITY_REGISTRY.invoice.retrieveFromStripe(context, invoice.id);
  
  if (!expandedInvoice.lines?.data?.length) {
    console.log(`No line items found for invoice ${invoice.id}`);
    return;
  }
  
  console.log(`Found ${expandedInvoice.lines.data.length} line items for invoice ${invoice.id}`);
  
  // Process each line item
  for (const lineItem of expandedInvoice.lines.data) {
    try {
      console.log(`Processing line item ${lineItem.id} for invoice ${invoice.id}`);
      
      await coordinatedUpsertLineItem(
        context,
        lineItem,
        databases,
        invoiceNotionPageId,
        null // Let the line item resolver handle price relationships
      );
      
      console.log(`✅ Successfully processed line item ${lineItem.id}`);
    } catch (error) {
      console.error(`❌ Failed to process line item ${lineItem.id}:`, error);
      // Continue processing other line items even if one fails
    }
  }
  
  console.log(`🏁 Finished processing line items for invoice ${invoice.id}`);
};

/**
 * Process discount when an entity with discount occurs
 * This processes the discount attached to the entity
 */
const processEntityDiscount = async (
  context: HandlerContext,
  entity: any,
  entityType: 'customer' | 'invoice' | 'subscription' | 'invoiceitem',
  databases: any,
  entityNotionPageId: string
): Promise<void> => {
  if (!entity.discount) {
    console.log(`No discount found for ${entityType} ${entity.id}`);
    return;
  }
  
  console.log(`💰 Processing discount for ${entityType} ${entity.id}`);
  
  try {
    console.log(`Processing discount ${entity.discount.id} for ${entityType} ${entity.id}`);
    
    await coordinatedUpsertDiscount(
      context,
      entity.discount,
      databases,
      entityNotionPageId,
      entityType
    );
    
    console.log(`✅ Successfully processed discount ${entity.discount.id}`);
  } catch (error) {
    console.error(`❌ Failed to process discount ${entity.discount.id}:`, error);
    // Don't throw - discount processing shouldn't block the main entity
  }
  
  console.log(`🏁 Finished processing discount for ${entityType} ${entity.id}`);
};

const tryUpsert = async (event: Stripe.Event, context: HandlerContext): Promise<HandlerResult> => {
  const accountStatus = await context.account.getStatus();
  if (!accountStatus) {
    return {
      success: false,
      error: "Account status not found",
      statusCode: 200,
    };
  }
  const databases = accountStatus.notionConnection?.databases;
  if (!databases) {
    return {
      success: false,
      error: "No databases created",
      statusCode: 200,
    }
  }

  const stripeObject = event.data.object as ApiStripeObject;
  if (!WEBHOOK_OBJECT_KINDS.includes(stripeObject.object)) {
    return {
      success: false,
      error: `Unsupported entity: ${stripeObject.object}`,
      statusCode: 200,
    }
  }

  if (!stripeObject.id) {
    return {
      success: false,
      error: `Entity ${stripeObject.object} does not have an ID`,
      statusCode: 200,
    }
  }

  const databaseIds = Object.fromEntries(
    Object.entries(databases).map(([entity, db]) => [entity, db.pageId])
  );

  try {
    // Process the main entity
    const mainEntityPageId = await coordinatedUpsert(context, stripeObject.object, stripeObject.id, {
      databaseIds: databaseIds,
    });
    
    // Special handling for invoice events: process line items
    if (stripeObject.object === 'invoice' && mainEntityPageId) {
      await processInvoiceLineItems(context, stripeObject as Stripe.Invoice, databases, mainEntityPageId);
    }
    
    // Special handling for entities with discounts: process discount
    if (mainEntityPageId && ['customer', 'invoice', 'subscription', 'invoiceitem'].includes(stripeObject.object)) {
      await processEntityDiscount(
        context, 
        stripeObject, 
        stripeObject.object as 'customer' | 'invoice' | 'subscription' | 'invoiceitem',
        databases, 
        mainEntityPageId
      );
    }
    
    return { success: true };
  } catch (error) {
    await handleNotionError(error, context, stripeObject.object);
    console.error(`Error upserting ${stripeObject.object} to Notion:`, error);
    return {
      success: false,
      error: `Failed to update ${stripeObject.object} in Notion`,
      statusCode: 200,
    };
  }
};

export const stripeWebhookHandler = async (c: AppContext) => {
  const modeFromUrl = c.req.param("mode") as StripeMode;
  const event = c.get("stripeEvent");
  const stripeAccountId = event?.account;

  if (modeFromUrl === "test" && event?.livemode === true) {
    return c.json({ message: "Live event sent to test endpoint, ignoring." });
  }

  if (modeFromUrl === "live" && event?.livemode === false) {
    return c.json({ message: "Test event sent to live endpoint, ignoring." });
  }

  if (!stripeAccountId) {
    throw new Error("Missing Stripe Account ID on webhook event.");
  }

  const objectType = event?.data.object.object;
  console.log(
    `Processing ${event.type} / ${objectType} event for account ${stripeAccountId}`
  );

  // Get required resources in parallel
  const notionTokenPromise = getNotionToken(c, stripeAccountId);
  const accountPromise = ensureAccountDo(c, stripeAccountId, modeFromUrl);
  const [notionToken, account] = await Promise.all([
    notionTokenPromise,
    accountPromise,
  ]);

  const accountStatus = await account.getStatus();

  // Check if we have a Notion token
  if (!notionToken) {
    console.warn("No Notion token available");
    return c.json({ message: "No Notion token available" });
  }

  if (!accountStatus) {
    console.warn("No account status available");
    return c.json({ message: "No account status available" });
  }

  if (
    !accountStatus?.subscription?.stripeSubscriptionId &&
    !["active", "trialing", "past_due"].includes(
      accountStatus?.subscription?.stripeSubscriptionStatus ?? ""
    )
  ) {
    return c.json({
      message: `No active subscription for ${modeFromUrl} ${stripeAccountId} not syncing event to Notion.`,
    });
  }

  // Create context for the handler
  const context: HandlerContext = {
    stripe: c.get("stripe"),
    notionToken,
    stripeAccountId,
    account,
    env: c.env,
  };

  // Execute the handler
  const result = await tryUpsert(event, context);

  // Return appropriate response based on result
  if (!result.success) {
    const response = result.error
      ? { error: result.error }
      : { message: result.message };
    const statusCode = result.statusCode || 400;
    return c.json(response, statusCode as any);
  }

  return c.json({ message: result.message || "Event processed successfully" });
};
