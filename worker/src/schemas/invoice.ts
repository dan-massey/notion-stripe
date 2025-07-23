import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const getInvoiceSchema = (customerDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Invoice ID": {
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
  "Invoice Number": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Status": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "draft", "color": "gray" as const},
        {"name": "open", "color": "yellow" as const},
        {"name": "paid", "color": "green" as const},
        {"name": "uncollectible", "color": "red" as const},
        {"name": "void", "color": "red" as const}
      ]
    }
  },
  "Collection Method": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "charge_automatically", "color": "blue" as const},
        {"name": "send_invoice", "color": "purple" as const}
      ]
    }
  },
  "Currency": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Total": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Subtotal": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Amount Due": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Amount Paid": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Amount Remaining": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Amount Overpaid": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Amount Shipping": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Starting Balance": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Ending Balance": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Created Date": {
    "type": "date" as const,
    "date": {}
  },
  "Due Date": {
    "type": "date" as const,
    "date": {}
  },
  "Period Start": {
    "type": "date" as const,
    "date": {}
  },
  "Period End": {
    "type": "date" as const,
    "date": {}
  },
  "Finalized At": {
    "type": "date" as const,
    "date": {}
  },
  "Paid At": {
    "type": "date" as const,
    "date": {}
  },
  "Voided At": {
    "type": "date" as const,
    "date": {}
  },
  "Next Payment Attempt": {
    "type": "date" as const,
    "date": {}
  },
  "Billing Reason": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "manual", "color": "gray" as const},
        {"name": "subscription", "color": "blue" as const},
        {"name": "subscription_create", "color": "blue" as const},
        {"name": "subscription_cycle", "color": "blue" as const},
        {"name": "subscription_threshold", "color": "orange" as const},
        {"name": "subscription_update", "color": "purple" as const},
        {"name": "upcoming", "color": "yellow" as const}
      ]
    }
  },
  "Attempted": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Attempt Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Auto Advance": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Live Mode": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Customer Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Email": {
    "type": "email" as const,
    "email": {}
  },
  "Customer Phone": {
    "type": "phone_number" as const,
    "phone_number": {}
  },
  "Customer Tax Exempt": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "none", "color": "gray" as const},
        {"name": "exempt", "color": "green" as const},
        {"name": "reverse", "color": "orange" as const}
      ]
    }
  },
  "Customer Address Line 1": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Address Line 2": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer City": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer State": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Postal Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Shipping Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Shipping Phone": {
    "type": "phone_number" as const,
    "phone_number": {}
  },
  "Customer Shipping Address Line 1": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Shipping Address Line 2": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Shipping City": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Shipping State": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Shipping Postal Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Customer Shipping Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Automatic Tax Enabled": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Automatic Tax Status": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "complete", "color": "green" as const},
        {"name": "failed", "color": "red" as const},
        {"name": "requires_location_inputs", "color": "yellow" as const}
      ]
    }
  },
  "Description": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Footer": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Statement Descriptor": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Default Payment Method": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Default Source": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Hosted Invoice URL": {
    "type": "url" as const,
    "url": {}
  },
  "Invoice PDF URL": {
    "type": "url" as const,
    "url": {}
  },
  "Receipt Number": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Account Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Account Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Application": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "On Behalf Of": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Subscription": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Quote": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Latest Revision": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "From Invoice": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Line Items Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Payments Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Tax Rate Percentage": {
    "type": "number" as const,
    "number": {
      "format": "percent" as const
    }
  },
  "Webhooks Delivered At": {
    "type": "date" as const,
    "date": {}
  },
  "Test Clock": {
    "type": "rich_text" as const,
    "rich_text": {}
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