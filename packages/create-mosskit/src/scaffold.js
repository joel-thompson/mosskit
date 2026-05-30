import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { buildProjectReadme, buildRailwayDeploymentReadme } from "./readme.js";
import { applyTemplateVersions } from "./dependency-versions.js";
import { getFeature, isFeatureSupported, listFeatures, normalizeFeatureIds } from "./features.js";
import { createProjectManifest, readProjectManifest, writeProjectManifest } from "./manifest.js";
import { frameworkMetadata } from "./metadata.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getFeatureIdsFromOptions({ auth = false, shadcn = false, featureIds = [] }) {
  const selected = [...featureIds];

  if (auth) {
    selected.push("auth");
  }

  if (shadcn) {
    selected.push("shadcn");
  }

  return normalizeFeatureIds(selected);
}

async function getTemplateRoot() {
  const packagedTemplates = path.resolve(__dirname, "..", "templates");
  const workspaceTemplates = path.resolve(__dirname, "..", "..", "..", "templates");

  if (await pathExists(packagedTemplates)) {
    return packagedTemplates;
  }

  return workspaceTemplates;
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function toPackageName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureEmptyDirectory(targetDir) {
  if (!(await pathExists(targetDir))) {
    await mkdir(targetDir, { recursive: true });
    return;
  }

  const existing = await stat(targetDir);
  if (!existing.isDirectory()) {
    throw new Error(`Destination exists and is not a directory: ${targetDir}`);
  }

  const entries = await readdir(targetDir);
  if (entries.length > 0) {
    throw new Error(`Destination directory is not empty: ${targetDir}`);
  }
}

function getAllTextExtensions() {
  return new Set([
    ".css",
    ".example",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".sql",
    ".ts",
    ".tsx",
    ".yaml",
    ".yml"
  ]);
}

async function applyTokensInDirectory(directory, tokens) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await applyTokensInDirectory(entryPath, tokens);
      continue;
    }

    const extension = path.extname(entry.name);
    if (!getAllTextExtensions().has(extension) && entry.name !== "gitignore") {
      continue;
    }

    let content = await readFile(entryPath, "utf8");
    for (const [token, value] of Object.entries(tokens)) {
      content = content.split(token).join(value);
    }
    await writeFile(entryPath, content);
  }
}

async function renameGitignoreFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await renameGitignoreFiles(entryPath);
      continue;
    }

    if (entry.name === "gitignore") {
      await rename(entryPath, path.join(directory, ".gitignore"));
    }
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getProjectPaths(projectDir) {
  return {
    rootPackage: path.join(projectDir, "package.json"),
    frontendPackage: path.join(projectDir, "frontend", "package.json"),
    backendPackage: path.join(projectDir, "backend", "package.json"),
    sharedPackage: path.join(projectDir, "shared", "package.json"),
    frontendEnv: path.join(projectDir, "frontend", ".env.example"),
    frontendLocalEnv: path.join(projectDir, "frontend", ".env"),
    backendEnv: path.join(projectDir, "backend", ".env.example"),
    backendLocalEnv: path.join(projectDir, "backend", ".env"),
    frontendViteConfig: path.join(projectDir, "frontend", "vite.config.ts"),
    backendEnvSource: path.join(projectDir, "backend", "src", "utils", "env.ts"),
    backendEnvTest: path.join(projectDir, "backend", "src", "utils", "env.test.ts"),
    backendDbIndex: path.join(projectDir, "backend", "src", "db", "index.ts"),
    backendDbSchema: path.join(projectDir, "backend", "src", "db", "schema.ts"),
    backendDrizzleConfig: path.join(projectDir, "backend", "drizzle.config.ts"),
    backendInitialMigration: path.join(projectDir, "backend", "drizzle", "0000_initial.sql"),
    backendCompose: path.join(projectDir, "backend", "compose.yaml"),
    gitignore: path.join(projectDir, ".gitignore"),
    agents: path.join(projectDir, "AGENTS.md"),
    readme: path.join(projectDir, "README.md"),
    railwayReadme: path.join(projectDir, "deploy", "railway", "README.md")
  };
}

async function syncProjectPackageJson(projectDir, { featureIds, packageName, databaseProvider = "postgres" }) {
  const paths = getProjectPaths(projectDir);

  const manifests = applyTemplateVersions(
    {
      root: await readJson(paths.rootPackage),
      frontend: await readJson(paths.frontendPackage),
      backend: await readJson(paths.backendPackage),
      shared: await readJson(paths.sharedPackage)
    },
    featureIds,
    { databaseProvider }
  );

  manifests.root.name = packageName;

  if (databaseProvider === "sqlite") {
    delete manifests.root.scripts["db:start"];
    delete manifests.root.scripts["db:stop"];
    delete manifests.backend.scripts["db:start"];
    delete manifests.backend.scripts["db:stop"];
    manifests.backend.scripts["db:migrate"] = "drizzle-kit push";
  }

  await writeJson(paths.rootPackage, manifests.root);
  await writeJson(paths.frontendPackage, manifests.frontend);
  await writeJson(paths.backendPackage, manifests.backend);
  await writeJson(paths.sharedPackage, manifests.shared);
}

async function appendUniqueLines(filePath, lines) {
  if (lines.length === 0) {
    return;
  }

  const existingContent = await readFile(filePath, "utf8");
  const nextLines = lines.filter((line) => !existingContent.includes(line));

  if (nextLines.length === 0) {
    return;
  }

  await writeFile(filePath, `${existingContent.trimEnd()}\n${nextLines.join("\n")}\n`);
}

async function syncProjectEnvExamples(projectDir, featureIds) {
  const paths = getProjectPaths(projectDir);

  for (const featureId of featureIds) {
    const feature = getFeature(featureId);
    if (!feature) {
      continue;
    }

    await appendUniqueLines(paths.frontendEnv, feature.envExamples.frontend);
    if (await pathExists(paths.frontendLocalEnv)) {
      await appendUniqueLines(paths.frontendLocalEnv, feature.envExamples.frontend);
    }
    await appendUniqueLines(paths.backendEnv, feature.envExamples.backend);
    if (await pathExists(paths.backendLocalEnv)) {
      await appendUniqueLines(paths.backendLocalEnv, feature.envExamples.backend);
    }
  }
}

function buildFrontendViteConfig({ tailscale, frontendPort, backendPort }) {
  const serverConfig = tailscale
    ? `  server: {
    host: "0.0.0.0",
    port: ${frontendPort},
    strictPort: true,
    allowedHosts: [".ts.net"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:${backendPort}",
        changeOrigin: true
      }
    }
  },`
    : `  server: {
    port: ${frontendPort}
  },`;

  return `import path from "node:path";
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
${serverConfig}
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
`;
}

function buildBackendEnvSource({ backendPort, frontendPort, databaseProvider }) {
  const databaseUrl =
    databaseProvider === "sqlite"
      ? "file:./mosskit.sqlite"
      : "postgres://postgres:postgres@localhost:5444/postgres";

  return `import { z } from "zod";

const backendEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(${backendPort}),
  FRONTEND_URL: z.string().default("http://localhost:${frontendPort}"),
  DATABASE_URL: z.string().default("${databaseUrl}"),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional()
});

export function getBackendEnv(input: Record<string, string | undefined> = process.env) {
  return backendEnvSchema.parse(input);
}
`;
}

function buildBackendEnvTest({ backendPort, frontendPort }) {
  return `import { getBackendEnv } from "./env";

test("getBackendEnv applies defaults", () => {
  expect(getBackendEnv({})).toMatchObject({
    PORT: ${backendPort},
    FRONTEND_URL: "http://localhost:${frontendPort}"
  });
});
`;
}

function buildBackendEnv({ backendPort, frontendPort, databaseProvider }) {
  const databaseUrl =
    databaseProvider === "sqlite"
      ? "file:./mosskit.sqlite"
      : "postgres://postgres:postgres@localhost:5444/postgres";

  return `PORT=${backendPort}
FRONTEND_URL=http://localhost:${frontendPort}
DATABASE_URL=${databaseUrl}
`;
}

function buildFrontendEnv({ tailscale, backendPort }) {
  return `VITE_API_URL=${tailscale ? "" : `http://localhost:${backendPort}`}
`;
}

function buildSqliteDbIndex() {
  return `import { createClient } from "@libsql/client";

export async function getDatabaseHealth(connectionString: string) {
  const db = createClient({
    url: connectionString
  });

  try {
    await db.execute("select 1");
    return {
      configured: true,
      connected: true
    };
  } catch {
    return {
      configured: true,
      connected: false
    };
  } finally {
    db.close();
  }
}
`;
}

function buildSqliteSchema() {
  return `import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const starterMessages = sqliteTable("starter_messages", {
  id: text("id")
    .$defaultFn(() => crypto.randomUUID())
    .primaryKey(),
  body: text("body").notNull(),
  createdAt: text("created_at").default(sql\`CURRENT_TIMESTAMP\`).notNull()
});
`;
}

function buildSqliteDrizzleConfig() {
  return `import { defineConfig } from "drizzle-kit";
import { getBackendEnv } from "./src/utils/env";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getBackendEnv().DATABASE_URL
  }
});
`;
}

function buildSqliteInitialMigration() {
  return `CREATE TABLE IF NOT EXISTS starter_messages (
  id TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
}

async function configureSqliteAgentsFile(filePath) {
  const content = await readFile(filePath, "utf8");
  const nextContent = content
    .replace(
      "- `backend`: Hono API with Drizzle, PostgreSQL Docker setup, and example backend tests",
      "- `backend`: Hono API with Drizzle, SQLite local file setup, and example backend tests"
    )
    .replace(
      "- `bun run db:start` and `bun run db:stop` manage the local PostgreSQL container.",
      "- `bun run db:migrate` applies migrations to the local SQLite database file."
    );

  await writeFile(filePath, nextContent);
}

async function configureProjectSettings(projectDir, { tailscale, frontendPort, backendPort, databaseProvider }) {
  const paths = getProjectPaths(projectDir);
  const frontendEnv = buildFrontendEnv({ tailscale, backendPort });
  const backendEnv = buildBackendEnv({ backendPort, frontendPort, databaseProvider });

  await writeFile(paths.frontendViteConfig, buildFrontendViteConfig({ tailscale, frontendPort, backendPort }));
  await writeFile(paths.frontendEnv, frontendEnv);
  await writeFile(paths.frontendLocalEnv, frontendEnv);
  await writeFile(paths.backendEnv, backendEnv);
  await writeFile(paths.backendLocalEnv, backendEnv);
  await writeFile(paths.backendEnvSource, buildBackendEnvSource({ backendPort, frontendPort, databaseProvider }));
  await writeFile(paths.backendEnvTest, buildBackendEnvTest({ backendPort, frontendPort }));

  if (databaseProvider === "sqlite") {
    await writeFile(paths.backendDbIndex, buildSqliteDbIndex());
    await writeFile(paths.backendDbSchema, buildSqliteSchema());
    await writeFile(paths.backendDrizzleConfig, buildSqliteDrizzleConfig());
    await writeFile(paths.backendInitialMigration, buildSqliteInitialMigration());
    await appendUniqueLines(paths.gitignore, ["backend/*.sqlite", "backend/*.sqlite-*"]);
    await rm(paths.backendCompose, { force: true });
    await configureSqliteAgentsFile(paths.agents);
  }
}

async function copyDirectoryContents(sourceDir, targetDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    await cp(path.join(sourceDir, entry.name), path.join(targetDir, entry.name), {
      recursive: true
    });
  }
}

async function applyFeatureOverlays(projectDir, featureIds) {
  const templateRoot = await getTemplateRoot();

  for (const featureId of featureIds) {
    const feature = getFeature(featureId);
    if (!feature) {
      continue;
    }

    const overlayDirectory = path.join(templateRoot, "features", feature.overlayDirectory);
    if (await pathExists(overlayDirectory)) {
      await copyDirectoryContents(overlayDirectory, projectDir);
    }
  }
}

async function runCommand(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

async function writeProjectReadme(projectDir, manifest) {
  const readmePath = getProjectPaths(projectDir).readme;
  await writeFile(
    readmePath,
    buildProjectReadme({
      appName: manifest.project.name,
      features: manifest.features,
      stackDisplayName: frameworkMetadata.displayName,
      tailscale: manifest.network?.tailscale ?? false,
      frontendPort: manifest.ports?.frontend ?? 5173,
      backendPort: manifest.ports?.backend ?? 3000,
      databaseProvider: manifest.database?.provider ?? "postgres"
    })
  );
}

async function writeProjectRailwayReadme(projectDir, manifest) {
  const railwayReadmePath = getProjectPaths(projectDir).railwayReadme;
  await writeFile(
    railwayReadmePath,
    buildRailwayDeploymentReadme({
      appName: manifest.project.name,
      features: manifest.features
    })
  );
}

async function writeProjectMetadata(projectDir, manifest) {
  await writeProjectManifest(projectDir, manifest);
  await writeProjectReadme(projectDir, manifest);
  await writeProjectRailwayReadme(projectDir, manifest);
}

function buildTokenMap({ appDisplayName, packageName }) {
  return {
    [frameworkMetadata.tokens.appName]: appDisplayName,
    [frameworkMetadata.tokens.appPackageName]: packageName,
    [frameworkMetadata.tokens.stackDisplayName]: frameworkMetadata.displayName,
    [frameworkMetadata.tokens.docsUrl]: frameworkMetadata.docsUrl
  };
}

function ensureFeatureIsSupported(featureId) {
  if (!isFeatureSupported(featureId)) {
    throw new Error(
      `Unsupported feature "${featureId}". Available features: ${listFeatures()
        .map((feature) => feature.id)
        .join(", ")}`
    );
  }
}

export async function scaffoldProject({
  destination,
  appDisplayName,
  auth,
  shadcn,
  install,
  git,
  tailscale = false,
  frontendPort = 5173,
  backendPort = 3000,
  databaseProvider = "postgres",
  featureIds = []
}) {
  const selectedFeatureIds = getFeatureIdsFromOptions({ auth, shadcn, featureIds });
  const templateRoot = await getTemplateRoot();
  const projectDir = path.resolve(destination);
  const packageName = toPackageName(path.basename(projectDir));

  if (!packageName) {
    throw new Error("Could not derive a valid package name from the destination.");
  }

  await ensureEmptyDirectory(projectDir);
  await copyDirectoryContents(path.join(templateRoot, "base"), projectDir);
  await applyFeatureOverlays(projectDir, selectedFeatureIds);
  await applyTokensInDirectory(projectDir, buildTokenMap({ appDisplayName, packageName }));
  await renameGitignoreFiles(projectDir);
  await syncProjectPackageJson(projectDir, {
    featureIds: selectedFeatureIds,
    packageName,
    databaseProvider
  });
  await configureProjectSettings(projectDir, {
    tailscale,
    frontendPort,
    backendPort,
    databaseProvider
  });
  await syncProjectEnvExamples(projectDir, selectedFeatureIds);

  const manifest = createProjectManifest({
    appName: appDisplayName,
    packageName,
    featureIds: selectedFeatureIds,
    tailscale,
    frontendPort,
    backendPort,
    databaseProvider
  });

  await writeProjectMetadata(projectDir, manifest);

  if (install) {
    await runCommand("bun", ["install"], projectDir);
  }

  if (git) {
    await runCommand("git", ["init"], projectDir);
  }

  return { packageName, projectDir, manifest };
}

export async function addFeatureToProject({ projectDir, featureId, install = false }) {
  ensureFeatureIsSupported(featureId);

  const manifest = await readProjectManifest(projectDir);
  if (manifest.features.includes(featureId)) {
    return {
      added: false,
      manifest,
      feature: getFeature(featureId)
    };
  }

  const nextFeatureIds = normalizeFeatureIds([...manifest.features, featureId]);

  await applyFeatureOverlays(projectDir, [featureId]);
  await syncProjectPackageJson(projectDir, {
    featureIds: nextFeatureIds,
    packageName: manifest.project.packageName,
    databaseProvider: manifest.database?.provider ?? "postgres"
  });
  await syncProjectEnvExamples(projectDir, [featureId]);

  const nextManifest = {
    ...manifest,
    generatedWith: {
      package: frameworkMetadata.createPackageName,
      version: frameworkMetadata.cliVersion
    },
    features: nextFeatureIds
  };

  await writeProjectMetadata(projectDir, nextManifest);

  if (install) {
    await runCommand("bun", ["install"], projectDir);
  }

  return {
    added: true,
    manifest: nextManifest,
    feature: getFeature(featureId)
  };
}
