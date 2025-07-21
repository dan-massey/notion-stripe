import React, { ReactNode } from "react";
import {
  Box,
  Banner,
  Button,
  Link,
  Spinner,
} from "@stripe/ui-extension-sdk/ui";
import { useMembership } from "@/services/membershipProvider";

interface SubscriptionBannerProps {
  children: ReactNode;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ 
  children 
}) => {
  const { membership, loading, error, refetch } = useMembership();

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
  
  if (!membership?.membership?.stripeSubscriptionStatus) {
    return (
      <Box>
        <Banner
          type="caution"
          title="Get Started For Free"
          actions={
            <Box css={{ gap: "small" }}>
              <Link href={membership?.checkoutUrl} external={true} target="_blank">
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

  if (!membership) {
    return (
      <Box>
        <Button onPress={refetch}>Refresh</Button>
      </Box>
    );
  }

  return <>{children}</>;
};