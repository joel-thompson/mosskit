import { useQuery } from "@tanstack/react-query";
import { AuthCta } from "./auth-cta";
import { StarterCard } from "./starter-card";
import { fetchExampleStatus } from "@/utils/api";

export function HomePage() {
  const statusQuery = useQuery({
    queryKey: ["example-status"],
    queryFn: fetchExampleStatus
  });

  return (
    <main className="page-shell">
      <div className="hero">
        <p className="eyebrow">__STACK_DISPLAY_NAME__</p>
        <h1>Minimal full-stack starter</h1>
        <p className="hero-copy">
          Shared TypeScript contracts, Bun workspaces, Hono, Vite, React, Drizzle, and seeded
          example tests.
        </p>
        <AuthCta />
      </div>

      <StarterCard
        status={statusQuery.data}
        isLoading={statusQuery.isLoading}
        error={statusQuery.error instanceof Error ? statusQuery.error.message : null}
      />
    </main>
  );
}
