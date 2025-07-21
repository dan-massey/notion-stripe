
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Spinner,
} from "@stripe/ui-extension-sdk/ui";
import { useApi } from "@/services/apiProvider";
import { useNotionSignIn } from "@/services/notionSignInProvider";
import type { ResponseForEndpoint } from "@worker/stripe-frontend-endpoints";

type NotionPagesResponse = ResponseForEndpoint<"/stripe/notion/pages">;

export const NotionPages: React.FC = () => {
  const { getTyped } = useApi();
  const { isSignedIn, isLoading: authLoading } = useNotionSignIn();
  
  const [pages, setPages] = useState<NotionPagesResponse["pages"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    if (!isSignedIn) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getTyped("/stripe/notion/pages");
      setPages(response.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
      console.error("Failed to fetch Notion pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && !authLoading) {
      fetchPages();
    }
  }, [isSignedIn, authLoading]);

  if (!isSignedIn) {
    return (
      <Box css={{ padding: "medium" }}>
        <Box css={{ color: "secondary" }}>
          Sign in to Notion to view your pages
        </Box>
      </Box>
    );
  }

  if (loading || authLoading) {
    return (
      <Box css={{ padding: "medium", textAlign: "center" }}>
        <Spinner size="large" />
        <Box css={{ marginTop: "small", color: "secondary" }}>
          Loading your Notion pages...
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box css={{ padding: "medium" }}>
        <Box css={{ color: "critical", marginBottom: "medium" }}>
          Error: {error}
        </Box>
        <Button onPress={fetchPages}>
          Retry
        </Button>
      </Box>
    );
  }

  if (pages.length === 0) {
    return (
      <Box css={{ padding: "medium" }}>
        <Box css={{ color: "secondary", marginBottom: "medium" }}>
          No pages found in your Notion workspace
        </Box>
        <Button onPress={fetchPages}>
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box css={{ padding: "medium" }}>
      <Box css={{ 
        marginBottom: "medium", 
        font: "heading"
      }}>
        Your Notion Pages ({pages.length})
      </Box>
      
      <Box css={{ marginBottom: "medium" }}>
        <Button onPress={fetchPages} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </Box>

      <Box css={{ gap: "small" }}>
        {pages.map((page) => (
          <Box
            key={page.id}
            css={{
              background: "container",
              borderRadius: "medium",
              padding: "medium"
            }}
          >
            <Box css={{ 
              font: "subheading", 
              marginBottom: "small"
            }}>
              {(page as any).title || "Untitled Page"}
            </Box>
            
            <Box css={{ 
              font: "caption", 
              color: "secondary",
              marginBottom: "small"
            }}>
              ID: {page.id}
            </Box>
            
            {(page as any).url && (
              <Box>
                <Button 
                  type="secondary" 
                  href={(page as any).url} 
                  target="_blank"
                >
                  Open in Notion
                </Button>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};