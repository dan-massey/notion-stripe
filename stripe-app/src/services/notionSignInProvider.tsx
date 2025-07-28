import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useApi } from "./apiProvider";
import { useAccount } from "./accountProvider";
import { stripe } from "@/services/stripeClient";
import type { NotionSecretName } from "@worker/stripe-frontend-endpoints";
const notionSecretName: NotionSecretName = "NOTION_AUTH_TOKEN";

interface NotionSignInContextType {
  // Authentication state
  isSignedIn: boolean;
  isLoading: boolean;
  authError: string | null;
  signInUrl: string | null;
  signOut: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const NotionSignInContext = createContext<NotionSignInContextType | undefined>(
  undefined
);

interface NotionSignInProviderProps {
  children: ReactNode;
}

export const NotionSignInProvider: React.FC<NotionSignInProviderProps> = ({
  children,
}) => {
  const { getTyped, postTyped } = useApi();
  const { setAccountDetails } = useAccount();

  // Authentication state
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signInUrl, setSignInUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const signInLinkPromise = getTyped("/stripe/notion-auth/link");
      const validatePromise = getTyped("/stripe/notion-auth/validate");
      const [signInLink, authSecretValid] = await Promise.all([signInLinkPromise, validatePromise]);

      setIsSignedIn(authSecretValid.authed);
      setSignInUrl(signInLink.url);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Failed to check auth status"
      );
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out of Notion
  const signOut = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const resp = await postTyped("/stripe/notion-auth/delete");
      setIsSignedIn(false);
      // Clear database IDs when signing out
      setAccountDetails(resp);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <NotionSignInContext.Provider
      value={{
        isSignedIn,
        isLoading,
        authError,
        signInUrl,
        signOut,
        checkAuthStatus,
      }}
    >
      {children}
    </NotionSignInContext.Provider>
  );
};

export const useNotionSignIn = (): NotionSignInContextType => {
  const context = useContext(NotionSignInContext);
  if (context === undefined) {
    throw new Error(
      "useNotionSignIn must be used within a NotionSignInProvider"
    );
  }
  return context;
};
