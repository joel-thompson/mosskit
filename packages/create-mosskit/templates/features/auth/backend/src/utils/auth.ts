import { getAuth } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import { errorResponse } from "./response";

export function requireUserId(c: Context) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    throw new HTTPException(401, {
      res: c.json(errorResponse("UNAUTHORIZED", "Unauthorized"), 401)
    });
  }

  return auth.userId;
}
