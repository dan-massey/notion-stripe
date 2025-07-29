import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const getCreditNoteSchema = (customerDatabaseId: string, invoiceDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Credit Note ID": {
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
  "Invoice": {
    "type": "relation" as const,
    "relation": {
      "database_id": invoiceDatabaseId,
      "type": "dual_property" as const,
      "dual_property": {}
    }
  },
  "Number": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Status": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "issued", "color": "green" as const},
        {"name": "void", "color": "red" as const}
      ]
    }
  },
  "Amount": {
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
  "Currency": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Memo": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "PDF": {
    "type": "url" as const,
    "url": {}
  },
  "Reason": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "duplicate", "color": "orange" as const},
        {"name": "fraudulent", "color": "red" as const},
        {"name": "order_change", "color": "blue" as const},
        {"name": "product_unsatisfactory", "color": "purple" as const}
      ]
    }
  },
  "Pre Payment Amount": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Post Payment Amount": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Effective At": {
    "type": "date" as const,
    "date": {}
  },
  "Customer Balance Transaction": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Discount Amount": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Refunds Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Shipping Cost Amount Subtotal": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Shipping Cost Amount Tax": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Shipping Cost Amount Total": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Shipping Rate": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "pre_payment", "color": "blue" as const},
        {"name": "post_payment", "color": "green" as const},
        {"name": "mixed", "color": "purple" as const}
      ]
    }
  },
  "Voided At": {
    "type": "date" as const,
    "date": {}
  },
  "Created Date": {
    "type": "date" as const,
    "date": {}
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
  "Lines Count": {
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
  "Subtotal Excluding Tax": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
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
  "Total": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Total Excluding Tax": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Out of Band Amount": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Live Mode": {
    "type": "checkbox" as const,
    "checkbox": {}
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
});