import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { frameworkMetadata } from "./metadata.js";

export function getManifestPath(projectDir) {
  return path.join(projectDir, "somestack.json");
}

export async function readProjectManifest(projectDir) {
  const manifestPath = getManifestPath(projectDir);
  const content = await readFile(manifestPath, "utf8");
  return JSON.parse(content);
}

export async function writeProjectManifest(projectDir, manifest) {
  const manifestPath = getManifestPath(projectDir);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function createProjectManifest({ appName, packageName, featureIds }) {
  return {
    schemaVersion: frameworkMetadata.manifestSchemaVersion,
    framework: {
      name: frameworkMetadata.name,
      displayName: frameworkMetadata.displayName
    },
    project: {
      name: appName,
      packageName
    },
    generatedWith: {
      package: frameworkMetadata.createPackageName,
      version: frameworkMetadata.cliVersion
    },
    templateVersion: frameworkMetadata.templateVersion,
    packageManager: frameworkMetadata.packageManager,
    runtime: frameworkMetadata.runtime,
    features: featureIds
  };
}
