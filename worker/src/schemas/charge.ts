import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const getChargeSchema = (customerDatabaseId: string, paymentIntentDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Charge ID": {
    "type": "title" as const,
    "title": {}
  },
  "Customer": {
    "type": "relation" as const,
    "relation": {
      "database_id": customerDatabaseId,
      "type": "dual_property" as const,
      "dual_property": {}
    }
  },
  "Amount": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Amount Captured": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Amount Refunded": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Currency": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Status": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "succeeded", "color": "green" as const},
        {"name": "pending", "color": "yellow" as const},
        {"name": "failed", "color": "red" as const}
      ]
    }
  },
  "Paid": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Captured": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Refunded": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Disputed": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Live Mode": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Created Date": {
    "type": "date" as const,
    "date": {}
  },
  "Description": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Payment Intent": {
    "type": "relation" as const,
    "relation": {
      "database_id": paymentIntentDatabaseId,
      "type": "dual_property" as const,
      "dual_property": {}
    }
  },
  "Payment Method": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Payment Method Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "card", "color": "blue" as const},
        {"name": "card_present", "color": "blue" as const},
        {"name": "paypal", "color": "purple" as const},
        {"name": "cashapp", "color": "green" as const},
        {"name": "link", "color": "orange" as const},
        {"name": "us_bank_account", "color": "gray" as const},
        {"name": "sepa_debit", "color": "gray" as const}
      ]
    }
  },
  "Card Brand": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "visa", "color": "blue" as const},
        {"name": "mastercard", "color": "orange" as const},
        {"name": "amex", "color": "green" as const},
        {"name": "discover", "color": "purple" as const},
        {"name": "jcb", "color": "red" as const},
        {"name": "diners", "color": "gray" as const},
        {"name": "unionpay", "color": "yellow" as const}
      ]
    }
  },
  "Card Last4": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Card Funding": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "credit", "color": "blue" as const},
        {"name": "debit", "color": "green" as const},
        {"name": "prepaid", "color": "yellow" as const},
        {"name": "unknown", "color": "gray" as const}
      ]
    }
  },
  "Card Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Card Exp Month": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Card Exp Year": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Billing Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Billing Email": {
    "type": "email" as const,
    "email": {}
  },
  "Billing Phone": {
    "type": "phone_number" as const,
    "phone_number": {}
  },
  "Billing Address Line 1": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Billing Address Line 2": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Billing City": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Billing State": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Billing Postal Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Billing Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Outcome Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "authorized", "color": "green" as const},
        {"name": "manual_review", "color": "yellow" as const},
        {"name": "issuer_declined", "color": "red" as const},
        {"name": "blocked", "color": "red" as const},
        {"name": "invalid", "color": "red" as const}
      ]
    }
  },
  "Outcome Reason": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Risk Level": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "normal", "color": "green" as const},
        {"name": "elevated", "color": "yellow" as const},
        {"name": "highest", "color": "red" as const},
        {"name": "not_assessed", "color": "gray" as const},
        {"name": "unknown", "color": "gray" as const}
      ]
    }
  },
  "Risk Score": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Fraud Stripe Report": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "fraudulent", "color": "red" as const}
      ]
    }
  },
  "Fraud User Report": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "safe", "color": "green" as const},
        {"name": "fraudulent", "color": "red" as const}
      ]
    }
  },
  "Failure Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Failure Message": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Receipt Email": {
    "type": "email" as const,
    "email": {}
  },
  "Receipt URL": {
    "type": "url" as const,
    "url": {}
  },
  "Statement Descriptor": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Balance Transaction": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Application": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Application Fee Amount": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Shipping Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping Phone": {
    "type": "phone_number" as const,
    "phone_number": {}
  },
  "Shipping Address Line 1": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping Address Line 2": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping City": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping State": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping Postal Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping Carrier": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Tracking Number": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Transfer": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Transfer Group": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "On Behalf Of": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Source Transfer": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Review": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Refund Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Metadata": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Last Updated": {
    "type": "last_edited_time" as const,
    "last_edited_time": {}
  },
  "Record Created": {
    "type": "created_time" as const,
    "created_time": {}
  }
})