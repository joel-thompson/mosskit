import { featureRegistry } from "./features.js";

function hasFeature(features, featureId) {
  return features.includes(featureId);
}

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

This app includes \`mosskit.json\`, which is used by MossKit app-management commands.

From the app root you can run:

\`\`\`bash
bunx @joelthompson/create-mosskit info
bunx @joelthompson/create-mosskit features
bunx @joelthompson/create-mosskit add auth
bunx @joelthompson/create-mosskit add shadcn
\`\`\`

## Example Tests

- Frontend example tests live in \`frontend/src/**/*.test.ts?(x)\`
- Backend example tests live in \`backend/src/**/*.test.ts\`
- Shared example tests live in \`shared/src/**/*.test.ts\`

## Deployment Examples

- Railway deployment examples live in \`deploy/railway/\`
- Start with \`deploy/railway/README.md\` for the split frontend/backend Railway setup

## Notes

- Deployment platform choice is still up to you. Railway examples are included as optional reference material.
- The starter proves the stack with a minimal typed frontend/backend flow and seeded example tests.
`;
}

export function buildRailwayDeploymentReadme({ appName, features }) {
  const authEnabled = hasFeature(features, "auth");

  const backendEnvLines = [
    "- `PORT`: runtime port for the backend service. Railway injects this automatically.",
    "- `DATABASE_URL`: runtime connection string from the attached Railway Postgres service.",
    "- `FRONTEND_URL`: runtime public URL for the frontend service, used by backend CORS."
  ];

  if (authEnabled) {
    backendEnvLines.push(
      "- `CLERK_SECRET_KEY`: runtime Clerk secret for the backend service.",
      "- `CLERK_PUBLISHABLE_KEY`: runtime Clerk publishable key exposed to backend auth middleware."
    );
  }

  const frontendEnvLines = [
    "- `VITE_API_URL`: build-time public URL for the backend service, for example `https://your-backend.railway.app`."
  ];

  if (authEnabled) {
    frontendEnvLines.push(
      "- `VITE_CLERK_PUBLISHABLE_KEY`: build-time Clerk publishable key for the frontend."
    );
  }

  const authNotes = authEnabled
    ? "\n## Auth Notes\n\n- Keep the Clerk frontend and backend keys in sync across both Railway services.\n- If the frontend or backend Railway URL changes, update the matching Clerk allowed origins and redirect URLs.\n"
    : "";

  return `# Railway Deployment for ${appName}

This directory contains optional Railway deployment examples for the generated MossKit app.

The example assumes a split Railway topology:

- one Railway service for the backend API
- one Railway service for the frontend static site
- one Railway Postgres service attached to the backend

The Dockerfiles use the repository root as the build context. In Railway, keep the service root at the app root and point each service at the matching Dockerfile in \`deploy/railway/\`.

## Files

- \`deploy/railway/backend.Dockerfile\`: builds and runs the Bun backend service
- \`deploy/railway/frontend.Dockerfile\`: builds the Vite frontend and serves it with nginx
- \`deploy/railway/frontend.nginx.conf\`: nginx SPA fallback and static asset cache config

## Backend Service

Use \`deploy/railway/backend.Dockerfile\` for the backend service.

Runtime variables:

${backendEnvLines.join("\n")}

Notes:

- Attach a Railway Postgres service and map its connection string to \`DATABASE_URL\`.
- Set \`FRONTEND_URL\` to the public URL of the frontend Railway service so browser requests pass CORS checks.
- The backend image runs \`bun run start\`, which serves the bundled backend build from \`backend/dist\`.

## Frontend Service

Use \`deploy/railway/frontend.Dockerfile\` for the frontend service.

Build-time variables:

${frontendEnvLines.join("\n")}

Notes:

- These frontend variables are consumed during the Docker build, not at nginx runtime.
- After changing any frontend variable, trigger a new frontend deploy so Vite rebuilds the static assets.
- The generated nginx config serves \`index.html\` for non-file routes, so TanStack Router deep links continue to work.

## Suggested Railway Setup Order

1. Create the Railway Postgres service.
2. Create the backend service using \`deploy/railway/backend.Dockerfile\`.
3. Configure backend runtime variables, especially \`DATABASE_URL\` and \`FRONTEND_URL\`.
4. Create the frontend service using \`deploy/railway/frontend.Dockerfile\`.
5. Configure frontend build-time variables, especially \`VITE_API_URL\`.
6. Redeploy the frontend after any build-time variable changes.
${authNotes}
## Local Notes

- Local development still uses \`bun run dev\` and the backend Docker Compose database.
- These Railway files are examples only; they do not change MossKit's CLI, manifest, or local workflow.
`;
}
