import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { applyTemplateVersions } from "../packages/create-somestack/src/dependency-versions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const paths = {
  root: path.join(rootDir, "templates", "base", "package.json"),
  frontend: path.join(rootDir, "templates", "base", "frontend", "package.json"),
  backend: path.join(rootDir, "templates", "base", "backend", "package.json"),
  shared: path.join(rootDir, "templates", "base", "shared", "package.json")
};

const manifests = applyTemplateVersions({
  root: await readJson(paths.root),
  frontend: await readJson(paths.frontend),
  backend: await readJson(paths.backend),
  shared: await readJson(paths.shared)
}, []);

await writeJson(paths.root, manifests.root);
await writeJson(paths.frontend, manifests.frontend);
await writeJson(paths.backend, manifests.backend);
await writeJson(paths.shared, manifests.shared);
