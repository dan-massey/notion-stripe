import { useNotionSignIn } from "@/services/notionSignInProvider";
import {
  Button,
  Box,
  Icon,
  Spinner,
  Inline,
} from "@stripe/ui-extension-sdk/ui";

export const NotionSignIn = () => {
  const { isLoading, isSignedIn, signInUrl, signOut } = useNotionSignIn();
  console.log("isSignedIn", isSignedIn);
  console.log("signInUrl", signInUrl);

  return (
    <Box css={{ width: "fill", gapY: "medium" }}>
      <Box css={{ font: "subheading" }}>Step 1</Box>
      <Box css={{ font: "heading" }}>
        Sign in to connect Stripe with your Notion workspace
      </Box>
      <Box css={{ stack: "x", distribute: "space-between" }}>
        {isLoading ? (
          <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
            <Spinner size="small" /> Loading...
          </Box>
        ) : (
          <Box>
            {isSignedIn ? (
              <Inline>
                <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
                  <Icon name="checkCircle" css={{ fill: "success" }} /> Notion
                  account connected
                </Box>
              </Inline>
            ) : (
              <Inline>
                <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
                  <Icon name="warningCircle" css={{ fill: "critical" }} /> No
                  Notion account connected
                </Box>
              </Inline>
            )}
          </Box>
        )}
        <Box>
          {isSignedIn ? (
            <Button
              type={isLoading ? "secondary" : "destructive"}
              disabled={isLoading}
              onPress={signOut}
            >
              <Icon name="signOut" />
              Disconnect from Notion
            </Button>
          ) : (
            <Button
              type={isLoading ? "secondary" : "destructive"}
              disabled={isLoading}
              target="_blank"
              href={signInUrl || ""}
            >
              <Icon name="external" />
              Connect to Notion
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
