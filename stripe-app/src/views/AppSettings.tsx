import {
  Box,
  SettingsView,
  Button,
} from "@stripe/ui-extension-sdk/ui";
import { useState } from "react";
import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { ApiProvider, useApi } from "@/services/apiProvider";
import type { ResponseForEndpoint } from "@worker/stripe-frontend-endpoints";

const AppSettingsContent = () => {
  const { postTyped, getTyped, userContext } = useApi();
  const [membership, setMembership] = useState<ResponseForEndpoint<"/stripe/membership"> | null>(null);
  
  const getMembershipStatus = async () => {
    const response = await getTyped("/stripe/membership");
    setMembership(response);
  };

  return (
    <SettingsView>
      <Box
        css={{
          background: "container",
          borderRadius: "medium",
          padding: "large",
        }}
      >
        <Button onPress={() => postTyped("/stripe")}>
          Send test request
        </Button>

        <Button onPress={getMembershipStatus}>Get membership info</Button>
        {membership?.checkoutUrl ? (
          <Box>
            {membership.checkoutUrl +
              "?client_reference_id=" +
              userContext.account.id}
          </Box>
        ) : null}
        {membership?.membership ? (
          <Box>
            <Box>
              <Box>
                Status: {membership.membership.stripeSubscriptionStatus}
              </Box>
              <Box>Manage subscription: {membership.manageSubscriptionUrl}</Box>
              <Box>Customer ID: {membership.membership.stripeCustomerId}</Box>
              <Box>
                Subscription ID: {membership.membership.stripeSubscriptionId}
              </Box>
              <Box>Trial end: {membership.membership.trialEnd}</Box>
              <Box>Cancel at: {membership.membership.cancelAt}</Box>
            </Box>
          </Box>
        ) : null}
      </Box>
    </SettingsView>
  );
};

const AppSettings = ({ userContext, environment }: ExtensionContextValue) => {
  return (
    <ApiProvider
      userContext={userContext}
      environment={environment}
      apiUrl="https://willing-grub-included.ngrok-free.app"
    >
      <AppSettingsContent />
    </ApiProvider>
  );
};

export default AppSettings;
