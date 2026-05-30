import type { PropsWithChildren } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getFrontendEnv } from "@/utils/env";

const queryClient = new QueryClient();
const clerkPlaceholderPublishableKey = "pk_test_replace_me";

export function isClerkPublishableKeyConfigured() {
  const publishableKey = getFrontendEnv().VITE_CLERK_PUBLISHABLE_KEY;

  return Boolean(publishableKey && publishableKey !== clerkPlaceholderPublishableKey);
}

export function AppProviders({ children }: PropsWithChildren) {
  if (import.meta.env.MODE === "test") {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const publishableKey = getFrontendEnv().VITE_CLERK_PUBLISHABLE_KEY ?? "";
  if (!isClerkPublishableKeyConfigured()) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ClerkProvider>
  );
}
