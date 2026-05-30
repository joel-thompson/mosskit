import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "packages", "create-mosskit", "src", "index.js");

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

async function waitForSuccessfulResponse(url, validateBody = () => true) {
  const deadline = Date.now() + 15000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const body = await response.text();
        if (validateBody(body)) {
          return body;
        }

        lastError = new Error(`Response from ${url} did not match the expected shape.`);
      } else {
        lastError = new Error(`Request to ${url} returned ${response.status}.`);
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError ?? new Error(`Timed out waiting for a successful response from ${url}`);
}

async function runDevCheck(appDir, manifest) {
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

    const maybeStop = async () => {
      if (!sawBackend || !sawFrontend) {
        return;
      }

      try {
        await waitForSuccessfulResponse(`http://127.0.0.1:${manifest.ports.frontend}/`, (body) =>
          body.includes('<div id="root"></div>')
        );
        await waitForSuccessfulResponse(`http://127.0.0.1:${manifest.ports.backend}/health`, (body) =>
          body.includes('"status":"ok"')
        );
        await waitForSuccessfulResponse(
          `http://127.0.0.1:${manifest.ports.backend}/api/v1/example/status`,
          (body) => body.includes('"success":true')
        );

        if (manifest.network?.tailscale) {
          await waitForSuccessfulResponse(
            `http://127.0.0.1:${manifest.ports.frontend}/api/v1/example/status`,
            (body) => body.includes('"success":true')
          );
        }

        child.kill("SIGINT");
      } catch (error) {
        finish(() => {
          child.kill("SIGKILL");
          reject(error);
        });
      }
    };

    const handleChunk = (chunk) => {
      const output = chunk.toString();
      process.stdout.write(output);

      if (output.includes("[mosskit] starting backend")) {
        sawBackend = true;
      }

      if (output.includes("[mosskit] starting frontend")) {
        sawFrontend = true;
      }

      void maybeStop();
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

async function reservePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine reserved port")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

function includesFlag(args, flag) {
  return args.includes(flag);
}

async function verifyScenario(tempDir, name, createArgs, postCreateArgs = []) {
  const appDir = path.join(tempDir, name);
  const backendPort = await reservePort();
  const frontendPort = await reservePort();
  const scaffoldArgs = [...createArgs];

  if (!includesFlag(scaffoldArgs, "--frontend-port")) {
    scaffoldArgs.push("--frontend-port", String(frontendPort));
  }

  if (!includesFlag(scaffoldArgs, "--backend-port")) {
    scaffoldArgs.push("--backend-port", String(backendPort));
  }

  log(`\n==> Scaffolding ${name}`);
  await runCommand(
    process.execPath,
    [cliPath, appDir, "--yes", "--no-install", "--no-git", ...scaffoldArgs],
    repoRoot
  );

  for (const args of postCreateArgs) {
    log(`==> Running ${args.join(" ")} for ${name}`);
    await runCommand(process.execPath, [cliPath, ...args], appDir);
  }

  const manifest = JSON.parse(await readFile(path.join(appDir, "mosskit.json"), "utf8"));

  log(`==> Installing dependencies for ${name}`);
  await runCommand("bun", ["install"], appDir);

  if (manifest.database?.provider === "sqlite") {
    log(`==> Running db:migrate for ${name}`);
    await runCommand("bun", ["run", "db:migrate"], appDir);
  }

  await runDevCheck(appDir, manifest);

  log(`==> Running typecheck for ${name}`);
  await runCommand("bun", ["run", "typecheck"], appDir);

  log(`==> Running tests for ${name}`);
  await runCommand("bun", ["run", "test"], appDir);

  log(`==> Running build for ${name}`);
  await runCommand("bun", ["run", "build"], appDir);
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), "mosskit-generated-verify-"));
const keepApps = process.env.KEEP_VERIFY_APPS === "1";

try {
  await verifyScenario(tempDir, "base-app", []);
  await verifyScenario(tempDir, "full-app", ["--auth", "--shadcn"]);
  await verifyScenario(tempDir, "base-add-auth-app", [], [["add", "auth"]]);
  await verifyScenario(tempDir, "base-add-shadcn-app", [], [["add", "shadcn"]]);
  await verifyScenario(tempDir, "tailscale-sqlite-app", [
    "--tailscale",
    "--sqlite",
  ]);
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
