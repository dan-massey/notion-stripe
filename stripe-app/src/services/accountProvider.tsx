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

interface AccountContextType {
  account: AccountData | null;
  loading: boolean;
  error: string | null;
  setAccountDetails: (accountDetails: AccountData["account"]) => Promise<void>;
  refetch: () => Promise<void>;
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

  const setAccountDetails = async (accountDetails: AccountData["account"]) => {
    if (account) {
      setAccount({
        ...account,
        account: accountDetails
      });
    }
  };

  return (
    <AccountContext.Provider
      value={{
        account,
        loading,
        error,
        setAccountDetails,
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
