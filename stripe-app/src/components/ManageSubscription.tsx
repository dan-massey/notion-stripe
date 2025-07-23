import { Box, Button, Spinner, Icon } from "@stripe/ui-extension-sdk/ui";
import { useAccount } from "@/services/accountProvider";

const statusToDescription = {
  incomplete: "Payment information incomplete",
  incomplete_expired: "Payment information incomplete",
  trialing: "In trial mode",
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  paused: "Paused",
};

export const ManageSubscription = () => {
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
      <Box css={{ font: "heading" }}>Manage Subscription</Box>
      <Box>
        Subscription{": "}
        {
          statusToDescription[
            account?.membership
              ?.stripeSubscriptionStatus as keyof typeof statusToDescription
          ]
        }
        {account?.membership?.cancelAt && (
          <Box>
            {" "}
            Your subscription will cancel at{" "}
            {new Date(account.membership.cancelAt * 1000).toLocaleString()}
          </Box>
        )}
        {account?.membership?.trialEnd && (
          <Box>
            {" "}
            Your free trial will end at{" "}
            {new Date(account.membership.trialEnd * 1000).toLocaleString()}
          </Box>
        )}
      </Box>
      <Box css={{ stack: "x", gapX: "medium" }}>
        {!loading && (
          <>
            <Button onPress={refetch} css={{ width: "1/2" }}>
              Refresh
            </Button>
            <Button
              type="primary"
              href={account?.manageSubscriptionUrl}
              target="_blank"
              css={{ width: "1/2" }}
            >
              <Icon name="external" />
              Manage your Subscription
            </Button>
          </>
        )}
        {loading && (
          <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
            <Spinner size="small" /> Loading...
          </Box>
        )}
      </Box>
    </Box>
  );
};
