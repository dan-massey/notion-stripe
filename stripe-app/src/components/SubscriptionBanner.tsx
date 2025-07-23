import React, { ReactNode } from "react";
import {
  Box,
  Banner,
  Button,
  Link,
  Spinner,
} from "@stripe/ui-extension-sdk/ui";
import { useAccount } from "@/services/accountProvider";

interface SubscriptionBannerProps {
  children: ReactNode;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ 
  children 
}) => {
  const { account, loading, error, refetch } = useAccount();

  if (loading) {
    return (
      <Box>
        <Spinner size="large" />
      </Box>
    );
  }
  
  if (error) {
    return <Box>Error: {error}</Box>;
  }
  
  if (!account?.membership?.stripeSubscriptionStatus) {
    return (
      <Box>
        <Banner
          type="caution"
          title="Get Started For Free"
          actions={
            <Box css={{ gap: "small" }}>
              <Link href={account?.checkoutUrl} external={true} target="_blank">
                Start your free trial
              </Link>
              <Button onPress={refetch}>Refresh</Button>
            </Box>
          }
        />
        {children}
      </Box>
    );
  }

  if (!account) {
    return (
      <Box>
        <Button onPress={refetch}>Refresh</Button>
      </Box>
    );
  }

  return <>{children}</>;
};