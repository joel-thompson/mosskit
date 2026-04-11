import { mergeConfig, defineConfig } from "vitest/config";
import { resolve } from "node:path";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
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
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
    }
  })
);
