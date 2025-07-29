import { upsertPageByTitle } from "@/utils/notion-api";
import { stripePriceToNotionProperties } from "@/converters/price";
import { stripePromotionCodeToNotionProperties } from "@/converters/promotion-code";
import { stripeInvoiceItemToNotionProperties } from "@/converters/invoice-item";
import { stripeInvoiceToNotionProperties } from "@/converters/invoice";
import { stripeInvoiceLineItemToNotionProperties } from "@/converters/invoice-line-item";
import { stripeCreditNoteToNotionProperties } from "@/converters/credit-note";
import { stripeSubscriptionToNotionProperties } from "@/converters/subscription";
import type { HandlerContext } from "@/handlers/stripe/webhook/shared/types";
import type Stripe from "stripe";
import { getCoordinator } from "./utils";
import {
  coordinatedUpsertCustomer,
  coordinatedUpsertProduct,
} from "./core-entities";
import {
  coordinatedUpsertCharge,
  coordinatedUpsertPaymentIntent,
} from "./payment-entities";

/**
 * Coordinated price upsert that prevents race conditions
 */
export async function coordinatedUpsertPrice(
  context: HandlerContext,
  priceId: string,
  priceDatabaseId: string,
  productDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "price",
      stripeId: priceId,
      notionToken: context.notionToken,
      databaseId: priceDatabaseId,
      titleProperty: "Price ID",
      forceUpdate: true, // Always update for direct price events
      upsertOperation: async () => {
        // Retrieve expanded price
        const expandedPrice = await context.stripe.prices.retrieve(
          priceId,
          {
            expand: ["product"],
          },
          { stripeAccount: context.stripeAccountId }
        );

        let productNotionPageId: string | null = null;

        // Get product page ID if present (only upsert if not cached)
        if (
          expandedPrice.product &&
          typeof expandedPrice.product === "object" &&
          productDatabaseId
        ) {
          productNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "product",
            expandedPrice.product.id,
            productDatabaseId,
            "Product ID"
          );

          // Only upsert if no mapping exists
          if (!productNotionPageId) {
            try {
              productNotionPageId =
                (await coordinatedUpsertProduct(
                  context,
                  expandedPrice.product.id,
                  productDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert product for price ${priceId}:`,
                error
              );
            }
          }
        }

        const priceProperties = stripePriceToNotionProperties(
          expandedPrice,
          productNotionPageId
        );
        const result = await upsertPageByTitle(
          context.notionToken,
          priceDatabaseId,
          "Price ID",
          expandedPrice.id,
          priceProperties
        );

        return result;
      },
    });

    // Clear any previous errors for price database since we succeeded
    await context.account.setEntityError("price", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertPrice for ${priceId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated promotion code upsert that prevents race conditions
 */
export async function coordinatedUpsertPromotionCode(
  context: HandlerContext,
  promotionCodeId: string,
  promotionCodeDatabaseId: string,
  customerDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "promotion_code",
      stripeId: promotionCodeId,
      notionToken: context.notionToken,
      databaseId: promotionCodeDatabaseId,
      titleProperty: "Promotion Code ID",
      forceUpdate: true, // Always update for direct promotion code events
      upsertOperation: async () => {
        // Retrieve expanded promotion code
        const expandedPromotionCode =
          await context.stripe.promotionCodes.retrieve(
            promotionCodeId,
            {
              expand: ["coupon", "customer"],
            },
            { stripeAccount: context.stripeAccountId }
          );

        let customerNotionPageId: string | null = null;

        // Get customer page ID if present (only upsert if not cached)
        if (expandedPromotionCode.customer && customerDatabaseId) {
          const customerId =
            typeof expandedPromotionCode.customer === "string"
              ? expandedPromotionCode.customer
              : expandedPromotionCode.customer.id;
          customerNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "customer",
            customerId,
            customerDatabaseId,
            "Customer ID"
          );

          // Only upsert if no mapping exists
          if (!customerNotionPageId) {
            try {
              customerNotionPageId =
                (await coordinatedUpsertCustomer(
                  context,
                  customerId,
                  customerDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert customer for promotion code ${promotionCodeId}:`,
                error
              );
            }
          }
        }

        const promotionCodeProperties = stripePromotionCodeToNotionProperties(
          expandedPromotionCode,
          customerNotionPageId
        );
        const result = await upsertPageByTitle(
          context.notionToken,
          promotionCodeDatabaseId,
          "Promotion Code ID",
          expandedPromotionCode.id,
          promotionCodeProperties
        );

        return result;
      },
    });

    // Clear any previous errors for promotion code database since we succeeded
    await context.account.setEntityError("promotion_code", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(
      `Error in coordinatedUpsertPromotionCode for ${promotionCodeId}:`,
      error
    );
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated invoice item upsert that prevents race conditions
 */
export async function coordinatedUpsertInvoiceItem(
  context: HandlerContext,
  invoiceItemId: string,
  invoiceItemDatabaseId: string,
  customerDatabaseId?: string,
  invoiceDatabaseId?: string,
  priceDatabaseId?: string,
  productDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "invoiceitem",
      stripeId: invoiceItemId,
      notionToken: context.notionToken,
      databaseId: invoiceItemDatabaseId,
      titleProperty: "Invoice Item ID",
      forceUpdate: true, // Always update for direct invoice item events
      upsertOperation: async () => {
        // Retrieve expanded invoice item
        const expandedInvoiceItem = await context.stripe.invoiceItems.retrieve(
          invoiceItemId,
          {
            expand: [
              "customer",
              "invoice",
              "subscription",
              "price",
              "price.product",
            ],
          },
          { stripeAccount: context.stripeAccountId }
        );

        let customerNotionPageId: string | null = null;
        let invoiceNotionPageId: string | null = null;
        let priceNotionPageId: string | null = null;
        let productNotionPageId: string | null = null;

        // Get customer page ID if present (only upsert if not cached)
        if (expandedInvoiceItem.customer && customerDatabaseId) {
          const customerId =
            typeof expandedInvoiceItem.customer === "string"
              ? expandedInvoiceItem.customer
              : expandedInvoiceItem.customer.id;
          customerNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "customer",
            customerId,
            customerDatabaseId,
            "Customer ID"
          );

          // Only upsert if no mapping exists
          if (!customerNotionPageId) {
            try {
              customerNotionPageId =
                (await coordinatedUpsertCustomer(
                  context,
                  customerId,
                  customerDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert customer for invoice item ${invoiceItemId}:`,
                error
              );
            }
          }
        }

        // Get invoice page ID if present (only upsert if not cached)
        if (expandedInvoiceItem.invoice && invoiceDatabaseId) {
          const invoiceId =
            typeof expandedInvoiceItem.invoice === "string"
              ? expandedInvoiceItem.invoice
              : expandedInvoiceItem.invoice.id;

          if (invoiceId) {
            invoiceNotionPageId = await coordinator.getEntityPageId(
              context.notionToken,
              "invoice",
              invoiceId,
              invoiceDatabaseId,
              "Invoice ID"
            );

            // Only upsert if no mapping exists
            if (!invoiceNotionPageId) {
              try {
                invoiceNotionPageId =
                  (await coordinatedUpsertInvoice(
                    context,
                    invoiceId,
                    invoiceDatabaseId,
                    customerDatabaseId
                  )) || null;
              } catch (error) {
                console.warn(
                  `Failed to upsert invoice for invoice item ${invoiceItemId}:`,
                  error
                );
              }
            }
          }
        }

        // Get product page ID if present (only upsert if not cached)
        if (
          "price" in expandedInvoiceItem &&
          expandedInvoiceItem.price &&
          typeof expandedInvoiceItem.price === "object" &&
          "product" in expandedInvoiceItem.price &&
          expandedInvoiceItem.price.product &&
          productDatabaseId
        ) {
          const product = expandedInvoiceItem.price.product as Stripe.Product;
          productNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "product",
            product.id,
            productDatabaseId,
            "Product ID"
          );

          // Only upsert if no mapping exists
          if (!productNotionPageId) {
            try {
              productNotionPageId =
                (await coordinatedUpsertProduct(
                  context,
                  product.id,
                  productDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert product for invoice item ${invoiceItemId}:`,
                error
              );
            }
          }
        }

        // Get price page ID if present (only upsert if not cached)
        if (
          "price" in expandedInvoiceItem &&
          expandedInvoiceItem.price &&
          typeof expandedInvoiceItem.price === "object" &&
          priceDatabaseId
        ) {
          const price = expandedInvoiceItem.price as Stripe.Price;
          priceNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "price",
            price.id,
            priceDatabaseId,
            "Price ID"
          );

          // Only upsert if no mapping exists
          if (!priceNotionPageId) {
            try {
              priceNotionPageId =
                (await coordinatedUpsertPrice(
                  context,
                  price.id,
                  priceDatabaseId,
                  productDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert price for invoice item ${invoiceItemId}:`,
                error
              );
            }
          }
        }

        const invoiceItemProperties = stripeInvoiceItemToNotionProperties(
          expandedInvoiceItem,
          customerNotionPageId,
          invoiceNotionPageId,
          priceNotionPageId
        );

        const result = await upsertPageByTitle(
          context.notionToken,
          invoiceItemDatabaseId,
          "Invoice Item ID",
          expandedInvoiceItem.id,
          invoiceItemProperties
        );

        return result;
      },
    });

    // Clear any previous errors for invoice item database since we succeeded
    await context.account.setEntityError("invoiceitem", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(
      `Error in coordinatedUpsertInvoiceItem for ${invoiceItemId}:`,
      error
    );
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated invoice upsert that prevents race conditions
 */
export async function coordinatedUpsertInvoice(
  context: HandlerContext,
  invoiceId: string,
  invoiceDatabaseId: string,
  customerDatabaseId?: string,
  chargeDatabaseId?: string,
  paymentIntentDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "invoice",
      stripeId: invoiceId,
      notionToken: context.notionToken,
      databaseId: invoiceDatabaseId,
      titleProperty: "Invoice ID",
      forceUpdate: true, // Always update for direct invoice events
      upsertOperation: async () => {
        // Retrieve expanded invoice with payments data
        const expandedInvoice = await context.stripe.invoices.retrieve(
          invoiceId,
          {
            expand: [
              "customer",
              "subscription",
              "payment_intent",
              "default_payment_method",
              "default_source",
              "payments.data.payment.charge",
              "payments.data.payment.payment_intent",
            ],
          },
          { stripeAccount: context.stripeAccountId }
        );

        let customerNotionPageId: string | null = null;
        let primaryChargeNotionPageId: string | null = null;
        let primaryPaymentIntentNotionPageId: string | null = null;

        // Get customer page ID if present (only upsert if not cached)
        if (expandedInvoice.customer && customerDatabaseId) {
          const customerId =
            typeof expandedInvoice.customer === "string"
              ? expandedInvoice.customer
              : expandedInvoice.customer.id;
          customerNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "customer",
            customerId,
            customerDatabaseId,
            "Customer ID"
          );

          // Only upsert if no mapping exists
          if (!customerNotionPageId) {
            try {
              customerNotionPageId =
                (await coordinatedUpsertCustomer(
                  context,
                  customerId,
                  customerDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert customer for invoice ${invoiceId}:`,
                error
              );
            }
          }
        }

        console.log(
          `[Coordinated Upsert Invoice]: Customer database: ${customerDatabaseId}, Customer ID page ${customerNotionPageId},`
        );

        // Extract primary charge and payment intent from payments
        if (
          expandedInvoice.payments &&
          expandedInvoice.payments.data &&
          expandedInvoice.payments.data.length > 0
        ) {
          const primaryPayment = expandedInvoice.payments.data[0]; // Use first payment as primary

          // Get charge page ID if present (only upsert if not cached)
          if (chargeDatabaseId && primaryPayment.payment.charge) {
            const chargeId =
              typeof primaryPayment.payment.charge === "string"
                ? primaryPayment.payment.charge
                : primaryPayment.payment.charge.id;

            primaryChargeNotionPageId = await coordinator.getEntityPageId(
              context.notionToken,
              "charge",
              chargeId,
              chargeDatabaseId,
              "Charge ID"
            );

            // Only upsert if no mapping exists
            if (!primaryChargeNotionPageId) {
              try {
                primaryChargeNotionPageId =
                  (await coordinatedUpsertCharge(
                    context,
                    chargeId,
                    chargeDatabaseId,
                    customerDatabaseId,
                    paymentIntentDatabaseId
                  )) || null;
              } catch (error) {
                console.warn(
                  `Failed to upsert charge for invoice ${invoiceId}:`,
                  error
                );
              }
            }
          }

          // Get payment intent page ID if present (only upsert if not cached)
          if (
            paymentIntentDatabaseId &&
            primaryPayment.payment.payment_intent
          ) {
            const paymentIntentId =
              typeof primaryPayment.payment.payment_intent === "string"
                ? primaryPayment.payment.payment_intent
                : primaryPayment.payment.payment_intent.id;

            primaryPaymentIntentNotionPageId =
              await coordinator.getEntityPageId(
                context.notionToken,
                "payment_intent",
                paymentIntentId,
                paymentIntentDatabaseId,
                "Payment Intent ID"
              );

            // Only upsert if no mapping exists
            if (!primaryPaymentIntentNotionPageId) {
              try {
                primaryPaymentIntentNotionPageId =
                  (await coordinatedUpsertPaymentIntent(
                    context,
                    paymentIntentId,
                    paymentIntentDatabaseId,
                    customerDatabaseId
                  )) || null;
              } catch (error) {
                console.warn(
                  `Failed to upsert payment intent for invoice ${invoiceId}:`,
                  error
                );
              }
            }
          }
        }

        const invoiceProperties = stripeInvoiceToNotionProperties(
          expandedInvoice,
          customerNotionPageId,
          primaryChargeNotionPageId,
          primaryPaymentIntentNotionPageId
        );

        const result = await upsertPageByTitle(
          context.notionToken,
          invoiceDatabaseId,
          "Invoice ID",
          expandedInvoice.id || invoiceId,
          invoiceProperties
        );

        return result;
      },
    });

    // Clear any previous errors for invoice database since we succeeded
    await context.account.setEntityError("invoice", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(`Error in coordinatedUpsertInvoice for ${invoiceId}:`, error);
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated line item upsert that prevents race conditions
 */
export async function coordinatedUpsertLineItem(
  context: HandlerContext,
  lineItem: Stripe.InvoiceLineItem,
  lineItemDatabaseId: string,
  invoiceNotionPageId: string | null,
  priceNotionPageId?: string | null
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "line_item",
      stripeId: lineItem.id,
      notionToken: context.notionToken,
      databaseId: lineItemDatabaseId,
      titleProperty: "Line Item ID",
      forceUpdate: true, // Always update for direct line item events
      upsertOperation: async () => {
        const lineItemProperties = stripeInvoiceLineItemToNotionProperties(
          lineItem,
          invoiceNotionPageId,
          priceNotionPageId || null
        );

        const result = await upsertPageByTitle(
          context.notionToken,
          lineItemDatabaseId,
          "Line Item ID",
          lineItem.id,
          lineItemProperties
        );

        return result;
      },
    });

    // Clear any previous errors for line item database since we succeeded
    await context.account.setEntityError("line_item", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(
      `Error in coordinatedUpsertLineItem for ${lineItem.id}:`,
      error
    );
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated credit note upsert that prevents race conditions
 */
export async function coordinatedUpsertCreditNote(
  context: HandlerContext,
  creditNoteId: string,
  creditNoteDatabaseId: string,
  customerDatabaseId?: string,
  invoiceDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "credit_note",
      stripeId: creditNoteId,
      notionToken: context.notionToken,
      databaseId: creditNoteDatabaseId,
      titleProperty: "Credit Note ID",
      forceUpdate: true, // Always update for direct credit note events
      upsertOperation: async () => {
        // Retrieve expanded credit note
        const expandedCreditNote = await context.stripe.creditNotes.retrieve(
          creditNoteId,
          {
            expand: ["customer", "invoice"],
          },
          { stripeAccount: context.stripeAccountId }
        );

        let customerNotionPageId: string | null = null;
        let invoiceNotionPageId: string | null = null;

        // Get customer page ID if present (only upsert if not cached)
        if (expandedCreditNote.customer && customerDatabaseId) {
          const customerId =
            typeof expandedCreditNote.customer === "string"
              ? expandedCreditNote.customer
              : expandedCreditNote.customer.id;
          customerNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "customer",
            customerId,
            customerDatabaseId,
            "Customer ID"
          );

          // Only upsert if no mapping exists
          if (!customerNotionPageId) {
            try {
              customerNotionPageId =
                (await coordinatedUpsertCustomer(
                  context,
                  customerId,
                  customerDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert customer for credit note ${creditNoteId}:`,
                error
              );
            }
          }
        }

        // Get invoice page ID if present (only upsert if not cached)
        if (expandedCreditNote.invoice && invoiceDatabaseId) {
          const invoiceId =
            typeof expandedCreditNote.invoice === "string"
              ? expandedCreditNote.invoice
              : expandedCreditNote.invoice.id;

          if (invoiceId) {
            invoiceNotionPageId = await coordinator.getEntityPageId(
              context.notionToken,
              "invoice",
              invoiceId,
              invoiceDatabaseId,
              "Invoice ID"
            );

            // Only upsert if no mapping exists
            if (!invoiceNotionPageId) {
              try {
                invoiceNotionPageId =
                  (await coordinatedUpsertInvoice(
                    context,
                    invoiceId,
                    invoiceDatabaseId,
                    customerDatabaseId
                  )) || null;
              } catch (error) {
                console.warn(
                  `Failed to upsert invoice for credit note ${creditNoteId}:`,
                  error
                );
              }
            }
          }
        }

        const creditNoteProperties = stripeCreditNoteToNotionProperties(
          expandedCreditNote,
          customerNotionPageId,
          invoiceNotionPageId
        );

        const result = await upsertPageByTitle(
          context.notionToken,
          creditNoteDatabaseId,
          "Credit Note ID",
          expandedCreditNote.id,
          creditNoteProperties
        );

        return result;
      },
    });

    // Clear any previous errors for credit note database since we succeeded
    await context.account.setEntityError("credit_note", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(
      `Error in coordinatedUpsertCreditNote for ${creditNoteId}:`,
      error
    );
    throw error; // Re-throw so calling handlers know it failed
  }
}

/**
 * Coordinated subscription upsert that prevents race conditions
 */
export async function coordinatedUpsertSubscription(
  context: HandlerContext,
  subscriptionId: string,
  subscriptionDatabaseId: string,
  customerDatabaseId?: string,
  invoiceDatabaseId?: string,
  priceDatabaseId?: string,
  productDatabaseId?: string
): Promise<string | undefined> {
  const coordinator = getCoordinator(context, context.stripeAccountId);

  try {
    const mapping = await coordinator.coordinatedUpsert({
      entityType: "subscription",
      stripeId: subscriptionId,
      notionToken: context.notionToken,
      databaseId: subscriptionDatabaseId,
      titleProperty: "Subscription ID",
      forceUpdate: true, // Always update for direct subscription events
      upsertOperation: async () => {
        // Retrieve expanded subscription
        const expandedSubscription =
          await context.stripe.subscriptions.retrieve(
            subscriptionId,
            {
              expand: [
                "customer",
                "latest_invoice",
                "default_payment_method",
                "default_source",
                "items.data.price.product",
              ],
            },
            { stripeAccount: context.stripeAccountId }
          );

        let customerNotionPageId: string | null = null;
        let latestInvoiceNotionPageId: string | null = null;
        let primaryPriceNotionPageId: string | null = null;
        let primaryProductNotionPageId: string | null = null;

        // Get customer page ID if present (only upsert if not cached)
        if (expandedSubscription.customer && customerDatabaseId) {
          const customerId =
            typeof expandedSubscription.customer === "string"
              ? expandedSubscription.customer
              : expandedSubscription.customer.id;
          customerNotionPageId = await coordinator.getEntityPageId(
            context.notionToken,
            "customer",
            customerId,
            customerDatabaseId,
            "Customer ID"
          );

          // Only upsert if no mapping exists
          if (!customerNotionPageId) {
            try {
              customerNotionPageId =
                (await coordinatedUpsertCustomer(
                  context,
                  customerId,
                  customerDatabaseId
                )) || null;
            } catch (error) {
              console.warn(
                `Failed to upsert customer for subscription ${subscriptionId}:`,
                error
              );
            }
          }
        }

        // Get latest invoice page ID if present (only upsert if not cached)
        if (expandedSubscription.latest_invoice && invoiceDatabaseId) {
          const latestInvoiceId =
            typeof expandedSubscription.latest_invoice === "string"
              ? expandedSubscription.latest_invoice
              : expandedSubscription.latest_invoice.id;

          if (latestInvoiceId) {
            latestInvoiceNotionPageId = await coordinator.getEntityPageId(
              context.notionToken,
              "invoice",
              latestInvoiceId,
              invoiceDatabaseId,
              "Invoice ID"
            );

            // Only upsert if no mapping exists
            if (!latestInvoiceNotionPageId) {
              try {
                latestInvoiceNotionPageId =
                  (await coordinatedUpsertInvoice(
                    context,
                    latestInvoiceId,
                    invoiceDatabaseId,
                    customerDatabaseId
                  )) || null;
              } catch (error) {
                console.warn(
                  `Failed to upsert invoice for subscription ${subscriptionId}:`,
                  error
                );
              }
            }
          }
        }

        // Handle primary price and product from subscription items
        if (
          expandedSubscription.items?.data &&
          expandedSubscription.items.data.length > 0
        ) {
          const primaryItem = expandedSubscription.items.data[0];
          const price = primaryItem.price;

          // Get product page ID if present (only upsert if not cached)
          if (
            price &&
            typeof price === "object" &&
            price.product &&
            productDatabaseId
          ) {
            const product = price.product as Stripe.Product;
            primaryProductNotionPageId = await coordinator.getEntityPageId(
              context.notionToken,
              "product",
              product.id,
              productDatabaseId,
              "Product ID"
            );

            // Only upsert if no mapping exists
            if (!primaryProductNotionPageId) {
              try {
                primaryProductNotionPageId =
                  (await coordinatedUpsertProduct(
                    context,
                    product.id,
                    productDatabaseId
                  )) || null;
              } catch (error) {
                console.warn(
                  `Failed to upsert product for subscription ${subscriptionId}:`,
                  error
                );
              }
            }
          }

          // Get price page ID if present (only upsert if not cached)
          if (price && priceDatabaseId) {
            primaryPriceNotionPageId = await coordinator.getEntityPageId(
              context.notionToken,
              "price",
              price.id,
              priceDatabaseId,
              "Price ID"
            );

            // Only upsert if no mapping exists
            if (!primaryPriceNotionPageId) {
              try {
                primaryPriceNotionPageId =
                  (await coordinatedUpsertPrice(
                    context,
                    price.id,
                    priceDatabaseId,
                    productDatabaseId
                  )) || null;
              } catch (error) {
                console.warn(
                  `Failed to upsert price for subscription ${subscriptionId}:`,
                  error
                );
              }
            }
          }
        }

        const subscriptionProperties = stripeSubscriptionToNotionProperties(
          expandedSubscription,
          customerNotionPageId,
          latestInvoiceNotionPageId,
          primaryPriceNotionPageId,
          primaryProductNotionPageId
        );

        const result = await upsertPageByTitle(
          context.notionToken,
          subscriptionDatabaseId,
          "Subscription ID",
          expandedSubscription.id,
          subscriptionProperties
        );

        return result;
      },
    });

    // Clear any previous errors for subscription database since we succeeded
    await context.account.setEntityError("subscription", null);
    return mapping.notionPageId;
  } catch (error) {
    console.error(
      `Error in coordinatedUpsertSubscription for ${subscriptionId}:`,
      error
    );
    throw error; // Re-throw so calling handlers know it failed
  }
}
