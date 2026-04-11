import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { healthRoutes } from "./routes/health";
import { exampleRoutes } from "./routes/example";
import { protectedRoutes } from "./routes/protected";
import { authMiddleware } from "./utils/auth-middleware";
import { getBackendEnv } from "./utils/env";

export const app = new Hono();

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: [getBackendEnv().FRONTEND_URL],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use("/api/*", authMiddleware);
app.route("/", healthRoutes);
app.route("/api/v1/example", exampleRoutes);
app.route("/api/v1/protected", protectedRoutes);
