import { z } from "zod";

const frontendEnvSchema = z.object({
  VITE_API_URL: z.string().default("http://localhost:3000"),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().optional()
});

export function getFrontendEnv() {
  return frontendEnvSchema.parse(import.meta.env);
}
