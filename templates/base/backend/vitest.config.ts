import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      shared: resolve(__dirname, "../shared/src/index.ts"),
      "shared/constants": resolve(__dirname, "../shared/src/constants/index.ts"),
      "shared/types": resolve(__dirname, "../shared/src/types/index.ts"),
      "shared/utils": resolve(__dirname, "../shared/src/utils/index.ts"),
      "shared/validation": resolve(__dirname, "../shared/src/validation/index.ts")
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"]
  }
});
