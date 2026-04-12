import { Hono } from "hono";
import { errorResponse } from "../utils/response";

const protectedRoutes = new Hono();

protectedRoutes.get("/me", (c) => {
  return c.json(errorResponse("FEATURE_DISABLED", "Authentication is not enabled for this app"), 501);
});

export { protectedRoutes };
