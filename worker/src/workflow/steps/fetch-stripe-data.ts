import { Stripe } from "stripe";
import type { SupportedEntity } from "@/types";
import type { WorkflowParams } from "../types";

export async function fetchStripeData(
  stripe: Stripe,
  entityToBackfill: SupportedEntity,
  params: WorkflowParams
): Promise<any> {
  const listOptions = {
    limit: 1,
    starting_after: params.entityStatus[entityToBackfill].startingAfter,
  };
  const requestOptions = { stripeAccount: params.stripeAccountId };

  switch (entityToBackfill) {
    case "customer":
      return await stripe.customers.list(
        {
          ...listOptions,
          expand: [
            "data.subscriptions",
            "data.sources",
            "data.invoice_settings.default_payment_method",
            "data.default_source",
          ],
        },
        requestOptions
      );
    case "charge":
      return await stripe.charges.list(
        {
          ...listOptions,
          expand: ["data.invoice", "data.balance_transaction"],
        },
        requestOptions
      );
    case "invoice":
      return await stripe.invoices.list(
        {
          ...listOptions,
          expand: [
            "data.customer",
            "data.subscription",
            "data.payment_intent",
            "data.default_payment_method",
            "data.default_source",
          ],
        },
        requestOptions
      );
    case "subscription":
      return await stripe.subscriptions.list(
        {
          ...listOptions,
          expand: [
            "data.customer",
            "data.latest_invoice",
            "data.default_payment_method",
            "data.default_source",
          ],
        },
        requestOptions
      );
    case "credit_note":
      return await stripe.creditNotes.list(
        { ...listOptions, expand: ["data.discount_amounts"] },
        requestOptions
      );
    case "dispute":
      return await stripe.disputes.list(listOptions, requestOptions);
    case "invoiceitem":
      return await stripe.invoiceItems.list(listOptions, requestOptions);
    case "payment_intent":
      return await stripe.paymentIntents.list(
        listOptions,
        requestOptions
      );
    case "price":
      return await stripe.prices.list(listOptions, requestOptions);
    case "product":
      return await stripe.products.list(listOptions, requestOptions);
    case "promotion_code":
      return await stripe.promotionCodes.list(
        listOptions,
        requestOptions
      );
    default:
      throw new Error(`Unsupported entity: ${entityToBackfill}`);
  }
}