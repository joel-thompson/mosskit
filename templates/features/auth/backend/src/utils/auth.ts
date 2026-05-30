import { getAuth } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import { isClerkConfigured } from "./auth-middleware";
import { errorResponse } from "./response";

export function requireUserId(c: Context) {
  if (!isClerkConfigured()) {
    throw new HTTPException(503, {
      res: c.json(errorResponse("AUTH_NOT_CONFIGURED", "Clerk auth is not configured yet."), 503)
    });
  }

  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, {
      res: c.json(errorResponse("UNAUTHORIZED", "Unauthorized"), 401)
    });
  }

  return auth.userId;
}
