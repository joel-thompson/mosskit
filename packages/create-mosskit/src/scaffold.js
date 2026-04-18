import { cp, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
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
    backendEnv: path.join(projectDir, "backend", ".env.example"),
    readme: path.join(projectDir, "README.md"),
    railwayReadme: path.join(projectDir, "deploy", "railway", "README.md")
  };
}

async function syncProjectPackageJson(projectDir, { featureIds, packageName }) {
  const paths = getProjectPaths(projectDir);

  const manifests = applyTemplateVersions(
    {
      root: await readJson(paths.rootPackage),
      frontend: await readJson(paths.frontendPackage),
      backend: await readJson(paths.backendPackage),
      shared: await readJson(paths.sharedPackage)
    },
    featureIds
  );

  manifests.root.name = packageName;

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
    await appendUniqueLines(paths.backendEnv, feature.envExamples.backend);
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
      stackDisplayName: frameworkMetadata.displayName
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
    packageName
  });
  await syncProjectEnvExamples(projectDir, selectedFeatureIds);

  const manifest = createProjectManifest({
    appName: appDisplayName,
    packageName,
    featureIds: selectedFeatureIds
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
    packageName: manifest.project.packageName
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
