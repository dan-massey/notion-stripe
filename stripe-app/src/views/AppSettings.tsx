import {
  Box,
  Icon,
  Inline,
  Link,
  SettingsView,
  Button,
} from "@stripe/ui-extension-sdk/ui";
import { useState, useEffect } from "react";
import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { makeApiRequest } from "../utils/api";

type Membership = {
  stripeSubscriptionStatus?: string | undefined;
  stripeCustomerId?: string | undefined;
  stripeSubscriptionId?: string | undefined;
  trialEnd?: number | null | undefined;
  cancelAt?: number | null | undefined;
  stripeAccountId: string;
  stripeMode: "live" | "test" | "sandbox";
};

type MembershipResponse =
  | {
      checkoutUrl: string;
      stripeMode: never;
      stripeAccountId: never;
      stripeUserId: never;
      membership: never;
      manageSubscriptionUrl: never;
    }
  | {
      checkoutUrl: never;
      stripeMode: "live" | "test" | "sandbox";
      stripeAccountId: string;
      stripeUserId: string;
      membership: Membership;
      manageSubscriptionUrl: string;
    };

const AppSettings = ({ userContext, environment }: ExtensionContextValue) => {
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const getMembershipStatus = async () => {
    const response = await makeApiRequest(
      "stripe/membership",
      {},
      userContext,
      environment
    );
    const body: MembershipResponse = await response.json();
    setMembership(body);
    console.log(body);
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
        <Button
          onPress={() => makeApiRequest("stripe", {}, userContext, environment)}
        >
          Send test request
        </Button>

        <Button onPress={getMembershipStatus}>Get membership info</Button>
        {membership?.checkoutUrl ? <Box>{membership.checkoutUrl + "?client_reference_id=" + userContext.account.id}</Box> : null}
        {membership?.membership ? (
          <Box>
            <Box>
              <Box>Status: {membership.membership.stripeSubscriptionStatus}</Box>
              <Box>Manage subscription: {membership.manageSubscriptionUrl}</Box>
              <Box>
                Customer ID: {membership.membership.stripeCustomerId}
              </Box>
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

export default AppSettings;
