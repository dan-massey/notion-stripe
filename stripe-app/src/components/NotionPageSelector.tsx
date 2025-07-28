import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Spinner,
  Icon,
  Radio,
  Inline,
  TextField,
} from "@stripe/ui-extension-sdk/ui";

import { useApi } from "@/services/apiProvider";
import { useNotionSignIn } from "@/services/notionSignInProvider";
import type { ResponseForEndpoint } from "@worker/stripe-frontend-endpoints";
import { useAccount } from "@/services/accountProvider";

type NotionPagesResponse = ResponseForEndpoint<"/stripe/notion/pages">;

const getIconFromPage = (page: NotionPagesResponse["results"][0]) => {
  const icon = page?.icon;
  if (icon?.type === "emoji") {
    return icon.emoji;
  }
};

const getLabelFromPage = (page: NotionPagesResponse["results"][0]) => {
  // Find the property with type "title"
  const titleProperty = Object.values(page?.properties || {}).find(
    (prop: any) => prop?.type === "title"
  ) as any;
  const title =
    titleProperty?.type === "title" && titleProperty.title?.length > 0
      ? titleProperty.title[0]?.plain_text
      : "Untitled";
  return `${getIconFromPage(page) ?? ""} ${title}`.trim();
};

export const NotionPageSelector: React.FC = () => {
  const { getTyped, postTyped } = useApi();
  const { setAccountDetails } = useAccount();
  const { isSignedIn } = useNotionSignIn();

  const [pages, setPages] = useState<NotionPagesResponse["results"]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [creatingDatabases, setCreatingDatabases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const refreshAllPages = async () => {
    if (!isSignedIn) return;

    try {
      setLoadingPages(true);
      setError(null);
      setSearchValue(null);

      const response = await getTyped("/stripe/notion/pages");
      setPages(response.results);
      setNextCursor(response.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
      console.error("Failed to fetch Notion pages:", err);
    } finally {
      setLoadingPages(false);
    }
  };

  const searchPages = async () => {
    if (!isSignedIn) return;
    try {
      setLoadingPages(true);
      setError(null);

      const response = await getTyped("/stripe/notion/pages", null, {
        searchValue: searchValue ?? "",
      });
      setPages(response.results);
      setNextCursor(response.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
      console.error("Failed to fetch Notion pages:", err);
    } finally {
      setLoadingPages(false);
    }
  };

  const pageForward = async () => {
    if (!isSignedIn || !nextCursor) return;
    try {
      setLoadingPages(true);
      setError(null);

      const response = await getTyped("/stripe/notion/pages", null, {
        nextCursor,
        searchValue: searchValue ?? "",
      });
      setPages(response.results);
      setNextCursor(response.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
      console.error("Failed to fetch Notion pages:", err);
    } finally {
      setLoadingPages(false);
    }
  };

  const createDatabases = async () => {
    if (!isSignedIn || !selectedPageId) return;

    try {
      setCreatingDatabases(true);
      setError(null);

      const response = await postTyped("/stripe/notion/databases", null, {
        parentPageId: selectedPageId,
      });
      setAccountDetails(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create databases"
      );
      console.error("Failed to create databases:", err);
    } finally {
      setCreatingDatabases(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      refreshAllPages();
    }
  }, [isSignedIn]);

  let content;
  if (loadingPages) {
    content = (
      <Box css={{ padding: "medium", textAlign: "center" }}>
        <Spinner size="large" />
        <Box css={{ marginTop: "small", color: "secondary" }}>
          Loading pages...
        </Box>
      </Box>
    );
  } else if (error) {
    content = (
      <Box css={{ padding: "medium" }}>
        <Box css={{ color: "critical", marginBottom: "medium" }}>
          Error: {error}
        </Box>
        <Button onPress={refreshAllPages}>Retry</Button>
      </Box>
    );
  } else if (pages.length === 0) {
    content = (
      <Box css={{ padding: "medium" }}>
        <Box css={{ color: "secondary", marginBottom: "medium" }}>
          No pages found in your Notion workspace. Check you shared pages with
          the app.
        </Box>
        <Button onPress={refreshAllPages}>Refresh</Button>
      </Box>
    );
  } else {
    content = creatingDatabases ? (
      <Box css={{ padding: "medium", textAlign: "center" }}>
        <Spinner size="large" />
        <Box css={{ marginTop: "small", color: "secondary" }}>
          Creating databases...
        </Box>
      </Box>
    ) : (
      <>
        <Box
          css={{
            stack: "x",
            gapX: "small",
            marginY: "small",
            alignY: "bottom",
          }}
        >
          <TextField
            css={{ width: "1/3" }}
            size="small"
            label="Filter pages"
            type="text"
            value={searchValue || ""}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Button size="small" onPress={searchPages}>Search</Button>
        </Box>
        <Box css={{ stack: "y", gapY: "small", marginY: "small" }}>
          {pages
            .filter((page) => {
              if (page?.object !== "page") return false;
              // Check if the page has any property with type "title"
              return Object.values(page?.properties || {}).some(
                (prop: any) => prop?.type === "title"
              );
            })
            .map((page) => (
              <Radio
                name="page"
                value={page.id}
                key={page.id}
                label={getLabelFromPage(page)}
                onChange={(event) => {
                  setSelectedPageId(event.target.value);
                }}
              />
            ))}
          <Box css={{ stack: "x", gapX: "small", marginY: "small" }}>
            <Button disabled={!nextCursor} onPress={pageForward} size="small">
              See more
              <Icon name="next" size="xsmall" />
            </Button>
          </Box>
        </Box>
        <Box css={{ stack: "x", gapX: "medium" }}>
          <Button onPress={refreshAllPages} css={{ width: "1/2" }}>
            <Icon name="refresh" size="xsmall" /> Refresh Recent Pages
          </Button>
          <Button
            type="primary"
            onPress={createDatabases}
            disabled={!selectedPageId}
            css={{ width: "1/2" }}
          >
            Create Databases
          </Button>
        </Box>
      </>
    );
  }

  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        keyline: "neutral",
        borderRadius: "medium",
        padding: "medium",
      }}
    >
      {" "}
      <Box css={{ font: "subheading" }}>Step 2</Box>
      <Box
        css={{
          font: "heading",
          stack: "x",
          gapX: "small",
          distribute: "space-between",
        }}
      >
        <Inline>Choose a page to add new databases</Inline>
      </Box>
      {content}
    </Box>
  );
};
