import { useAccount } from "@/services/accountProvider";
import { useNotionSignIn } from "@/services/notionSignInProvider";
import { Button, Box, Icon, Spinner } from "@stripe/ui-extension-sdk/ui";
import { useState } from "react";

export const NotionSignIn = () => {
  const { isLoading, isSignedIn, signInUrl, signOut, checkAuthStatus } =
    useNotionSignIn();
  const { account } = useAccount();

  const [confirm, setConfirm] = useState<boolean>(false);

  const hasSignInError = !!account?.account?.tokenError;

  const getSignedInStatus = () => {
    if (isSignedIn && !hasSignInError) {
      return (
        <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
          <Icon name="checkCircle" css={{ fill: "success" }} /> Notion account
          connected
        </Box>
      );
    } else if (isSignedIn && hasSignInError) {
      return (
        <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
          <Icon name="warningCircle" css={{ fill: "critical" }} /> Notion
          account issue: {account?.account?.tokenError}
        </Box>
      );
    }
    return (
      <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
        <Icon name="warningCircle" css={{ fill: "critical" }} /> No Notion
        account connected
      </Box>
    );
  };

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
        <Box css={{ font: "subheading" }}>Step 1</Box>
        <Box css={{ stack: "y", distribute: "space-between", alignY: "top" }}>
          <Box css={{ stack: "y", gapY: "small", alignY: "center" }}>
            <Box css={{ font: "heading" }}>Disconnect Stripe from Notion</Box>
            <Box css={{ stack: "y", gapY: "small" }}>
              <Box css={{ font: "subheading", color: "critical" }}>
                Warning!
              </Box>
              <Box>
                Disconnecting Notion will stop your Notion databases being
                updated.
              </Box>
              <Box>
                If you reconnect Notion later you will create new, empty
                databases.
              </Box>
              <Box>
                If you have an active subscription, please cancel that below.
              </Box>
              <Box css={{ stack: "x", gapX: "medium" }}>
                <Button
                  type={isLoading ? "secondary" : "secondary"}
                  onPress={() => setConfirm(false)}
                  css={{ width: "1/2" }}
                >
                  Keep Notion connected
                </Button>
                <Button
                  type={isLoading ? "secondary" : "destructive"}
                  disabled={isLoading}
                  onPress={async () => {
                    setConfirm(false);
                    await signOut();
                  }}
                  css={{ width: "1/2" }}
                >
                  I'm sure. Disconnect from Notion.
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

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
      <Box>
        <Box css={{ font: "subheading" }}>Step 1</Box>
        <Box css={{ stack: "y", distribute: "space-between", alignY: "top" }}>
          {isLoading ? (
            <Box css={{ stack: "y", gapY: "small", alignY: "center" }}>
              <Box css={{ font: "heading" }}>Connect Stripe to Notion</Box>
              <Box>
                <Spinner size="small" /> Loading...
              </Box>
            </Box>
          ) : (
            <Box css={{ stack: "y", gapY: "small" }}>
              <Box css={{ font: "heading" }}>Connect Stripe to Notion</Box>
              {getSignedInStatus()}
            </Box>
          )}
        </Box>
      </Box>
      <Box>
        {isSignedIn ? (
          <Box css={{ stack: "x", gapX: "medium" }}>
            <Button
              type={isLoading ? "secondary" : "secondary"}
              disabled={isLoading}
              target="_blank"
              href={signInUrl || ""}
              css={{ width: "1/2" }}
            >
              <Icon name="external" />
              Update Page Permissions
            </Button>
            <Button
              type={isLoading ? "secondary" : "destructive"}
              disabled={isLoading}
              onPress={() => setConfirm(true)}
              css={{ width: "1/2" }}
            >
              <Icon name="signOut" />
              Disconnect from Notion
            </Button>
          </Box>
        ) : (
          <Box css={{ stack: "x", gapX: "medium" }}>
            <Button
              type={isLoading ? "secondary" : "secondary"}
              disabled={isLoading}
              target="_blank"
              onPress={checkAuthStatus}
              css={{ width: "1/2" }}
            >
              <Icon name="refresh" />
              Check Connection
            </Button>
            <Button
              type={isLoading ? "secondary" : "primary"}
              disabled={isLoading}
              target="_blank"
              href={signInUrl || ""}
              css={{ width: "1/2" }}
            >
              <Icon name="external" />
              Connect to Notion
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};
