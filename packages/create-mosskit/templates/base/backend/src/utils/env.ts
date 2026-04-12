import { z } from "zod";

const backendEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5444/postgres"),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional()
});

export function getBackendEnv(input: Record<string, string | undefined> = process.env) {
  return backendEnvSchema.parse(input);
}
