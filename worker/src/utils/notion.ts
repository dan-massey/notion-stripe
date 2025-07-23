import type {
  CreateDatabaseParameters,
  CreateDatabaseResponse,
  CreatePageParameters,
  CreatePageResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  SearchParameters,
  PageObjectResponse,
  UpdatePageParameters,
  UpdatePageResponse,
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
const MIN_REQUEST_DURATION_MS = 340; // 0.34 seconds to stay under 3 requests/second

async function notionAPI<T>(
  endpoint: string,
  options: RequestInit,
  retries = 5
): Promise<T> {
  const url = `${NOTION_API_BASE_URL}/${endpoint}`;
  let lastError: Error | null = null;

  console.log(`[NotionAPI] Making request to: ${url}`);
  console.log(`[NotionAPI] Method: ${options.method}`);

  for (let i = 0; i < retries; i++) {
    const requestStartTime = Date.now();
    
    try {
      const response = await fetch(url, options);

      console.log(`[NotionAPI] Response status: ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`[NotionAPI] Rate limited, retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue; // Retry the request
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[NotionAPI] Error response body:`, errorBody);
        throw new Error(`Notion API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const responseData = await response.json() as T;
      
      // Ensure minimum request duration to stay under rate limit
      const requestDuration = Date.now() - requestStartTime;
      if (requestDuration < MIN_REQUEST_DURATION_MS) {
        const remainingDelay = MIN_REQUEST_DURATION_MS - requestDuration;
        console.log(`[NotionAPI] Enforcing rate limit, waiting additional ${remainingDelay}ms`);
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }
      
      return responseData;
    } catch (error) {
      console.error(`[NotionAPI] Request failed (attempt ${i + 1}/${retries}):`, error);
      lastError = error as Error;
      
      // Still enforce minimum duration even on errors to maintain consistent rate limiting
      const requestDuration = Date.now() - requestStartTime;
      if (requestDuration < MIN_REQUEST_DURATION_MS) {
        const remainingDelay = MIN_REQUEST_DURATION_MS - requestDuration;
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }
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
  const { database_id, ...bodyParams } = params;
  return notionAPI<QueryDatabaseResponse>(
    `databases/${database_id}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(bodyParams),
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

export async function updatePage(
  authToken: string,
  pageId: string,
  params: Omit<UpdatePageParameters, 'page_id'>
): Promise<UpdatePageResponse> {
  return notionAPI<UpdatePageResponse>(`pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(params),
  });
}

export async function upsertPageByTitle(
  authToken: string,
  databaseId: string,
  titleProperty: string,
  titleValue: string,
  properties: Record<string, any>
): Promise<CreatePageResponse | UpdatePageResponse> {
  console.log(`[UpsertPage] Starting upsert for title: "${titleValue}" in database: ${databaseId}`);
  console.log(`[UpsertPage] Title property: ${titleProperty}`);

  // First, query the database to see if a page with this title already exists
  console.log(`[UpsertPage] Querying database for existing page...`);
  const queryResult = await queryDatabase(authToken, {
    database_id: databaseId,
    filter: {
      property: titleProperty,
      title: {
        equals: titleValue,
      },
    },
  });

  console.log(`[UpsertPage] Query returned ${queryResult.results.length} results`);

  if (queryResult.results.length > 0) {
    // Update existing page
    const existingPage = queryResult.results[0] as PageObjectResponse;
    console.log(`[UpsertPage] Updating existing page: ${existingPage.id}`);
    return updatePage(authToken, existingPage.id, {
      properties,
    });
  } else {
    // Create new page
    console.log(`[UpsertPage] Creating new page in database`);
    return createPage(authToken, {
      parent: {
        type: "database_id",
        database_id: databaseId,
      },
      properties,
    });
  }
}

export async function findPageByTitle(
  authToken: string,
  databaseId: string,
  titleProperty: string,
  titleValue: string
): Promise<PageObjectResponse | null> {
  console.log(`[FindPage] Searching for page with title: "${titleValue}" in database: ${databaseId}`);
  
  const queryResult = await queryDatabase(authToken, {
    database_id: databaseId,
    filter: {
      property: titleProperty,
      title: {
        equals: titleValue,
      },
    },
  });

  console.log(`[FindPage] Query returned ${queryResult.results.length} results`);
  
  if (queryResult.results.length > 0) {
    return queryResult.results[0] as PageObjectResponse;
  }
  
  return null;
}
