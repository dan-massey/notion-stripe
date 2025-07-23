import type { AppContext, StripeMode } from "@/types";
import { ensureMembershipDo } from "@/utils/do";
import { getNotionToken } from "@/utils/stripe";
import { upsertPageByTitle } from "@/utils/notion";
import { stripeCustomerToNotionProperties } from "@/utils/customer";
import { stripeChargeToNotionProperties } from "@/utils/charge";
import type Stripe from "stripe";

export const stripeWebhookHandler = async (c: AppContext) => {
  const modeFromUrl = c.req.param("mode") as StripeMode;
  const event = c.get("stripeEvent");
  const isEventLiveMode = event?.livemode;
  console.log("modeFromUrl", modeFromUrl, "isEventLiveMode", isEventLiveMode);
  console.log("accountId", event?.account);
  console.log(event);
  const stripeAccountId = event?.account;
  if (!stripeAccountId) {
    throw new Error("Missing Stripe Account ID on webhook event.");
  }

  const objectType = event?.data.object.object;

  const notionTokenPromise = getNotionToken(c, stripeAccountId);
  const membershipPromise = ensureMembershipDo(c, stripeAccountId, modeFromUrl);
  const [notionToken, membership] = await Promise.all([notionTokenPromise, membershipPromise]);
  const membershipStatus = await membership.getStatus();

  if (objectType === "customer") {
     const customer = event.data.object as Stripe.Customer;
     const customerDatabaseId = membershipStatus?.customerDatabaseId;
     
     console.log(`[WebhookHandler] Processing customer event for: ${customer.id}`);
     console.log(`[WebhookHandler] Customer database ID: ${customerDatabaseId}`);
     console.log(`[WebhookHandler] Notion token available: ${!!notionToken}`);
     
     if (!customerDatabaseId) {
      console.warn("No customer database set up");
      return c.json({ message: "No customer database configured" });
     }

     if (!notionToken) {
      console.warn("No Notion token available");
      return c.json({ message: "No Notion token available" });
     }

     try {
       // Get the stripe client for the current mode
       const stripe = c.get("stripe");
       
       console.log(`[WebhookHandler] Retrieving expanded customer data from Stripe...`);
       // Retrieve the full customer with expanded fields
       const expandedCustomer = await stripe.customers.retrieve(customer.id, {
         expand: [
           'subscriptions',
           'sources', 
           'invoice_settings.default_payment_method',
           'default_source'
         ]
       }, {stripeAccount: stripeAccountId});
       
       console.log(`[WebhookHandler] Expanded customer object:`, JSON.stringify(expandedCustomer, null, 2));
       
       // Check if customer was deleted
       if (expandedCustomer.deleted) {
         console.log(`[WebhookHandler] Customer ${customer.id} was deleted, skipping Notion update`);
         return c.json({ message: "Customer was deleted" });
       }
       
       console.log(`[WebhookHandler] Converting customer to Notion properties...`);
       const properties = stripeCustomerToNotionProperties(expandedCustomer as Stripe.Customer);
       console.log(`[WebhookHandler] Converted properties:`, JSON.stringify(properties, null, 2));
       
       await upsertPageByTitle(
         notionToken,
         customerDatabaseId,
         "Customer ID",
         customer.id,
         properties
       );

       console.log(`Successfully upserted customer ${customer.id} to Notion`);
     } catch (error) {
       console.error("Error upserting customer to Notion:", error);
       return c.json({ error: "Failed to update customer in Notion" }, 500);
     }
  }

  if (objectType === "charge") {
    const charge = event.data.object as Stripe.Charge;
    const chargeDatabaseId = membershipStatus?.chargeDatabaseId;
    const customerDatabaseId = membershipStatus?.customerDatabaseId;
    
    console.log(`[WebhookHandler] Processing charge event for: ${charge.id}`);
    console.log(`[WebhookHandler] Charge database ID: ${chargeDatabaseId}`);
    console.log(`[WebhookHandler] Customer database ID: ${customerDatabaseId}`);
    console.log(`[WebhookHandler] Notion token available: ${!!notionToken}`);
    
    if (!chargeDatabaseId) {
      console.warn("No charge database set up");
      return c.json({ message: "No charge database configured" });
    }

    if (!notionToken) {
      console.warn("No Notion token available");
      return c.json({ message: "No Notion token available" });
    }

    try {
      // Get the stripe client for the current mode
      const stripe = c.get("stripe");
      
      let customerNotionPageId: string | undefined;
      
      // If there's a customer, upsert them first and get their Notion page ID
      if (charge.customer && customerDatabaseId) {
        console.log(`[WebhookHandler] Upserting customer ${charge.customer} for charge...`);
        
        // Retrieve and upsert customer first
        const expandedCustomer = await stripe.customers.retrieve(charge.customer as string, {
          expand: [
            'subscriptions',
            'sources', 
            'invoice_settings.default_payment_method',
            'default_source'
          ]
        }, {stripeAccount: stripeAccountId});
        
        if (!expandedCustomer.deleted) {
          const customerProperties = stripeCustomerToNotionProperties(expandedCustomer as Stripe.Customer);
          const customerResult = await upsertPageByTitle(
            notionToken,
            customerDatabaseId,
            "Customer ID",
            expandedCustomer.id,
            customerProperties
          );
          customerNotionPageId = customerResult.id;
          console.log(`[WebhookHandler] Customer upserted with Notion page ID: ${customerNotionPageId}`);
        }
      }
      
      console.log(`[WebhookHandler] Retrieving expanded charge data from Stripe...`);
      // Retrieve the full charge with expanded fields
      const expandedCharge = await stripe.charges.retrieve(charge.id, {
        expand: [
          'invoice',
          'balance_transaction'
        ]
      }, {stripeAccount: stripeAccountId});
      
      console.log(`[WebhookHandler] Expanded charge object:`, JSON.stringify(expandedCharge, null, 2));
      
      console.log(`[WebhookHandler] Converting charge to Notion properties...`);
      const properties = stripeChargeToNotionProperties(expandedCharge, customerNotionPageId);
      console.log(`[WebhookHandler] Converted properties:`, JSON.stringify(properties, null, 2));
      
      if (properties) {
        await upsertPageByTitle(
          notionToken,
          chargeDatabaseId,
          "Charge ID",
          charge.id,
          properties
        );
      } else {
        throw new Error("Failed to convert charge to Notion properties");
      }

      console.log(`Successfully upserted charge ${charge.id} to Notion`);
    } catch (error) {
      console.error("Error upserting charge to Notion:", error);
      return c.json({ error: "Failed to update charge in Notion" }, 500);
    }
  }

  return c.json({ message: "Event received" });
};
