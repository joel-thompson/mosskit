import { Hono } from "hono";
import { successResponse } from "../utils/response";
import { getBackendEnv } from "../utils/env";
import { getDatabaseHealth } from "../db";

const exampleRoutes = new Hono();

exampleRoutes.get("/status", async (c) => {
  const database = await getDatabaseHealth(getBackendEnv().DATABASE_URL);

  return c.json(
    successResponse({
      message: "Backend reachable",
      database
    })
  );
});

export { exampleRoutes };
