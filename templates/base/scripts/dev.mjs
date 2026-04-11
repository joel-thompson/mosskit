import { spawn } from "node:child_process";

const processes = [
  {
    name: "backend",
    command: "bun",
    args: ["run", "--filter", "backend", "dev"]
  },
  {
    name: "frontend",
    command: "bun",
    args: ["run", "--filter", "frontend", "dev"]
  }
];

const children = [];
let shuttingDown = false;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function writePrefixedOutput(prefix, chunk, stream = process.stdout) {
  const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    stream.write(`[${prefix}] ${line}\n`);
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 100);
}

for (const processDefinition of processes) {
  log(`[somestack] starting ${processDefinition.name}`);

  const child = spawn(processDefinition.command, processDefinition.args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    writePrefixedOutput(processDefinition.name, chunk);
  });

  child.stderr.on("data", (chunk) => {
    writePrefixedOutput(processDefinition.name, chunk, process.stderr);
  });

  child.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }

    if (code === 0) {
      log(`[somestack] ${processDefinition.name} exited`);
      shutdown(0);
      return;
    }

    log(`[somestack] ${processDefinition.name} exited with code ${code ?? "unknown"}`);
    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    log(`[somestack] failed to start ${processDefinition.name}: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
}

process.on("SIGINT", () => {
  log("[somestack] stopping dev processes");
  shutdown(0);
});

process.on("SIGTERM", () => {
  log("[somestack] stopping dev processes");
  shutdown(0);
});
