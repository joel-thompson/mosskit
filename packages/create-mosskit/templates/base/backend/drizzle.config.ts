import { defineConfig } from "drizzle-kit";
import { getBackendEnv } from "./src/utils/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getBackendEnv().DATABASE_URL
  }
});
