import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useApi } from "./apiProvider";
import type { ResponseForEndpoint } from "@worker/stripe-frontend-endpoints";

type AccountData = ResponseForEndpoint<"/stripe/membership">;

type DatabaseIds = {
  parentPageId: string | null;
  customerDatabaseId: string | null;
  invoiceDatabaseId: string | null;
  chargeDatabaseId: string | null;
};

interface AccountContextType {
  account: AccountData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setDatabaseIds: ({
    parentPageId,
    customerDatabaseId,
    invoiceDatabaseId,
    chargeDatabaseId,
  }: DatabaseIds) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

interface AccountProviderProps {
  children: ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({
  children,
}) => {
  const { getTyped } = useApi();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setDatabaseIds = ({
    parentPageId,
    customerDatabaseId,
    invoiceDatabaseId,
    chargeDatabaseId,
  }: DatabaseIds) => {
    if (account) {
      const oldMembershipInfo = account.membership;
      const newMembershipInfo = {
        ...oldMembershipInfo,
        parentPageId,
        customerDatabaseId,
        invoiceDatabaseId,
        chargeDatabaseId,
        errors: null
      } as typeof oldMembershipInfo;
      setAccount({
        ...account,
        membership: newMembershipInfo,
      });
    }
  };


  const fetchMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTyped("/stripe/membership");
      setAccount(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load membership"
      );
      console.error("Failed to fetch membership:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  return (
    <AccountContext.Provider
      value={{
        account,
        loading,
        error,
        setDatabaseIds,
        refetch: fetchMembership,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
};
