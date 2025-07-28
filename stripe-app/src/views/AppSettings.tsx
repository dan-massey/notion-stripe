import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { ApiProvider } from "@/services/apiProvider";
import { AccountProvider } from "@/services/accountProvider";
import { NotionSignInProvider } from "@/services/notionSignInProvider";
import { NotionSignIn } from "@/components/NotionSignIn";
import { NotionPageSelector } from "@/components/NotionPageSelector";
import { NotionDatabasesLinked } from "@/components/NotionDatabasesLinked";
import { Box } from "@stripe/ui-extension-sdk/ui";
import { useNotionSignIn } from "@/services/notionSignInProvider";
import { useAccount } from "@/services/accountProvider";
import { Placeholder } from "@/components/Placeholder";
import { Subscribe } from "@/components/Subscribe";
import { ManageSubscription } from "@/components/ManageSubscription";
import { Backfill } from "@/components/Backfill";

const AppSettingsContent = () => {
  const { isSignedIn } = useNotionSignIn();
  const { account } = useAccount();

  const getStepTwo = () => {
    if (account?.account?.notionConnection?.parentPageId) {
      return <NotionDatabasesLinked />;
    }

    return <NotionPageSelector />;
  };

  const getStepThree = () => {
    if (account?.account?.subscription?.stripeSubscriptionId) {
      return <ManageSubscription />;
    } else {
      return <Subscribe />;
    }
  };

  return (
    <Box css={{ stack: "y", width: "fill", gap: "medium" }}>
      <Box css={{ width: "fill" }}>
        <NotionSignIn />
      </Box>
      <Box css={{ width: "fill" }}>
        {isSignedIn ? (
          getStepTwo()
        ) : (
          <Placeholder step="Step 2" title="Create Databases" />
        )}
      </Box>
      <Box css={{ width: "fill" }}>
        {account?.account?.notionConnection?.parentPageId ||
        account?.account?.subscription?.stripeSubscriptionId ? (
          getStepThree()
        ) : (
          <Placeholder
            step="Step 3"
            title="Set up Billing (14 day free trial)"
          />
        )}
      </Box>
      <Box css={{ width: "fill" }}>
        {account?.account?.notionConnection?.parentPageId &&
        account?.account.subscription?.stripeSubscriptionId &&
        ["active", "trialing", "past_due"].includes(
          account?.account.subscription?.stripeSubscriptionStatus ?? ""
        ) ? (
          <Backfill />
        ) : (
          <Placeholder step="Step 4" title="Sync historical data" />
        )}
      </Box>
    </Box>
  );
};

const AppSettings = ({ userContext, environment }: ExtensionContextValue) => {
  return (
    <ApiProvider
      userContext={userContext}
      environment={environment}
      apiUrl="https://notion.sync-to-db.com"
    >
      <AccountProvider>
        <NotionSignInProvider>
          <AppSettingsContent />
        </NotionSignInProvider>
      </AccountProvider>
    </ApiProvider>
  );
};

export default AppSettings;
