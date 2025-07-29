import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const getInvoiceLineItemSchema = (invoiceDatabaseId: string, priceDatabaseId?: string): CreateDatabaseParameters["properties"] => {
  const baseProperties: CreateDatabaseParameters["properties"] = {
    "Line Item ID": {
      "type": "title" as const,
      "title": {}
    },
    "Invoice": {
      "type": "relation" as const,
      "relation": {
        "database_id": invoiceDatabaseId,
        "type": "dual_property" as const,
        "dual_property": {}
      }
    },
    "Type": {
      "type": "select" as const,
      "select": {
        "options": [
          {"name": "invoiceitem", "color": "blue" as const},
          {"name": "subscription", "color": "green" as const}
        ]
      }
    },
    "Amount": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Amount Excluding Tax": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Currency": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Description": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Discountable": {
      "type": "checkbox" as const,
      "checkbox": {}
    },
    "Live Mode": {
      "type": "checkbox" as const,
      "checkbox": {}
    },
    "Proration": {
      "type": "checkbox" as const,
      "checkbox": {}
    },
    "Quantity": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Subscription": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Subscription Item": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Unit Amount Excluding Tax": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Invoice Item": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Period Start": {
      "type": "date" as const,
      "date": {}
    },
    "Period End": {
      "type": "date" as const,
      "date": {}
    },
    "Proration Details Credited Items Count": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Proration Details": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Tax Amounts Count": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Tax Amounts": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Tax Rates Count": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Tax Rates": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Discount Amounts Count": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Discount Amounts": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Discounts Count": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Discounts": {
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
  };

  // Add price relation only if priceDatabaseId is provided
  if (priceDatabaseId) {
    baseProperties["Price"] = {
      "type": "relation" as const,
      "relation": {
        "database_id": priceDatabaseId,
        "type": "dual_property" as const,
        "dual_property": {}
      }
    };
  }

  return baseProperties;
};