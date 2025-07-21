import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { ApiProvider } from "@/services/apiProvider";
import { MembershipProvider } from "@/services/membershipProvider";
import { NotionSignInProvider } from "@/services/notionSignInProvider";
import { NotionSignIn } from "@/components/NotionSignIn";
import { NotionPages } from "@/components/NotionPages";

const AppSettings = ({ userContext, environment }: ExtensionContextValue) => {
  return (
    <ApiProvider
      userContext={userContext}
      environment={environment}
      apiUrl="https://willing-grub-included.ngrok-free.app"
    >
      <MembershipProvider>
        <NotionSignInProvider>
          <NotionSignIn />
          <NotionPages />
        </NotionSignInProvider>
      </MembershipProvider>
    </ApiProvider>
  );
};

export default AppSettings;
