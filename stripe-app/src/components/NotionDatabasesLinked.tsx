import React, { useState } from "react";
import { Box, Button, Link, Spinner, Icon } from "@stripe/ui-extension-sdk/ui";

import { useApi } from "@/services/apiProvider";
import { useAccount } from "@/services/accountProvider";

const makeNotionLink = (pageId: string | null | undefined) => {
  if (!pageId) return "https://notion.so";
  return `https://notion.so/${pageId.replaceAll("-", "")}`;
};

export const NotionDatabasesLinked: React.FC = () => {
  const { postTyped } = useApi();
  const { account, setDatabaseIds } = useAccount();

  const [resettingDatabases, setResettingDatabases] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDatabases = async () => {
    try {
      setResettingDatabases(true);
      setError(null);

      const response = await postTyped("/stripe/notion/databases/clear");
      setDatabaseIds(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset databases"
      );
      console.error("Failed to reset Notion databases:", err);
    } finally {
      setResettingDatabases(false);
    }
  };

  if (resettingDatabases) {
    return (
      <Box css={{ padding: "medium", textAlign: "center" }}>
        <Spinner size="large" />
        <Box css={{ marginTop: "small", color: "secondary" }}>
          Resetting databases...
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
        <Button onPress={resetDatabases}>Retry Reset</Button>
      </Box>
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
      <Box css={{ font: "subheading" }}>Step 2</Box>
      <Box css={{ font: "heading" }}>Linked Notion Databases</Box>
      <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
        <Icon name="checkCircle" css={{ fill: "success" }} /> 4 Databases
        Connected
      </Box>
      <Box css={{ stack: "y", gapY: "small" }}>
        <Link
          target="_blank"
          href={makeNotionLink(account?.membership?.customerDatabaseId)}
        >
          👥 Customers Database
        </Link>
        <Link
          target="_blank"
          href={makeNotionLink(account?.membership?.chargeDatabaseId)}
        >
          💳 Charges Database
        </Link>
        <Link
          target="_blank"
          href={makeNotionLink(account?.membership?.subscriptionDatabaseId)}
        >
          🔄 Subscriptions Database
        </Link>
        <Link
          target="_blank"
          href={makeNotionLink(account?.membership?.invoiceDatabaseId)}
        >
          📄 Invoices Database
        </Link>
      </Box>

      <Box
        css={{ marginTop: "large", stack: "x", gapX: "medium", alignX: "end" }}
      >
        <Button
          type="secondary"
          css={{ width: "1/2" }}
          href={makeNotionLink(account?.membership?.parentPageId)}
          target="_blank"
        >
          <Icon name="external" />
          View In Notion
        </Button>
        <Button
          type="destructive"
          css={{ width: "1/2" }}
          onPress={resetDatabases}
        >
          Reset Databases
        </Button>
      </Box>
    </Box>
  );
};
