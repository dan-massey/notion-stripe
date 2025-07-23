import { useNotionSignIn } from "@/services/notionSignInProvider";
import { Button, Box, Icon, Spinner } from "@stripe/ui-extension-sdk/ui";

export const NotionSignIn = () => {
  const { isLoading, isSignedIn, signInUrl, signOut, checkAuthStatus } =
    useNotionSignIn();
  console.log("isSignedIn", isSignedIn);
  console.log("signInUrl", signInUrl);

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
              {isSignedIn ? (
                <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
                  <Icon name="checkCircle" css={{ fill: "success" }} /> Notion
                  account connected
                </Box>
              ) : (
                <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
                  <Icon name="warningCircle" css={{ fill: "critical" }} /> No
                  Notion account connected
                </Box>
              )}
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
              css={{width: "1/2"}}
            >
              <Icon name="external" />
              Edit Permissions
            </Button>
            <Button
              type={isLoading ? "secondary" : "destructive"}
              disabled={isLoading}
              onPress={signOut}
              css={{width: "1/2"}}
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
              css={{width: "1/2"}}
            >
              <Icon name="refresh" />
              Check Connection
            </Button>
            <Button
              type={isLoading ? "secondary" : "primary"}
              disabled={isLoading}
              target="_blank"
              href={signInUrl || ""}
              css={{width: "1/2"}}
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
