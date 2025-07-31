import type Stripe from "stripe";
import {
  createTitleProperty,
  createRichTextProperty,
  createCheckboxProperty,
  createEmailProperty,
  createNumberProperty,
  createSelectProperty,
  createDateProperty,
  createRelationProperty,
  stringFromObject,
} from "@/converters/notion-properties";

export function stripePaymentIntentToNotionProperties(
  paymentIntent: Stripe.PaymentIntent,
  customerNotionPageId: string | null
) {
  const properties: Record<string, any> = {
    "Payment Intent ID": createTitleProperty(paymentIntent.id),
    Amount: createNumberProperty(paymentIntent.amount || 0),
    "Amount Capturable": createNumberProperty(paymentIntent.amount_capturable || 0),
    "Amount Received": createNumberProperty(paymentIntent.amount_received || 0),
    Currency: createRichTextProperty(paymentIntent.currency?.toUpperCase()),
    Status: createSelectProperty(paymentIntent.status),
    "Capture Method": createSelectProperty(paymentIntent.capture_method),
    "Confirmation Method": createSelectProperty(paymentIntent.confirmation_method),
    "Created Date": createDateProperty(paymentIntent.created),
    "Canceled At": createDateProperty(paymentIntent.canceled_at),
    "Cancellation Reason": createSelectProperty(paymentIntent.cancellation_reason),
    Description: createRichTextProperty(paymentIntent.description),
    "Application Fee Amount": createNumberProperty(paymentIntent.application_fee_amount),
    "Live Mode": createCheckboxProperty(paymentIntent.livemode),
    "Payment Method": createRichTextProperty(stringFromObject(paymentIntent.payment_method)),
    "Setup Future Usage": createSelectProperty(paymentIntent.setup_future_usage),
    "Receipt Email": createEmailProperty(paymentIntent.receipt_email),
    "Statement Descriptor": createRichTextProperty(paymentIntent.statement_descriptor),
    "Statement Descriptor Suffix": {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.statement_descriptor_suffix || "",
          },
        },
      ],
    },
    "On Behalf Of": {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.on_behalf_of || "",
          },
        },
      ],
    },
    Application: {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.application || "",
          },
        },
      ],
    },
    "Transfer Group": {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.transfer_group || "",
          },
        },
      ],
    },
    "Client Secret": {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.client_secret || "",
          },
        },
      ],
    },
    Review: {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.review || "",
          },
        },
      ],
    },
    Metadata: {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(paymentIntent.metadata || {}),
          },
        },
      ],
    },
  };

  // Add customer relation if we have the Notion page ID
  if (customerNotionPageId) {
    properties["Customer"] = {
      relation: [{ id: customerNotionPageId }],
    };
  }


  // Payment Method Types
  if (paymentIntent.payment_method_types && paymentIntent.payment_method_types.length > 0) {
    properties["Payment Method Types"] = {
      multi_select: paymentIntent.payment_method_types.map(type => ({ name: type })),
    };
  }

  // Transfer data
  if (paymentIntent.transfer_data) {
    properties["Transfer Destination"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.transfer_data.destination || "",
          },
        },
      ],
    };
    properties["Transfer Amount"] = {
      number: paymentIntent.transfer_data.amount || null,
    };
  }

  // Next Action
  if (paymentIntent.next_action) {
    properties["Next Action Type"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.next_action.type || "",
          },
        },
      ],
    };
  }

  // Last Payment Error
  if (paymentIntent.last_payment_error) {
    properties["Last Payment Error Message"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.last_payment_error.message || "",
          },
        },
      ],
    };
    properties["Last Payment Error Code"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.last_payment_error.code || "",
          },
        },
      ],
    };
    properties["Last Payment Error Type"] = {
      select: paymentIntent.last_payment_error.type ? { name: paymentIntent.last_payment_error.type } : null,
    };
  }

  // Automatic Payment Methods
  if (paymentIntent.automatic_payment_methods) {
    properties["Automatic Payment Methods Enabled"] = {
      checkbox: paymentIntent.automatic_payment_methods.enabled || false,
    };
    if (paymentIntent.automatic_payment_methods.allow_redirects) {
      properties["Automatic Payment Methods Allow Redirects"] = {
        select: { name: paymentIntent.automatic_payment_methods.allow_redirects },
      };
    }
  }

  // Shipping information
  if (paymentIntent.shipping) {
    properties["Shipping Name"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.shipping.name || "",
          },
        },
      ],
    };
    properties["Shipping Phone"] = {
      phone_number: paymentIntent.shipping.phone || null,
    };
    properties["Shipping Carrier"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.shipping.carrier || "",
          },
        },
      ],
    };
    properties["Shipping Tracking Number"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: paymentIntent.shipping.tracking_number || "",
          },
        },
      ],
    };

    if (paymentIntent.shipping.address) {
      properties["Shipping Address Line 1"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: paymentIntent.shipping.address.line1 || "",
            },
          },
        ],
      };
      properties["Shipping Address Line 2"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: paymentIntent.shipping.address.line2 || "",
            },
          },
        ],
      };
      properties["Shipping Address City"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: paymentIntent.shipping.address.city || "",
            },
          },
        ],
      };
      properties["Shipping Address State"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: paymentIntent.shipping.address.state || "",
            },
          },
        ],
      };
      properties["Shipping Address Country"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: paymentIntent.shipping.address.country || "",
            },
          },
        ],
      };
      properties["Shipping Address Postal Code"] = {
        rich_text: [
          {
            type: "text",
            text: {
              content: paymentIntent.shipping.address.postal_code || "",
            },
          },
        ],
      };
    }
  }

  return properties;
}