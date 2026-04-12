# Somestack

Somestack is a Bun-first starter generator for a full-stack monorepo built around Vite + React on the frontend, Hono on the backend, and a shared TypeScript package for contracts, validation, and reusable code.

## Structure

- `packages/create-somestack`: the CLI that scaffolds new apps
- `templates/base`: the default generated app
- `templates/features/auth`: Clerk auth overlay applied by the CLI
- `templates/features/shadcn`: shadcn/ui overlay applied by the CLI
- `tests`: smoke tests for the generator
- generated apps include a root `somestack.json` manifest used by `info`, `features`, and `add`

## Generated App Shape

Generated projects use:

- `frontend`: Vite, React, TanStack Router, TanStack Query, Tailwind
- `backend`: Hono, Drizzle, PostgreSQL, Docker Compose
- `shared`: shared types, Zod schemas, constants, and utilities
