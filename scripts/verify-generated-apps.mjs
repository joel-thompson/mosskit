import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "packages", "create-somestack", "src", "index.js");

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function runCommand(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env
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

async function runDevCheck(appDir) {
  log(`==> Checking root dev orchestration`);

  await new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", "dev"], {
      cwd: appDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    let sawBackend = false;
    let sawFrontend = false;
    let finished = false;

    const finish = (callback) => {
      if (finished) {
        return;
      }

      finished = true;
      callback();
    };

    const maybeStop = () => {
      if (sawBackend && sawFrontend) {
        child.kill("SIGINT");
      }
    };

    const handleChunk = (chunk) => {
      const output = chunk.toString();
      process.stdout.write(output);

      if (output.includes("[somestack] starting backend")) {
        sawBackend = true;
      }

      if (output.includes("[somestack] starting frontend")) {
        sawFrontend = true;
      }

      maybeStop();
    };

    const timeout = setTimeout(() => {
      finish(() => {
        child.kill("SIGKILL");
        reject(new Error("Timed out while waiting for bun run dev to start both processes"));
      });
    }, 15000);

    child.stdout.on("data", handleChunk);
    child.stderr.on("data", handleChunk);

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      finish(() => {
        if (!sawBackend || !sawFrontend) {
          reject(new Error("bun run dev did not report both backend and frontend startup"));
          return;
        }

        if (code !== 0 && signal !== "SIGINT") {
          reject(
            new Error(
              `bun run dev exited with code ${code ?? "unknown"}${signal ? ` (signal ${signal})` : ""}`
            )
          );
          return;
        }

        resolve(undefined);
      });
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      finish(() => reject(error));
    });
  });
}

async function verifyScenario(tempDir, name, createArgs, postCreateArgs = []) {
  const appDir = path.join(tempDir, name);

  log(`\n==> Scaffolding ${name}`);
  await runCommand(process.execPath, [cliPath, appDir, "--yes", "--no-install", "--no-git", ...createArgs], repoRoot);

  for (const args of postCreateArgs) {
    log(`==> Running ${args.join(" ")} for ${name}`);
    await runCommand(process.execPath, [cliPath, ...args], appDir);
  }

  log(`==> Installing dependencies for ${name}`);
  await runCommand("bun", ["install"], appDir);

  await runDevCheck(appDir);

  log(`==> Running typecheck for ${name}`);
  await runCommand("bun", ["run", "typecheck"], appDir);

  log(`==> Running tests for ${name}`);
  await runCommand("bun", ["run", "test"], appDir);

  log(`==> Running build for ${name}`);
  await runCommand("bun", ["run", "build"], appDir);
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), "somestack-generated-verify-"));
const keepApps = process.env.KEEP_VERIFY_APPS === "1";

try {
  await verifyScenario(tempDir, "base-app", []);
  await verifyScenario(tempDir, "full-app", ["--auth", "--shadcn"]);
  await verifyScenario(tempDir, "base-add-auth-app", [], [["add", "auth"]]);
  await verifyScenario(tempDir, "base-add-shadcn-app", [], [["add", "shadcn"]]);
  log(`\nGenerated app verification passed.`);
  log(`Workspace: ${tempDir}`);
} finally {
  if (!keepApps) {
    await rm(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200
    });
  }
}
