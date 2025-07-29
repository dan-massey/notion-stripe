import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";

export const productSchema: CreateDatabaseParameters["properties"] = {
  "Product ID": {
    "type": "title" as const,
    "title": {}
  },
  "Name": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Active": {
    "type": "checkbox" as const,
    "checkbox": {}
  },
  "Description": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Default Price": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Statement Descriptor": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Unit Label": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Tax Code": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "URL": {
    "type": "url" as const,
    "url": {}
  },
  "Shippable": {
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
  "Updated Date": {
    "type": "date" as const,
    "date": {}
  },
  "Images Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Images URLs": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Marketing Features Count": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Marketing Features": {
    "type": "rich_text" as const,
    "rich_text": {}
  },
  "Package Height": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Package Length": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Package Width": {
    "type": "number" as const,
    "number": {
      "format": "number" as const
    }
  },
  "Package Weight": {
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