import { handleCustomerEvent } from "./handlers/customer";
import { handleInvoiceEvent } from "./handlers/invoice";
import { handleChargeEvent } from "./handlers/charge";
import { handleSubscriptionEvent } from "./handlers/subscription";
import { handleCreditNoteEvent } from "./handlers/credit-note";
import { handleDisputeEvent } from "./handlers/dispute";
import { handleInvoiceItemEvent } from "./handlers/invoice-item";
import { handlePriceEvent } from "./handlers/price";
import { handleProductEvent } from "./handlers/product";
import { handlePromotionCodeEvent } from "./handlers/promotion-code";
import { handlePaymentIntentEvent } from "./handlers/payment-intent";
import type { WebhookEventHandler } from "./shared/types";

export const EVENT_HANDLERS: Record<string, WebhookEventHandler> = {
  customer: handleCustomerEvent,
  charge: handleChargeEvent,
  invoice: handleInvoiceEvent,
  subscription: handleSubscriptionEvent,
  credit_note: handleCreditNoteEvent,
  dispute: handleDisputeEvent,
  invoiceitem: handleInvoiceItemEvent,
  price: handlePriceEvent,
  product: handleProductEvent,
  promotion_code: handlePromotionCodeEvent,
  payment_intent: handlePaymentIntentEvent,
};

export type { HandlerContext, HandlerResult, WebhookEventHandler } from "./shared/types";