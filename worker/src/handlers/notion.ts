import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { generateState } from "arctic";
import { createFactory } from "hono/factory";
import type { Env } from "@/types";

// Create a factory with your Env type
const factory = createFactory<Env>();

export const createAuthLink = factory.createHandlers(async (c) => {
  const state = generateState();
  const url = c.get("notionAuth").createAuthorizationURL(state);
  const accountId = c.req.query("account_id") || "";

  // Store state in a cookie or session
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  } as const;
  setCookie(c, "oauth_state", state, cookieOptions);
  setCookie(c, "account_id", accountId, cookieOptions);
  console.log(url.toString());

  return c.redirect(url.toString());
});

export const notionAuthCallback = factory.createHandlers(async (c) => {
 const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return c.text("Missing code or state parameter", 400);
  }

  // Verify state matches what you stored
  const storedState = getCookie(c, "oauth_state");
  if (state !== storedState) {
    return c.text("Invalid state", 400);
  }

  try {
    const tokens = await c.get("notionAuth").validateAuthorizationCode(code);

    console.log("Account ID:", getCookie(c, "account_id"));
    console.log("Tokens:", tokens);

    // OAuth2Tokens {
    //   data: {
    //     access_token: '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',
    //     token_type: 'bearer',
    //     refresh_token: null,
    //     bot_id: '3baebfa3-f9cc-4641-9bf3-0e4cbf4e3f6d',
    //     workspace_name: 'Dan Massey’s Workspace',
    //     workspace_icon: null,
    //     workspace_id: '1112c848-8ce8-8191-bee4-0003432f43ee',
    //     owner: { type: 'user', user: [Object] },
    //     duplicated_template_id: null,
    //     request_id: 'dcf1c0bf-399c-47aa-a234-6fd158551c57'
    //   }
    // }

    // Clear the state cookie
    deleteCookie(c, "oauth_state", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 0,
    });

    // Now you have tokens.accessToken to use with Notion API
    return c.json({
      success: true,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.text("Authentication failed", 400);
  }
});
