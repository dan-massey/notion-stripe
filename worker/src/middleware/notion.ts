import { createMiddleware } from "hono/factory";
import { Notion } from "arctic";
import type { Env } from "@/types";

export const notionMiddleware = createMiddleware<Env>(async (c, next) => {
  const {
    NOTION_OAUTH_CLIENT_ID,
    NOTION_OAUTH_CLIENT_SECRET,
    NOTION_AUTH_URL,
  } = c.env;
  const notion = new Notion(
    NOTION_OAUTH_CLIENT_ID!,
    NOTION_OAUTH_CLIENT_SECRET!,
    NOTION_AUTH_URL || " https://willing-grub-included.ngrok-free.app/auth/callback"
  );
  c.set("notionAuth", notion);
  await next();
});
