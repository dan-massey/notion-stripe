import React, { useState } from "react";
import {
  Box,
  Button,
  Link,
  Spinner,
  Icon,
  Inline,
} from "@stripe/ui-extension-sdk/ui";

import { useApi } from "@/services/apiProvider";
import { useAccount } from "@/services/accountProvider";

const makeNotionLink = (pageId: string | null | undefined) => {
  if (!pageId) return "https://notion.so";
  return `https://notion.so/${pageId.replaceAll("-", "")}`;
};

export const NotionDatabasesLinked: React.FC = () => {
  const { postTyped } = useApi();
  const { account, setAccountDetails } = useAccount();

  const [resettingDatabases, setResettingDatabases] = useState(false);
  const [confirm, setConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const databases = account?.account?.notionConnection?.databases;

  const resetDatabases = async () => {
    try {
      setResettingDatabases(true);
      setError(null);

      const response = await postTyped("/stripe/notion/databases/clear");
      setAccountDetails(response);
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

  if (confirm) {
    return (
      <Box
        css={{
          width: "fill",
          height: "fill",
          stack: "y",
          distribute: "space-between",
          gap: "medium",
          keyline: "neutral",
          borderRadius: "medium",
          padding: "medium",
        }}
      >
        <Box css={{ font: "subheading" }}>Step 2</Box>
        <Box css={{ stack: "y", distribute: "space-between", alignY: "top" }}>
          <Box css={{ stack: "y", gapY: "small", alignY: "center" }}>
            <Box css={{ font: "heading" }}>Reset Notion Databases</Box>
            <Box css={{ stack: "y", gapY: "small" }}>
              <Box css={{ font: "subheading", color: "critical" }}>
                Warning!
              </Box>
              <Box>
                If you reset the database connection, any currently connected
                databases will stop updating.
              </Box>
              <Box>
                If you add databases to a new page in Notion, they will be
                created as empty.
              </Box>
              <Box css={{ stack: "x", gapX: "medium" }}>
                <Button
                  type={"secondary"}
                  onPress={() => setConfirm(false)}
                  css={{ width: "1/2" }}
                >
                  Keep existing databases
                </Button>
                <Button
                  type={"destructive"}
                  onPress={resetDatabases}
                  css={{ width: "1/2" }}
                >
                  I'm sure. Reset Databases.
                </Button>
              </Box>
            </Box>
          </Box>
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
          href={makeNotionLink(databases?.customer.pageId)}
        >
          👥 Customers Database{" "}
          {databases?.customer.lastError && (
            <Inline css={{ color: "critical" }}>
              Something is wrong with this database:{" "}
              {databases?.customer.lastError}
            </Inline>
          )}
        </Link>
        <Link
          target="_blank"
          href={makeNotionLink(databases?.charge.pageId)}
        >
          💳 Charges Database{" "}
          {databases?.charge.lastError && (
            <Inline css={{ color: "critical" }}>
              Something is wrong with this database:{" "}
              {databases?.charge.lastError}
            </Inline>
          )}
        </Link>
        <Link
          target="_blank"
          href={makeNotionLink(databases?.subscription.pageId)}
        >
          🔄 Subscriptions Database{" "}
          {databases?.subscription.lastError && (
            <Inline css={{ color: "critical" }}>
              Something is wrong with this database:{" "}
              {databases?.subscription.lastError}
            </Inline>
          )}
        </Link>
        <Link
          target="_blank"
          href={makeNotionLink(databases?.invoice.pageId)}
        >
          📄 Invoices Database{" "}
          {databases?.invoice.lastError && (
            <Inline css={{ color: "critical" }}>
              Something is wrong with this database:{" "}
              {databases?.invoice.lastError}
            </Inline>
          )}
        </Link>
      </Box>
      <Box
        css={{
          marginTop: "medium",
          alignX: "start",
          alignY: "center",
        }}
      >
        <Inline
          css={{
            alignY: "center",
          }}
        >
          <Inline css={{ color: "critical", marginRight: "small" }}>
            <Icon name="warning" />
          </Inline>
          <Inline css={{ font: "body" }}>Please Note: </Inline>
        </Inline>
        Manually removing or renaming properties from these databases will break
        syncing.
      </Box>
      <Box
        css={{ marginTop: "large", stack: "x", gapX: "medium", alignX: "end" }}
      >
        <Button
          type="secondary"
          css={{ width: "1/2" }}
          href={makeNotionLink(account?.account?.notionConnection?.parentPageId)}
          target="_blank"
        >
          <Icon name="external" />
          View In Notion
        </Button>
        <Button
          type="destructive"
          css={{ width: "1/2" }}
          onPress={() => setConfirm(true)}
        >
          Reset Databases
        </Button>
      </Box>
    </Box>
  );
};
