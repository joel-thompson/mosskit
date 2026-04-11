import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "templates");
const targetDir = path.join(rootDir, "packages", "create-somestack", "templates");

await rm(targetDir, { force: true, recursive: true });
await mkdir(path.dirname(targetDir), { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
