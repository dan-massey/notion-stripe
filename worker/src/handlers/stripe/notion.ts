import { NotionSecretName } from "@/stripe-frontend-endpoints";
import type { AppContext } from "@/types";

export type NotionPage = {
  object: "page";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: { object: "user"; id: string };
  last_edited_by: { object: "user"; id: string };
  cover: any;
  icon: any;
  parent: any;
  archived: boolean;
  properties: Record<string, any>;
  url: string;
  public_url?: string;
};

export type NotionPagesResponse = {
  pages: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

const NOTION_SECRET_NAME: NotionSecretName = "NOTION_AUTH_TOKEN";

const getNotionToken = async (c: AppContext): Promise<string | null | undefined> => {
  const stripe = c.get("stripe");
  try {
    const notionSecret = await stripe.apps.secrets.find(
      {
        name: NOTION_SECRET_NAME,
        scope: {
          type: "account",
        },
        expand: ["payload"],
      },
      {
        stripeAccount: c.get("stripeAccountId"),
      }
    );
    return notionSecret.payload;
  } catch (e) {
    return null;
  }
};

export const getNotionLink = async (c: AppContext) => {
  const notionAuthLink = `${c.env.BASE_URL}/auth/signin?account_id=${c.get(
    "stripeAccountId"
  )}&mode=${c.get("stripeMode")}`;
  return c.json({ url: notionAuthLink });
};

export const getNotionPages = async (c: AppContext) => {
  const token = await getNotionToken(c);
  if (!token) {
    return c.json({ error: "Notion auth token not found" }, 404);
  }
  
  try {
    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        filter: {
          property: "object",
          value: "page"
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json() as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };
    
    const result: NotionPagesResponse = {
      pages: data.results,
      has_more: data.has_more,
      next_cursor: data.next_cursor
    };
    return c.json(result);
  } catch (error) {
    console.error("Error fetching Notion pages:", error);
    return c.json({ error: "Failed to fetch pages" }, 500);
  }
};
