import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const getDisputeSchema = (chargeDatabaseId: string, paymentIntentDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Dispute ID": {
    "type": "title" as const,
    "title": {}
  },
  "Charge": {
    "type": "relation" as const,
    "relation": {
      "database_id": chargeDatabaseId,
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
  "Currency": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Status": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "warning_needs_response", "color": "yellow" as const},
        {"name": "warning_under_review", "color": "yellow" as const},
        {"name": "warning_closed", "color": "gray" as const},
        {"name": "needs_response", "color": "orange" as const},
        {"name": "under_review", "color": "blue" as const},
        {"name": "won", "color": "green" as const},
        {"name": "lost", "color": "red" as const}
      ]
    }
  },
  "Reason": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "bank_cannot_process", "color": "red" as const},
        {"name": "check_returned", "color": "red" as const},
        {"name": "credit_not_processed", "color": "orange" as const},
        {"name": "customer_initiated", "color": "blue" as const},
        {"name": "debit_not_authorized", "color": "red" as const},
        {"name": "duplicate", "color": "purple" as const},
        {"name": "fraudulent", "color": "red" as const},
        {"name": "general", "color": "gray" as const},
        {"name": "incorrect_account_details", "color": "orange" as const},
        {"name": "insufficient_funds", "color": "red" as const},
        {"name": "noncompliant", "color": "red" as const},
        {"name": "product_not_received", "color": "orange" as const},
        {"name": "product_unacceptable", "color": "orange" as const},
        {"name": "subscription_canceled", "color": "blue" as const},
        {"name": "unrecognized", "color": "purple" as const}
      ]
    }
  },
  "Created Date": {
    "type": "date" as const,
    "date": {}
  },
  "Live Mode": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Is Charge Refundable": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Payment Intent": {
    "type": "relation" as const,
    "relation": {
      "database_id": paymentIntentDatabaseId,
      "type": "dual_property" as const,
      "dual_property": {}
    }
  },
  "Payment Method Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "card", "color": "blue" as const},
        {"name": "amazon_pay", "color": "orange" as const},
        {"name": "klarna", "color": "purple" as const},
        {"name": "paypal", "color": "blue" as const}
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
        {"name": "unionpay", "color": "yellow" as const},
        {"name": "cartes_bancaires", "color": "blue" as const},
        {"name": "eftpos_au", "color": "green" as const},
        {"name": "link", "color": "purple" as const},
        {"name": "unknown", "color": "gray" as const}
      ]
    }
  },
  "Card Case Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "chargeback", "color": "red" as const},
        {"name": "compliance", "color": "orange" as const},
        {"name": "inquiry", "color": "yellow" as const}
      ]
    }
  },
  "Network Reason Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Enhanced Eligibility Types": {
    "type": "multi_select" as const,
    "multi_select": {
      "options": [
        {"name": "visa_compelling_evidence_3", "color": "blue" as const},
        {"name": "visa_compliance", "color": "purple" as const}
      ]
    }
  },
  "Evidence Due By": {
    "type": "date" as const,
    "date": {}
  },
  "Evidence Has Evidence": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Evidence Past Due": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Evidence Submission Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Evidence Customer Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Customer Email": {
    "type": "email" as const,
    "email": {}
  },
  "Evidence Customer Purchase IP": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Billing Address": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Product Description": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Service Date": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Shipping Address": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Shipping Carrier": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Shipping Date": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Shipping Tracking Number": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Duplicate Charge ID": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Duplicate Charge Explanation": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Refund Policy Disclosure": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Refund Refusal Explanation": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Cancellation Policy Disclosure": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Cancellation Rebuttal": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Access Activity Log": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Evidence Uncategorized Text": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Balance Transactions Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Balance Transactions Net": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Balance Transactions Fee": {
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