import { Hono } from "hono";

const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString()
  });
});

export { healthRoutes };
