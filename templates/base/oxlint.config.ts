export default {
  ignorePatterns: [
    "node_modules",
    "dist",
    "coverage",
    "frontend/src/routeTree.gen.ts",
    "backend/drizzle"
  ],
  overrides: [
    {
      files: ["frontend/**/*.{ts,tsx}"],
      env: {
        browser: true
      }
    },
    {
      files: ["backend/**/*.{ts,tsx}", "shared/**/*.{ts,tsx}"],
      env: {
        node: true
      }
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      plugins: ["vitest"],
      env: {
        node: true
      }
    }
  ]
};
