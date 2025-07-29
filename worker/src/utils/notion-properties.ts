/**
 * Utility functions for creating Notion properties
 * These eliminate repetitive property creation patterns across converters
 */
import type Stripe from "stripe";

export function createRichTextProperty(
  content: string | null | undefined
): any {
  return {
    rich_text: [
      {
        type: "text",
        text: {
          content: content || "",
        },
      },
    ],
  };
}

export function createTitleProperty(content: string): any {
  return {
    title: [
      {
        type: "text",
        text: {
          content: content,
        },
      },
    ],
  };
}

export function createSelectProperty(value: string | null | undefined): any {
  return {
    select: value ? { name: value } : null,
  };
}

export function createDateProperty(timestamp: number | null | undefined): any {
  if (!timestamp) return { date: null };

  return {
    date: {
      start: new Date(timestamp * 1000).toISOString().split("T")[0],
    },
  };
}

export function createDateTimeProperty(
  timestamp: number | null | undefined
): any {
  if (!timestamp) return { date: null };

  return {
    date: {
      start: new Date(timestamp * 1000).toISOString(),
    },
  };
}

export function createPhoneProperty(
  phoneNumber: string | null | undefined
): any {
  if (!phoneNumber) {
    return { phone_number: null };
  }

  return {
    phone_number: phoneNumber ?? null,
  };
}

export function createNumberProperty(value: number | null | undefined): any {
  return {
    number: value ?? null,
  };
}

export function createCheckboxProperty(value: boolean | null | undefined): any {
  return {
    checkbox: Boolean(value),
  };
}

export function createUrlProperty(url: string | null | undefined): any {
  return {
    url: url || null,
  };
}

export function createEmailProperty(email: string | null | undefined): any {
  return {
    email: email || null,
  };
}

export function createRelationProperty(pageId: string | null | undefined): any {
  return {
    relation: pageId ? [{ id: pageId }] : [],
  };
}

export function createMultiSelectProperty(values: string[]): any {
  return {
    multi_select: values.map((value) => ({ name: value })),
  };
}

export function stringFromObject(
  value: { id: string } | string | null | undefined
): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return value.id;
}
