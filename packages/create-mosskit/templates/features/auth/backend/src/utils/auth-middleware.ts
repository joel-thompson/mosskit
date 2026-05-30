import { clerkMiddleware } from "@hono/clerk-auth";
import type { MiddlewareHandler } from "hono";
import { getBackendEnv } from "./env";

const clerkPlaceholderValues = new Set(["pk_test_replace_me", "sk_test_replace_me"]);
const clerkAuthMiddleware = clerkMiddleware();

function isConfiguredClerkEnvValue(value: string | undefined) {
  return Boolean(value && !clerkPlaceholderValues.has(value));
}

export function isClerkConfigured() {
  const env = getBackendEnv();

  return (
    isConfiguredClerkEnvValue(env.CLERK_PUBLISHABLE_KEY) &&
    isConfiguredClerkEnvValue(env.CLERK_SECRET_KEY)
  );
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  if (!isClerkConfigured()) {
    await next();
    return;
  }

  await clerkAuthMiddleware(c, next);
};
