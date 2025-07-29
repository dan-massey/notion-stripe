import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const getPromotionCodeSchema = (customerDatabaseId?: string): CreateDatabaseParameters["properties"] => {
  const baseProperties: CreateDatabaseParameters["properties"] = {
    "Promotion Code ID": {
      "type": "title" as const,
      "title": {}
    },
    "Code": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Active": {
      "type": "checkbox" as const,
      "checkbox": {}
    },
    "Times Redeemed": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Max Redemptions": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Created Date": {
      "type": "date" as const,
      "date": {}
    },
    "Expires At": {
      "type": "date" as const,
      "date": {}
    },
    "Live Mode": {
      "type": "checkbox" as const,
      "checkbox": {}
    },
    "Coupon ID": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Coupon Name": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Coupon Duration": {
      "type": "select" as const,
      "select": {
        "options": [
          {"name": "forever", "color": "green" as const},
          {"name": "once", "color": "blue" as const},
          {"name": "repeating", "color": "purple" as const}
        ]
      }
    },
    "Coupon Duration In Months": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Coupon Amount Off": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Coupon Percent Off": {
      "type": "number" as const,
      "number": {
        "format": "percent" as const
      }
    },
    "Coupon Currency": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Coupon Valid": {
      "type": "checkbox" as const,
      "checkbox": {}
    },
    "Coupon Times Redeemed": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Coupon Max Redemptions": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Coupon Redeem By": {
      "type": "date" as const,
      "date": {}
    },
    "Coupon Created Date": {
      "type": "date" as const,
      "date": {}
    },
    "Coupon Applies To Products": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Coupon Currency Options Count": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Restrictions First Time Transaction": {
      "type": "checkbox" as const,
      "checkbox": {}
    },
    "Restrictions Minimum Amount": {
      "type": "number" as const,
      "number": {
        "format": "number" as const
      }
    },
    "Restrictions Minimum Amount Currency": {
      "type": "rich_text" as const,
      "rich_text": {}
    },
    "Restrictions Currency Options Count": {
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
  };

  // Add customer relation if customerDatabaseId is provided
  if (customerDatabaseId) {
    baseProperties["Customer"] = {
      "type": "relation" as const,
      "relation": {
        "database_id": customerDatabaseId,
        "type": "dual_property" as const,
        "dual_property": {}
      }
    };
  }

  return baseProperties;
};