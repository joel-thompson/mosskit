import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true
    }),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      shared: path.resolve(__dirname, "../shared/src/index.ts"),
      "shared/constants": path.resolve(__dirname, "../shared/src/constants/index.ts"),
      "shared/types": path.resolve(__dirname, "../shared/src/types/index.ts"),
      "shared/utils": path.resolve(__dirname, "../shared/src/utils/index.ts"),
      "shared/validation": path.resolve(__dirname, "../shared/src/validation/index.ts")
    }
  }
});
