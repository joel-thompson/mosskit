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
const cliPath = path.join(repoRoot, "packages/create-somestack/src/index.js");

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

async function runCli(args, cwd = repoRoot) {
  return execFileAsync("node", [cliPath, ...args], { cwd });
}

async function scaffoldApp(name, flags = []) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "somestack-test-"));
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
    assert.equal(await exists(path.join(app.targetDir, "somestack.json")), true);

    const manifest = await readJson(path.join(app.targetDir, "somestack.json"));
    const rootPackage = await readJson(path.join(app.targetDir, "package.json"));
    const frontendPackage = await readJson(path.join(app.targetDir, "frontend/package.json"));

    assert.equal(rootPackage.name, "base-app");
    assert.deepEqual(manifest.features, []);
    assert.equal(manifest.framework.name, "somestack");
    assert.equal(frontendPackage.dependencies["@clerk/clerk-react"], undefined);
    assert.equal(await exists(path.join(app.targetDir, "frontend/components.json")), false);
  } finally {
    await app.cleanup();
  }
});

test("scaffolds feature presets and records them in the manifest", async () => {
  const app = await scaffoldApp("full-app", ["--auth", "--shadcn"]);

  try {
    const manifest = await readJson(path.join(app.targetDir, "somestack.json"));
    const frontendPackage = await readJson(path.join(app.targetDir, "frontend/package.json"));
    const backendPackage = await readJson(path.join(app.targetDir, "backend/package.json"));
    const readme = await readFile(path.join(app.targetDir, "README.md"), "utf8");

    assert.deepEqual(manifest.features, ["auth", "shadcn"]);
    assert.equal(frontendPackage.dependencies["@clerk/clerk-react"], "^5.58.0");
    assert.equal(backendPackage.dependencies["@hono/clerk-auth"], "^3.0.3");
    assert.match(readme, /somestack\.json/);
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

    assert.match(info.stdout, /Somestack project/);
    assert.match(info.stdout, /Features: auth/);
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

    const manifest = await readJson(path.join(app.targetDir, "somestack.json"));
    const frontendPackage = await readJson(path.join(app.targetDir, "frontend/package.json"));
    const backendPackage = await readJson(path.join(app.targetDir, "backend/package.json"));
    const frontendEnv = await readFile(path.join(app.targetDir, "frontend/.env.example"), "utf8");
    const backendEnv = await readFile(path.join(app.targetDir, "backend/.env.example"), "utf8");

    assert.deepEqual(manifest.features, ["auth"]);
    assert.equal(frontendPackage.dependencies["@clerk/clerk-react"], "^5.58.0");
    assert.equal(backendPackage.dependencies["@hono/clerk-auth"], "^3.0.3");
    assert.match(frontendEnv, /VITE_CLERK_PUBLISHABLE_KEY/);
    assert.match(backendEnv, /CLERK_SECRET_KEY/);
    assert.equal(await exists(path.join(app.targetDir, "backend/src/utils/auth.ts")), true);
  } finally {
    await app.cleanup();
  }
});

test("add shadcn updates manifest and UI files", async () => {
  const app = await scaffoldApp("base-app");

  try {
    await runCli(["add", "shadcn"], app.targetDir);

    const manifest = await readJson(path.join(app.targetDir, "somestack.json"));
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

    const manifest = await readJson(path.join(app.targetDir, "somestack.json"));
    const frontendEnv = await readFile(path.join(app.targetDir, "frontend/.env.example"), "utf8");
    const backendEnv = await readFile(path.join(app.targetDir, "backend/.env.example"), "utf8");

    assert.match(secondRun.stdout, /already enabled/);
    assert.deepEqual(manifest.features, ["auth"]);
    assert.equal(frontendEnv.match(/VITE_CLERK_PUBLISHABLE_KEY/g)?.length, 1);
    assert.equal(backendEnv.match(/CLERK_SECRET_KEY/g)?.length, 1);
  } finally {
    await app.cleanup();
  }
});
