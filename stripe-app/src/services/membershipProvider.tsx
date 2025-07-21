import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useApi } from "./apiProvider";
import type { ResponseForEndpoint } from "@worker/stripe-frontend-endpoints";

type MembershipData = ResponseForEndpoint<"/stripe/membership">;

interface MembershipContextType {
  membership: MembershipData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

interface MembershipProviderProps {
  children: ReactNode;
}

export const MembershipProvider: React.FC<MembershipProviderProps> = ({ children }) => {
  const { getTyped } = useApi();
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTyped("/stripe/membership");
      setMembership(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load membership");
      console.error("Failed to fetch membership:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  return (
    <MembershipContext.Provider 
      value={{ 
        membership, 
        loading, 
        error, 
        refetch: fetchMembership 
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = (): MembershipContextType => {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error("useMembership must be used within a MembershipProvider");
  }
  return context;
};