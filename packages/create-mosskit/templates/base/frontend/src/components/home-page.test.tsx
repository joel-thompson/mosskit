import { render, screen, waitFor } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { HomePage } from "./home-page";

test("renders the starter shell and backend status", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        message: "Backend reachable",
        database: {
          configured: true,
          connected: false
        }
      }
    })
  }) as typeof fetch;

  render(
    <AppProviders>
      <HomePage />
    </AppProviders>
  );

  expect(screen.getByText("Minimal full-stack starter")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText("Backend reachable")).toBeInTheDocument();
  });
});
