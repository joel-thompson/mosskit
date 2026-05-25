import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "packages/create-mosskit/src/index.js");

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, "utf8"));
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function runCli(args, cwd = repoRoot) {
  const captureDir = await mkdtemp(path.join(os.tmpdir(), "mosskit-cli-"));
  const stdoutPath = path.join(captureDir, "stdout");
  const stderrPath = path.join(captureDir, "stderr");
  const command = [
    "cd",
    shellQuote(cwd),
    "&&",
    shellQuote(process.execPath),
    shellQuote(cliPath),
    ...args.map(shellQuote),
    ">",
    shellQuote(stdoutPath),
    "2>",
    shellQuote(stderrPath)
  ].join(" ");

  try {
    await execFileAsync("zsh", ["-lc", command]);
    return {
      stdout: await readFile(stdoutPath, "utf8"),
      stderr: await readFile(stderrPath, "utf8")
    };
  } catch (error) {
    error.stdout = await readFile(stdoutPath, "utf8").catch(() => "");
    error.stderr = await readFile(stderrPath, "utf8").catch(() => "");
    throw error;
  } finally {
    await rm(captureDir, { force: true, recursive: true });
  }
}

async function assertCliRejects(args, pattern, cwd = repoRoot) {
  try {
    await runCli(args, cwd);
  } catch (error) {
    if (pattern) {
      assert.match(`${error.message}\n${error.stderr ?? ""}`, pattern);
    }
    return;
  }

  assert.fail(`Expected command to fail: ${args.join(" ")}`);
}

async function scaffoldApp(name, flags = []) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mosskit-test-"));
  const targetDir = path.join(tempDir, name);

  await runCli([targetDir, "--yes", "--no-install", "--no-git", ...flags]);

  return {
    targetDir,
    cleanup: async () => rm(tempDir, { force: true, recursive: true })
  };
}

test("scaffolds the base preset with a manifest", async () => {
  const app = await scaffoldApp("base-app");

  try {
    assert.equal(await exists(path.join(app.targetDir, "frontend/src/components/home-page.test.tsx")), true);
    assert.equal(await exists(path.join(app.targetDir, "backend/src/routes/health.test.ts")), true);
    assert.equal(await exists(path.join(app.targetDir, "shared/src/validation/exampleStatus.test.ts")), true);
    assert.equal(await exists(path.join(app.targetDir, "AGENTS.md")), true);
    assert.equal(await exists(path.join(app.targetDir, "mosskit.json")), true);
    assert.equal(await exists(path.join(app.targetDir, ".dockerignore")), true);
    assert.equal(await exists(path.join(app.targetDir, "deploy/railway/backend.Dockerfile")), true);
    assert.equal(await exists(path.join(app.targetDir, "deploy/railway/frontend.Dockerfile")), true);
    assert.equal(await exists(path.join(app.targetDir, "deploy/railway/frontend.nginx.conf")), true);
    assert.equal(await exists(path.join(app.targetDir, "deploy/railway/README.md")), true);

    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    const rootPackage = await readJson(path.join(app.targetDir, "package.json"));
    const frontendPackage = await readJson(path.join(app.targetDir, "frontend/package.json"));
    const backendPackage = await readJson(path.join(app.targetDir, "backend/package.json"));
    const readme = await readFile(path.join(app.targetDir, "README.md"), "utf8");
    const frontendViteConfig = await readFile(path.join(app.targetDir, "frontend/vite.config.ts"), "utf8");
    const frontendEnv = await readFile(path.join(app.targetDir, "frontend/.env.example"), "utf8");
    const frontendLocalEnv = await readFile(path.join(app.targetDir, "frontend/.env"), "utf8");
    const backendEnv = await readFile(path.join(app.targetDir, "backend/.env.example"), "utf8");
    const backendLocalEnv = await readFile(path.join(app.targetDir, "backend/.env"), "utf8");
    const railwayBackendDockerfile = await readFile(
      path.join(app.targetDir, "deploy/railway/backend.Dockerfile"),
      "utf8"
    );
    const railwayFrontendDockerfile = await readFile(
      path.join(app.targetDir, "deploy/railway/frontend.Dockerfile"),
      "utf8"
    );

    assert.equal(rootPackage.name, "base-app");
    assert.deepEqual(manifest.features, []);
    assert.equal(manifest.framework.name, "mosskit");
    assert.deepEqual(manifest.network, { tailscale: false });
    assert.deepEqual(manifest.ports, { frontend: 5173, backend: 3000 });
    assert.deepEqual(manifest.database, { provider: "postgres" });
    assert.equal(frontendPackage.dependencies["@clerk/clerk-react"], undefined);
    assert.equal(backendPackage.dependencies.postgres, "^3.4.7");
    assert.equal(backendPackage.scripts.start, "bun ./dist/index.js");
    assert.match(frontendViteConfig, /port: 5173/);
    assert.doesNotMatch(frontendViteConfig, /allowedHosts/);
    assert.equal(frontendEnv, "VITE_API_URL=http://localhost:3000\n");
    assert.equal(frontendLocalEnv, frontendEnv);
    assert.equal(
      backendEnv,
      "PORT=3000\nFRONTEND_URL=http://localhost:5173\nDATABASE_URL=postgres://postgres:postgres@localhost:5444/postgres\n"
    );
    assert.equal(backendLocalEnv, backendEnv);
    assert.equal(await exists(path.join(app.targetDir, "frontend/components.json")), false);
    assert.match(readme, /deploy\/railway\/README\.md/);
    assert.match(railwayBackendDockerfile, /COPY tsconfig\.base\.json \.\//);
    assert.match(railwayFrontendDockerfile, /COPY tsconfig\.base\.json \.\//);
  } finally {
    await app.cleanup();
  }
});

test("scaffolds a Tailscale app with custom ports", async () => {
  const app = await scaffoldApp("tailscale-app", [
    "--tailscale",
    "--frontend-port",
    "5174",
    "--backend-port",
    "3001"
  ]);

  try {
    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    const frontendViteConfig = await readFile(path.join(app.targetDir, "frontend/vite.config.ts"), "utf8");
    const frontendEnv = await readFile(path.join(app.targetDir, "frontend/.env.example"), "utf8");
    const frontendLocalEnv = await readFile(path.join(app.targetDir, "frontend/.env"), "utf8");
    const backendEnv = await readFile(path.join(app.targetDir, "backend/.env.example"), "utf8");
    const readme = await readFile(path.join(app.targetDir, "README.md"), "utf8");
    await runCli(["info"], app.targetDir);

    assert.deepEqual(manifest.network, { tailscale: true });
    assert.deepEqual(manifest.ports, { frontend: 5174, backend: 3001 });
    assert.deepEqual(manifest.database, { provider: "postgres" });
    assert.match(frontendViteConfig, /host: "0\.0\.0\.0"/);
    assert.match(frontendViteConfig, /port: 5174/);
    assert.match(frontendViteConfig, /strictPort: true/);
    assert.match(frontendViteConfig, /allowedHosts: \["\.ts\.net"\]/);
    assert.match(frontendViteConfig, /target: "http:\/\/127\.0\.0\.1:3001"/);
    assert.equal(frontendEnv, "VITE_API_URL=\n");
    assert.equal(frontendLocalEnv, frontendEnv);
    assert.equal(
      backendEnv,
      "PORT=3001\nFRONTEND_URL=http://localhost:5174\nDATABASE_URL=postgres://postgres:postgres@localhost:5444/postgres\n"
    );
    assert.match(readme, /http:\/\/localhost:5174/);
    assert.match(readme, /http:\/\/localhost:3001/);
    assert.match(readme, /proxies `\/api`/);
  } finally {
    await app.cleanup();
  }
});

test("scaffolds a Tailscale SQLite app", async () => {
  const app = await scaffoldApp("sqlite-app", ["--tailscale", "--sqlite"]);

  try {
    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    const rootPackage = await readJson(path.join(app.targetDir, "package.json"));
    const backendPackage = await readJson(path.join(app.targetDir, "backend/package.json"));
    const backendEnv = await readFile(path.join(app.targetDir, "backend/.env.example"), "utf8");
    const dbIndex = await readFile(path.join(app.targetDir, "backend/src/db/index.ts"), "utf8");
    const schema = await readFile(path.join(app.targetDir, "backend/src/db/schema.ts"), "utf8");
    const drizzleConfig = await readFile(path.join(app.targetDir, "backend/drizzle.config.ts"), "utf8");
    const migration = await readFile(path.join(app.targetDir, "backend/drizzle/0000_initial.sql"), "utf8");
    const readme = await readFile(path.join(app.targetDir, "README.md"), "utf8");
    const agents = await readFile(path.join(app.targetDir, "AGENTS.md"), "utf8");
    const gitignore = await readFile(path.join(app.targetDir, ".gitignore"), "utf8");

    assert.deepEqual(manifest.database, { provider: "sqlite" });
    assert.equal(await exists(path.join(app.targetDir, "backend/compose.yaml")), false);
    assert.equal(backendPackage.dependencies.postgres, undefined);
    assert.equal(backendPackage.dependencies["@libsql/client"], "^0.17.3");
    assert.equal(rootPackage.scripts["db:start"], undefined);
    assert.equal(rootPackage.scripts["db:stop"], undefined);
    assert.equal(backendPackage.scripts["db:start"], undefined);
    assert.equal(backendPackage.scripts["db:stop"], undefined);
    assert.equal(backendPackage.scripts["db:migrate"], "drizzle-kit push");
    assert.equal(backendEnv, "PORT=3000\nFRONTEND_URL=http://localhost:5173\nDATABASE_URL=file:./mosskit.sqlite\n");
    assert.match(dbIndex, /@libsql\/client/);
    assert.match(schema, /sqliteTable/);
    assert.match(drizzleConfig, /dialect: "sqlite"/);
    assert.match(migration, /id TEXT PRIMARY KEY NOT NULL/);
    assert.doesNotMatch(migration, /CREATE EXTENSION/);
    assert.match(readme, /Drizzle \+ SQLite/);
    assert.doesNotMatch(readme, /bun run db:start/);
    assert.match(agents, /SQLite local file setup/);
    assert.match(agents, /db:migrate/);
    assert.doesNotMatch(agents, /PostgreSQL Docker setup/);
    assert.doesNotMatch(agents, /db:start/);
    assert.match(gitignore, /backend\/\*\.sqlite/);
  } finally {
    await app.cleanup();
  }
});

test("rejects invalid create flags", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mosskit-test-"));

  try {
    await assertCliRejects(
      [path.join(tempDir, "bad-port"), "--yes", "--no-install", "--no-git", "--frontend-port", "nope"],
      /--frontend-port must be an integer/
    );

    await assertCliRejects(
      [path.join(tempDir, "bad-sqlite"), "--yes", "--no-install", "--no-git", "--sqlite"],
      /--sqlite can only be used with --tailscale/
    );
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

test("scaffolds feature presets and records them in the manifest", async () => {
  const app = await scaffoldApp("full-app", ["--auth", "--shadcn"]);

  try {
    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    const frontendPackage = await readJson(path.join(app.targetDir, "frontend/package.json"));
    const backendPackage = await readJson(path.join(app.targetDir, "backend/package.json"));
    const readme = await readFile(path.join(app.targetDir, "README.md"), "utf8");
    const railwayReadme = await readFile(path.join(app.targetDir, "deploy/railway/README.md"), "utf8");

    assert.deepEqual(manifest.features, ["auth", "shadcn"]);
    assert.equal(frontendPackage.dependencies["@clerk/clerk-react"], "^5.58.0");
    assert.equal(backendPackage.dependencies["@hono/clerk-auth"], "^3.0.3");
    assert.match(readme, /mosskit\.json/);
    assert.match(readme, /deploy\/railway\/README\.md/);
    assert.match(railwayReadme, /CLERK_SECRET_KEY/);
    assert.match(railwayReadme, /CLERK_PUBLISHABLE_KEY/);
    assert.match(railwayReadme, /VITE_CLERK_PUBLISHABLE_KEY/);
    assert.equal(await exists(path.join(app.targetDir, "frontend/src/routes/sign-in.tsx")), true);
    assert.equal(await exists(path.join(app.targetDir, "frontend/src/components/ui/card.tsx")), true);
  } finally {
    await app.cleanup();
  }
});

test("info and features read the manifest", async () => {
  const app = await scaffoldApp("auth-app", ["--auth"]);

  try {
    const info = await runCli(["info"], app.targetDir);
    const features = await runCli(["features"], app.targetDir);

    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    assert.deepEqual(manifest.features, ["auth"]);
    assert.match(info.stdout, /MossKit project/);
    assert.match(info.stdout, /Features: auth/);
    assert.match(info.stdout, /Tailscale: disabled/);
    assert.match(info.stdout, /Frontend port: 5173/);
    assert.match(info.stdout, /Backend port: 3000/);
    assert.match(info.stdout, /Database: postgres/);
    assert.match(features.stdout, /auth: enabled/);
    assert.match(features.stdout, /shadcn: disabled/);
  } finally {
    await app.cleanup();
  }
});

test("add auth updates manifest, env, and dependencies", async () => {
  const app = await scaffoldApp("base-app");

  try {
    await runCli(["add", "auth"], app.targetDir);

    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    const frontendPackage = await readJson(path.join(app.targetDir, "frontend/package.json"));
    const backendPackage = await readJson(path.join(app.targetDir, "backend/package.json"));
    const frontendEnv = await readFile(path.join(app.targetDir, "frontend/.env.example"), "utf8");
    const backendEnv = await readFile(path.join(app.targetDir, "backend/.env.example"), "utf8");
    const railwayReadme = await readFile(path.join(app.targetDir, "deploy/railway/README.md"), "utf8");

    assert.deepEqual(manifest.features, ["auth"]);
    assert.equal(frontendPackage.dependencies["@clerk/clerk-react"], "^5.58.0");
    assert.equal(backendPackage.dependencies["@hono/clerk-auth"], "^3.0.3");
    assert.match(frontendEnv, /VITE_CLERK_PUBLISHABLE_KEY/);
    assert.match(backendEnv, /CLERK_SECRET_KEY/);
    assert.match(railwayReadme, /CLERK_SECRET_KEY/);
    assert.equal(await exists(path.join(app.targetDir, "backend/src/utils/auth.ts")), true);
  } finally {
    await app.cleanup();
  }
});

test("add shadcn updates manifest and UI files", async () => {
  const app = await scaffoldApp("base-app");

  try {
    await runCli(["add", "shadcn"], app.targetDir);

    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    const frontendPackage = await readJson(path.join(app.targetDir, "frontend/package.json"));

    assert.deepEqual(manifest.features, ["shadcn"]);
    assert.equal(frontendPackage.dependencies["class-variance-authority"], "^0.7.1");
    assert.equal(await exists(path.join(app.targetDir, "frontend/components.json")), true);
    assert.equal(await exists(path.join(app.targetDir, "frontend/src/components/ui/button.tsx")), true);
  } finally {
    await app.cleanup();
  }
});

test("add is idempotent for auth", async () => {
  const app = await scaffoldApp("base-app");

  try {
    await runCli(["add", "auth"], app.targetDir);
    const secondRun = await runCli(["add", "auth"], app.targetDir);

    const manifest = await readJson(path.join(app.targetDir, "mosskit.json"));
    const frontendEnv = await readFile(path.join(app.targetDir, "frontend/.env.example"), "utf8");
    const backendEnv = await readFile(path.join(app.targetDir, "backend/.env.example"), "utf8");

    assert.deepEqual(manifest.features, ["auth"]);
    assert.match(secondRun.stdout, /already enabled/);
    assert.equal(frontendEnv.match(/VITE_CLERK_PUBLISHABLE_KEY/g)?.length, 1);
    assert.equal(backendEnv.match(/CLERK_SECRET_KEY/g)?.length, 1);
  } finally {
    await app.cleanup();
  }
});
