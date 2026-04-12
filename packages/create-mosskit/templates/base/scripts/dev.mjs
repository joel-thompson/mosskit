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
let pendingExitCode = 0;
let forceKillTimer;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function writePrefixedOutput(prefix, chunk, stream = process.stdout) {
  const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    stream.write(`[${prefix}] ${line}\n`);
  }
}

function killChildTree(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return false;
  }

  try {
    process.kill(-child.pid, signal);
    return true;
  } catch {
    try {
      child.kill(signal);
      return true;
    } catch {
      return false;
    }
  }
}

function exitIfStopped() {
  if (!shuttingDown) {
    return;
  }

  const activeChildren = children.filter((child) => child.exitCode === null && child.signalCode === null);
  if (activeChildren.length > 0) {
    return;
  }

  clearTimeout(forceKillTimer);
  process.exit(pendingExitCode);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    pendingExitCode = Math.max(pendingExitCode, exitCode);
    return;
  }

  shuttingDown = true;
  pendingExitCode = exitCode;

  for (const child of children) {
    killChildTree(child, "SIGINT");
  }

  forceKillTimer = setTimeout(() => {
    for (const child of children) {
      killChildTree(child, "SIGKILL");
    }
  }, 3000);

  exitIfStopped();
}

for (const processDefinition of processes) {
  log(`[mosskit] starting ${processDefinition.name}`);

  const child = spawn(processDefinition.command, processDefinition.args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    detached: true
  });

  child.stdout.on("data", (chunk) => {
    writePrefixedOutput(processDefinition.name, chunk);
  });

  child.stderr.on("data", (chunk) => {
    writePrefixedOutput(processDefinition.name, chunk, process.stderr);
  });

  child.on("exit", (code) => {
    if (shuttingDown) {
      exitIfStopped();
      return;
    }

    if (code === 0) {
      log(`[mosskit] ${processDefinition.name} exited`);
      shutdown(0);
      return;
    }

    log(`[mosskit] ${processDefinition.name} exited with code ${code ?? "unknown"}`);
    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    log(`[mosskit] failed to start ${processDefinition.name}: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
}

process.on("SIGINT", () => {
  log("[mosskit] stopping dev processes");
  shutdown(0);
});

process.on("SIGTERM", () => {
  log("[mosskit] stopping dev processes");
  shutdown(0);
});
