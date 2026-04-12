import { fetchExampleStatus } from "./api";

test("fetchExampleStatus returns parsed data", async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: async () => ({
      success: true,
      data: {
        message: "Backend reachable",
        database: {
          configured: true,
          connected: true
        }
      }
    })
  }) as typeof fetch;

  await expect(fetchExampleStatus()).resolves.toEqual({
    message: "Backend reachable",
    database: {
      configured: true,
      connected: true
    }
  });
});
