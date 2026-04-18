# MossKit

MossKit is an opinionated Bun-first starter generator for full-stack apps built with Vite + React, Hono, Drizzle, and a shared TypeScript package.

Created by Joel Thompson.

```bash
bunx @joelthompson/create-mosskit my-app
```

## Who It's For

MossKit is for solo builders and small teams who want a batteries-included full-stack monorepo without committing to a deployment platform up front.

It is a good fit if you want shared contracts, sensible defaults, and a starter you can actually shape into your own app instead of working around a hosted framework's assumptions.

## Why MossKit

MossKit is for teams that want a clean monorepo with the frontend, backend, and shared contracts wired up from the start.

- Shared TypeScript + Zod contracts between frontend and backend
- Bun workspaces and Bun-first local tooling
- Vite + React with TanStack Router and TanStack Query
- Hono backend with Drizzle and PostgreSQL
- Optional Clerk auth and shadcn/ui
- No deployment platform required, with optional Railway example assets included in generated apps

## What You Get

Always included:

- Bun workspaces monorepo
- `frontend`, `backend`, and `shared` packages
- Vitest, Oxlint, and Prettier
- Zod validation and shared types
- Docker Compose for local Postgres
- Seeded example tests in all workspaces

Optional features:

- `auth`: Clerk integration for frontend and backend
- `shadcn`: shadcn/ui setup with a small starter component set

## Quickstart

1. Create a new app:

```bash
bunx @joelthompson/create-mosskit my-app
```

2. Enter the project:

```bash
cd my-app
```

3. Start the local database:

```bash
bun run db:start
```

4. Run the app:

```bash
bun run dev
```

The frontend runs on `http://localhost:5173`.
The backend runs on `http://localhost:3000`.

## Manage an Existing App

Generated apps include a root `mosskit.json` manifest. MossKit uses that file for project info and feature management.

```bash
bunx @joelthompson/create-mosskit info
bunx @joelthompson/create-mosskit features
bunx @joelthompson/create-mosskit add auth
bunx @joelthompson/create-mosskit add shadcn
```

## Generated Project Shape

```text
my-app/
├── frontend/   # Vite + React app
├── backend/    # Hono + Drizzle API
├── shared/     # shared types, schemas, and utilities
└── mosskit.json
```

## Opinionated Defaults

MossKit chooses the local architecture and tooling for you:

- Bun as the runtime and workspace manager
- Vite + React on the frontend
- Hono on the backend
- Drizzle + PostgreSQL for the database layer
- shared contracts in a dedicated `shared` package

MossKit leaves these choices to you:

- deployment platform, even if you start from the optional Railway examples
- production hosting topology
- whether to include auth
- whether to include shadcn/ui

## Status

MossKit is early-stage, but the generator is already scaffoldable and verified against fresh generated apps with install, dev, typecheck, test, and build checks.

## For Maintainers

The generator package lives in [packages/create-mosskit](/Users/Joel/src/some-stack/packages/create-mosskit).

Generated app dependency versions are maintained from a single source:

- [packages/create-mosskit/src/dependency-versions.js](/Users/Joel/src/some-stack/packages/create-mosskit/src/dependency-versions.js)

Update workflow:

1. Change versions in `packages/create-mosskit/src/dependency-versions.js`
2. Sync template manifests:

```bash
node ./scripts/sync-template-package-versions.mjs
```

3. Refresh the packaged template copy:

```bash
node ./scripts/sync-templates.mjs
```

4. Run framework smoke tests:

```bash
node --test tests/*.test.mjs
```

5. Run full generated-app verification:

```bash
node ./scripts/verify-generated-apps.mjs
```

Verification layers:

- `node --test tests/*.test.mjs`: generator shape, overlays, manifests, and expected files
- `node ./scripts/verify-generated-apps.mjs`: fresh scaffold install, dev, typecheck, test, and build verification
