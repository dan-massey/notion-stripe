import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const getPriceSchema = (productDatabaseId: string): CreateDatabaseParameters["properties"] => ({
  "Price ID": {
    "type": "title" as const,
    "title": {}
  },
  "Product": {
    "type": "relation" as const,
    "relation": {
      "database_id": productDatabaseId,
      "type": "dual_property" as const,
      "dual_property": {}
    }
  },
  "Active": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "one_time", "color": "blue" as const},
        {"name": "recurring", "color": "green" as const}
      ]
    }
  },
  "Billing Scheme": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "per_unit", "color": "blue" as const},
        {"name": "tiered", "color": "purple" as const}
      ]
    }
  },
  "Currency": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Unit Amount": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Unit Amount Decimal": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Nickname": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Lookup Key": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Tax Behavior": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "inclusive", "color": "green" as const},
        {"name": "exclusive", "color": "orange" as const},
        {"name": "unspecified", "color": "gray" as const}
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
  "Recurring Interval": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "day", "color": "blue" as const},
        {"name": "week", "color": "green" as const},
        {"name": "month", "color": "purple" as const},
        {"name": "year", "color": "red" as const}
      ]
    }
  },
  "Recurring Interval Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Recurring Usage Type": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "licensed", "color": "blue" as const},
        {"name": "metered", "color": "green" as const}
      ]
    }
  },
  "Recurring Meter": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Custom Unit Amount Minimum": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Custom Unit Amount Maximum": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Custom Unit Amount Preset": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Tiers Mode": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "graduated", "color": "blue" as const},
        {"name": "volume", "color": "purple" as const}
      ]
    }
  },
  "Tiers Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Transform Quantity Divide By": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Transform Quantity Round": {
    "type": "select" as const,
    "select": {
      "options": [
        {"name": "up", "color": "green" as const},
        {"name": "down", "color": "red" as const}
      ]
    }
  },
  "Currency Options Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Currency Options": {
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