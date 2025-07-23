import { Box, Button, Spinner, Icon } from "@stripe/ui-extension-sdk/ui";
import { useAccount } from "@/services/accountProvider";
export const Subscribe = () => {
  const { account, loading, error, refetch } = useAccount();
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
      <Box css={{ font: "subheading" }}>Step 3</Box>
      <Box css={{ font: "heading" }}>Set up Billing (14 day free trial)</Box>
      <Box css={{ stack: "x", gapX: "medium" }}>
        {!loading && (
          <>
            <Button onPress={refetch} css={{ width: "1/2" }}>
              Refresh
            </Button>
            <Button
              type="primary"
              href={account?.checkoutUrl}
              target="_blank"
              css={{ width: "1/2" }}
            >
              <Icon name="external" />
              Start your free trial
            </Button>
          </>
        )}
        {
            loading && (
              <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
                <Spinner size="small" /> Loading...
              </Box>
            )
        }
      </Box>
    </Box>
  );
};
