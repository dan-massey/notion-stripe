import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AppContext, StripeMode } from "@/types";
import { makeStripeClient } from "@/utils/stripe";
import type { NotionSecretName } from "@/stripe-frontend-endpoints";
import { generateState } from "arctic";

export const redirectToNotionAuth = async (c: AppContext) => {
  const state = generateState();
  const url = c.get("notionAuth").createAuthorizationURL(state);
  const accountId = c.req.query("account_id") as string;
  const stripeMode = c.req.query("mode") as StripeMode;

  if (!accountId || !stripeMode) {
    return c.text("Missing account_id or mode parameter", 400);
  }

  // Store state in a cookie or session
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  } as const;
  setCookie(c, "oauth_state", state, cookieOptions);
  setCookie(c, "account_id", accountId, cookieOptions);
  setCookie(c, "mode", stripeMode, cookieOptions);

  return c.redirect(url.toString());
}


export const notionAuthCallback = async (c: AppContext) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return c.text("Sign in cancelled. Close window to return to Stripe.", 400);
  }

  // Verify state matches what you stored
  const storedState = getCookie(c, "oauth_state");
  console.log("Stored state:", storedState);
  console.log("Received state:", state);
  if (state !== storedState) {
    return c.text("Invalid state", 400);
  }

  try {
    const tokens = await c.get("notionAuth").validateAuthorizationCode(code);

    console.log("Account ID:", getCookie(c, "account_id"));
    console.log("Mode:", getCookie(c, "mode"));

    const stripe = makeStripeClient(
      c,
      (getCookie(c, "mode") || "test") as StripeMode
    );
    const secretName: NotionSecretName = "NOTION_AUTH_TOKEN";
    const accessToken = tokens.accessToken();

    await stripe.apps.secrets.create(
      {
        name: secretName,
        payload: accessToken,
        scope: {
          type: "account",
        },
      },
      {
        stripeAccount: getCookie(c, "account_id"),
      }
    );

    // Clear the state cookie
    deleteCookie(c, "oauth_state", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 0,
    });

    deleteCookie(c, "account_id", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 0,
    });

    deleteCookie(c, "mode", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 0,
    });

    // Now you have tokens.accessToken to use with Notion API
    return c.redirect('/');
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.text("Authentication failed", 400);
  }
};
