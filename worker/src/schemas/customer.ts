import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const customerSchema: CreateDatabaseParameters["properties"] = {
  "Customer ID": {
    "type": "title" as const,
    "title": {}
  },
  "Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Email": {
    "type": "email" as const,
    "email": {}
  },
  "Phone": {
    "type": "phone_number" as const,
    "phone_number": {}
  },
  "Balance": {
    "type": "number" as const,
    "number": {
      "format": "dollar" as const
    }
  },
  "Currency": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Delinquent": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Tax Exempt": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "none", "color": "gray" as const},
        {"name": "exempt", "color": "green" as const},
        {"name": "reverse", "color": "orange" as const}
      ]
    }
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
  "Invoice Prefix": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Next Invoice Sequence": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Address Line 1": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Address Line 2": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "City": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "State": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Postal Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Shipping Name": {
    "type": "rich_text" as const,
    "rich_text": {}
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
  "Shipping Phone": {
    "type": "phone_number" as const,
    "phone_number": {}
  },
  "Preferred Locales": {
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
  "Cash Balance Available": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Has Active Discount": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Discount Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "coupon", "color": "green" as const},
        {"name": "promotion_code", "color": "blue" as const}
      ]
    }
  },
  "Tax Location Country": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Tax Location State": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Tax Automatic Status": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "supported", "color": "green" as const},
        {"name": "not_collecting", "color": "yellow" as const},
        {"name": "failed", "color": "red" as const},
        {"name": "unrecognized_location", "color": "gray" as const}
      ]
    }
  },
  "Active Subscriptions": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Total Payment Sources": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Metadata": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Test Clock ID": {
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