import { useNotionSignIn } from "@/services/notionSignInProvider";
import { Button, Box, Icon, Spinner } from "@stripe/ui-extension-sdk/ui";
import { useAccount } from "@/services/accountProvider";
import { useApi } from "@/services/apiProvider";
import { useEffect, useState } from "react";

export const Backfill = () => {
  const { isLoading, isSignedIn, signInUrl, signOut, checkAuthStatus } =
    useNotionSignIn();
  const { account, loading, error, refetch } = useAccount();
  const { postTyped, getTyped } = useApi();
  type StatusResp = Awaited<
    ReturnType<typeof getTyped<"/stripe/backfill/status">>
  >;
  const [backfillStatus, setBackfillStatus] = useState<StatusResp | null>();
  const [backfillLoading, setLoading] = useState<boolean>(false);

  const refreshBackfillStatus = async () => {
    setLoading(true);
    const resp = await getTyped("/stripe/backfill/status");
    console.log(resp);
    setBackfillStatus(resp);
    setLoading(false);
  };

  const startBackfill = async () => {
    setLoading(true);
    setBackfillStatus(null);
    const resp = await postTyped("/stripe/backfill");
    setBackfillStatus(resp);
    setLoading(false);
  };

  useEffect(() => {
    refreshBackfillStatus();
  }, []);

  useEffect(() => {
    if (backfillStatus?.status?.status === "started") {
      const interval = setInterval(() => {
        refreshBackfillStatus();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [backfillStatus?.status?.status]);
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
      <Box css={{ font: "subheading" }}>Step 4</Box>
      <Box
        css={{
          stack: "y",
          distribute: "space-between",
          alignY: "top",
          gapY: "medium",
        }}
      >
        <Box css={{ stack: "y", gapY: "small", alignY: "center" }}>
          <Box css={{ font: "heading" }}>Sync historical data</Box>
        </Box>
        <Box>
          Syncing historical data is slow and could take a long time to complete, depending on how many
          entities are in your account. You can leave this page once the sync
          has started.
        </Box>
        {backfillStatus && backfillStatus?.status?.status === "started" && (
          <>
            <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
              <Spinner size="small" /> Sync started at{" "}
              {new Date(backfillStatus.status.startedAt).toLocaleString()}.
            </Box>
            <Box>
              {backfillStatus.status.recordsProcessed === 0 ? 'Getting started' : `${backfillStatus.status.recordsProcessed} rows synced so far.`} 
            </Box>
          </>
        )}
        {backfillStatus && backfillStatus?.status?.status === "complete" && (
          <>
            <Box css={{ stack: "x", gapX: "small", alignY: "center" }}>
              <Icon name="checkCircle" css={{ fill: "success" }} /> Sync completed at{" "}
              {new Date(backfillStatus.status.finishedAt ?? 0).toLocaleString()}
              .
            </Box>
            <Box>
              {backfillStatus.status.recordsProcessed} rows synced in total.
            </Box>
          </>
        )}
        <Box>
          <Button
            type="primary"
            css={{ width: "fill" }}
            onPress={startBackfill}
            disabled={
              loading ||
              backfillLoading ||
              backfillStatus?.status?.status === "started"
            }
          >
            Sync historical data
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
