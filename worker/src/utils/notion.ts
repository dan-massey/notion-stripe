import type {
  CreateDatabaseParameters,
  CreateDatabaseResponse,
  CreatePageParameters,
  CreatePageResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  SearchParameters,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type SearchResult = {
  object: "list";
  results: PageObjectResponse[];
  next_cursor: string | null;
  has_more: boolean;
  type: "page_or_database";
  page_or_database: {};
};

export type {
  SearchParameters,
  CreateDatabaseParameters,
  CreateDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";

async function notionAPI<T>(
  endpoint: string,
  options: RequestInit,
  retries = 5
): Promise<T> {
  const url = `${NOTION_API_BASE_URL}/${endpoint}`;
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue; // Retry the request
      }

      if (!response.ok) {
        throw new Error(`Notion API error: ${response.statusText}`);
      }

      return response.json() as T;
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw (
    lastError || new Error("Notion API request failed after multiple retries.")
  );
}

export async function revokeToken(clientId: string, clientSecret: string, authToken: string): Promise<void> {
  const encodedCredential = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return notionAPI("oauth/revoke", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedCredential}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      token: authToken,
    }),
  });
}

export async function queryDatabase(
  authToken: string,
  params: QueryDatabaseParameters
): Promise<QueryDatabaseResponse> {
  return notionAPI<QueryDatabaseResponse>(
    `databases/${params.database_id}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(params),
    }
  );
}

export async function createDatabase(
  authToken: string,
  parentPageId: string,
  databaseTitle: string,
  properties: CreateDatabaseParameters["properties"]
): Promise<CreateDatabaseResponse> {
  return notionAPI<CreateDatabaseResponse>("databases", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: {
        type: "page_id",
        page_id: parentPageId,
      },
      title: [
        {
          type: "text",
          text: {
            content: databaseTitle,
          },
        },
      ],
      properties: properties,
    }),
  });
}

export async function createPage(
  authToken: string,
  params: CreatePageParameters
): Promise<CreatePageResponse> {
  return notionAPI<CreatePageResponse>("pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(params),
  });
}

export async function searchNotion(
  authToken: string,
  params: SearchParameters
): Promise<SearchResult> {
  return notionAPI<SearchResult>("search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(params),
  });
}
