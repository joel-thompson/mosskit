import { featureRegistry } from "./features.js";

export function buildProjectReadme({ appName, features, stackDisplayName }) {
  const selectedFeatures = [
    "Bun workspaces",
    "Vite + React",
    "Hono",
    "Drizzle + PostgreSQL",
    "shared TypeScript + Zod"
  ];

  for (const featureId of features) {
    const feature = featureRegistry[featureId];
    if (feature) {
      selectedFeatures.push(feature.readmeLabel);
    }
  }

  const envSteps = [
    "Copy `frontend/.env.example` to `frontend/.env`.",
    "Copy `backend/.env.example` to `backend/.env`."
  ];

  for (const featureId of features) {
    const feature = featureRegistry[featureId];
    if (feature) {
      envSteps.push(...feature.setupNotes);
    }
  }

  return `# ${appName}

This project was generated with ${stackDisplayName}.

## Included

${selectedFeatures.map((feature) => `- ${feature}`).join("\n")}

## Local Development

\`\`\`bash
bun install
bun run db:start
bun run dev
\`\`\`

The frontend runs on \`http://localhost:5173\`.
The backend runs on \`http://localhost:3000\`.

## Environment Setup

${envSteps.map((step) => `- ${step}`).join("\n")}

## Useful Commands

\`\`\`bash
bun run dev
bun run build
bun run test
bun run lint
bun run typecheck
bun run db:start
bun run db:migrate
\`\`\`

## App Management

This app includes \`somestack.json\`, which is used by Somestack app-management commands.

From the app root you can run:

\`\`\`bash
bun create somestack@latest info
bun create somestack@latest features
bun create somestack@latest add auth
bun create somestack@latest add shadcn
\`\`\`

## Example Tests

- Frontend example tests live in \`frontend/src/**/*.test.ts?(x)\`
- Backend example tests live in \`backend/src/**/*.test.ts\`
- Shared example tests live in \`shared/src/**/*.test.ts\`

## Notes

- Deployment is intentionally left up to you.
- The starter proves the stack with a minimal typed frontend/backend flow and seeded example tests.
`;
}
