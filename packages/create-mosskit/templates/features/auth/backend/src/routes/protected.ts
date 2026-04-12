import { Hono } from "hono";
import { successResponse } from "../utils/response";
import { requireUserId } from "../utils/auth";

const protectedRoutes = new Hono();

protectedRoutes.get("/me", (c) => {
  return c.json(
    successResponse({
      userId: requireUserId(c)
    })
  );
});

export { protectedRoutes };
