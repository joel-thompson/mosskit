# Somestack

`Somestack` is a Bun-first full-stack starter generator built around:

- Bun workspaces
- Vite + React
- Hono
- Drizzle + Postgres
- shared TypeScript contracts

The generator package lives in [packages/create-somestack](/Users/Joel/src/some-stack/packages/create-somestack).

## Workspace Layout

- `packages/create-somestack`: the published `create-somestack` CLI
- `templates/base`: the base generated application
- `templates/features/auth`: Clerk auth overlay
- `templates/features/shadcn`: shadcn/ui overlay
- `tests`: framework smoke tests for the CLI

## Local Development

Run the framework smoke tests:

```bash
node --test tests/*.test.mjs
```

Copy root templates into the publishable package before packing or publishing:

```bash
node ./scripts/sync-templates.mjs
```

Run full generated-app verification:

```bash
node ./scripts/verify-generated-apps.mjs
```

## Dependency Versions

Generated app dependency versions are maintained from a single source:

- [packages/create-somestack/src/dependency-versions.js](/Users/Joel/src/some-stack/packages/create-somestack/src/dependency-versions.js)

That file is the source of truth for the generated monorepo's root, frontend, backend, shared, and optional feature dependencies.

### Update Workflow

1. Change versions in `packages/create-somestack/src/dependency-versions.js`
2. Sync the base template manifests:

```bash
node ./scripts/sync-template-package-versions.mjs
```

3. Refresh the packaged template copy if needed:

```bash
node ./scripts/sync-templates.mjs
```

4. Run the framework smoke tests:

```bash
node --test tests/*.test.mjs
```

5. Run real generated-app verification:

```bash
node ./scripts/verify-generated-apps.mjs
```

The scaffold also reapplies the centralized version map when generating a new app, so generated projects stay aligned with the central version source even if a template `package.json` was not edited by hand.

## Verification Layers

- `node --test tests/*.test.mjs`: verifies the generator shape, overlays, manifests, and expected files
- `node ./scripts/verify-generated-apps.mjs`: scaffolds fresh temporary apps and runs `bun install`, `bun run typecheck`, `bun run test`, and `bun run build`

For package upgrades, use both. The smoke tests catch generator regressions, while the generated-app verifier proves the updated dependencies still work in real scaffolded projects.
