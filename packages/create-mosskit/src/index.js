#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { addFeatureToProject, scaffoldProject } from "./scaffold.js";
import { listFeatures, getFeature, isFeatureSupported } from "./features.js";
import { readProjectManifest } from "./manifest.js";
import { frameworkMetadata } from "./metadata.js";

const subcommands = new Set(["create", "add", "info", "features"]);
const createFlagsWithValues = new Set(["--frontend-port", "--backend-port"]);

function parseBooleanFlag(argv, name) {
  if (argv.includes(`--${name}`)) {
    return true;
  }

  if (argv.includes(`--no-${name}`)) {
    return false;
  }

  return undefined;
}

function parseFlagValue(argv, name) {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) {
    return undefined;
  }

  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for --${name}.`);
  }

  return value;
}

function parsePortFlag(argv, name) {
  const value = parseFlagValue(argv, name);
  if (value === undefined) {
    return undefined;
  }

  return parsePort(value, `--${name}`);
}

function parsePort(value, label) {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${label} must be an integer between 1 and 65535.`);
  }

  return port;
}

function getPositionalArgs(argv) {
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (createFlagsWithValues.has(value)) {
      index += 1;
      continue;
    }

    if (!value.startsWith("--")) {
      positional.push(value);
    }
  }

  return positional;
}

function getCommand(argv) {
  const firstArgument = argv[0];
  if (firstArgument && subcommands.has(firstArgument)) {
    return firstArgument;
  }

  return "create";
}

function getCommandArgs(argv, command) {
  if (command === "create" && argv[0] && !subcommands.has(argv[0])) {
    return argv;
  }

  return argv.slice(1);
}

function parseCreateArgs(argv) {
  const positional = getPositionalArgs(argv);

  return {
    destination: positional[0],
    tailscale: parseBooleanFlag(argv, "tailscale"),
    frontendPort: parsePortFlag(argv, "frontend-port"),
    backendPort: parsePortFlag(argv, "backend-port"),
    sqlite: parseBooleanFlag(argv, "sqlite"),
    auth: parseBooleanFlag(argv, "auth"),
    shadcn: parseBooleanFlag(argv, "shadcn"),
    install: parseBooleanFlag(argv, "install"),
    git: parseBooleanFlag(argv, "git"),
    yes: argv.includes("--yes") || argv.includes("-y")
  };
}

function parseAddArgs(argv) {
  const positional = argv.filter((value) => !value.startsWith("--"));

  return {
    featureId: positional[0],
    install: parseBooleanFlag(argv, "install") ?? false
  };
}

function printHelp() {
  console.log(`Create and manage ${frameworkMetadata.displayName} projects

Usage:
  bunx @joelthompson/create-mosskit my-app
  create-mosskit my-app [options]
  create-mosskit create my-app [options]
  create-mosskit add <feature> [--install]
  create-mosskit info
  create-mosskit features

Create options:
  --auth           Include Clerk authentication
  --no-auth        Skip Clerk authentication
  --tailscale      Configure Vite for Tailscale local-network access
  --no-tailscale   Skip Tailscale local-network configuration
  --frontend-port <port>  Frontend dev server port (default: 5173)
  --backend-port <port>   Backend dev server port (default: 3000)
  --sqlite         Use a local SQLite file database with Tailscale mode
  --no-sqlite      Use PostgreSQL
  --shadcn         Include shadcn/ui starter components
  --no-shadcn      Skip shadcn/ui starter components
  --install        Run bun install after scaffolding
  --no-install     Skip bun install
  --git            Initialize a git repository
  --no-git         Skip git initialization
  -y, --yes        Use defaults for any unanswered prompts

Add options:
  --install        Run bun install after applying the feature

Available features:
  ${listFeatures()
    .map((feature) => `${feature.id.padEnd(8)} ${feature.summary}`)
    .join("\n  ")}
`);
}

async function promptForCreateOptions(parsed) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    let destination = parsed.destination;
    if (!destination) {
      destination = await rl.question("Project directory: ");
    }

    const appDisplayName = path.basename(destination);

    const tailscale =
      parsed.tailscale ??
      (parsed.yes
        ? false
        : /^y(es)?$/i.test(await rl.question("Use Tailscale local-network setup? (y/N) ")));

    const frontendPort =
      parsed.frontendPort ??
      (parsed.yes
        ? 5173
        : parsePort((await rl.question("Frontend port? (5173) ")) || "5173", "Frontend port"));

    const backendPort =
      parsed.backendPort ??
      (parsed.yes
        ? 3000
        : parsePort((await rl.question("Backend port? (3000) ")) || "3000", "Backend port"));

    if (!tailscale && parsed.sqlite === true) {
      throw new Error("--sqlite can only be used with --tailscale.");
    }

    const sqlite =
      tailscale &&
      (parsed.sqlite ??
        (parsed.yes
          ? false
          : /^y(es)?$/i.test(await rl.question("Use a local SQLite file instead of PostgreSQL? (y/N) "))));

    const auth =
      parsed.auth ??
      (parsed.yes ? false : /^y(es)?$/i.test(await rl.question("Include Clerk auth? (y/N) ")));

    const shadcn =
      parsed.shadcn ??
      (parsed.yes
        ? false
        : /^y(es)?$/i.test(await rl.question("Include shadcn/ui starter components? (y/N) ")));

    const install =
      parsed.install ??
      (parsed.yes ? true : !/^n(o)?$/i.test(await rl.question("Run bun install now? (Y/n) ")));

    const git =
      parsed.git ??
      (parsed.yes ? true : !/^n(o)?$/i.test(await rl.question("Initialize git? (Y/n) ")));

    return {
      destination,
      appDisplayName,
      tailscale,
      frontendPort,
      backendPort,
      databaseProvider: sqlite ? "sqlite" : "postgres",
      auth,
      shadcn,
      install,
      git
    };
  } finally {
    rl.close();
  }
}

async function readManifestFromCwd() {
  try {
    return await readProjectManifest(process.cwd());
  } catch {
    throw new Error(
      "This command must be run from the root of a MossKit app that contains mosskit.json."
    );
  }
}

function formatFeatureList(manifest) {
  const enabled = new Set(manifest.features);

  return listFeatures()
    .map((feature) => {
      const state = enabled.has(feature.id) ? "enabled" : "disabled";
      return `- ${feature.id}: ${state} (${feature.summary})`;
    })
    .join("\n");
}

async function runCreate(argv) {
  const parsed = parseCreateArgs(argv);
  const options = await promptForCreateOptions(parsed);
  const result = await scaffoldProject(options);
  const databaseStartStep = options.databaseProvider === "sqlite" ? "  bun run db:migrate\n" : "  bun run db:start\n";

  console.log(`
Created ${frameworkMetadata.displayName} app in ${result.projectDir}

Next steps:
  cd ${options.destination}
${databaseStartStep}  bun run dev
`);
}

async function runAdd(argv) {
  const parsed = parseAddArgs(argv);
  if (!parsed.featureId) {
    throw new Error("Missing feature id. Usage: create-mosskit add <feature>");
  }

  if (!isFeatureSupported(parsed.featureId)) {
    throw new Error(
      `Unsupported feature "${parsed.featureId}". Available features: ${listFeatures()
        .map((feature) => feature.id)
        .join(", ")}`
    );
  }

  const result = await addFeatureToProject({
    projectDir: process.cwd(),
    featureId: parsed.featureId,
    install: parsed.install
  });

  if (!result.added) {
    console.log(`Feature "${parsed.featureId}" is already enabled.`);
    return;
  }

  console.log(`Added feature "${getFeature(parsed.featureId).displayName}" to this app.`);
  if (!parsed.install) {
    console.log("Run `bun install` to install any new dependencies.");
  }
}

async function runInfo() {
  const manifest = await readManifestFromCwd();

  console.log(`${manifest.framework.displayName} project`);
  console.log(`Project: ${manifest.project.name}`);
  console.log(`Package: ${manifest.project.packageName}`);
  console.log(`CLI version: ${manifest.generatedWith.version}`);
  console.log(`Template version: ${manifest.templateVersion}`);
  console.log(`Package manager: ${manifest.packageManager}`);
  console.log(`Runtime: ${manifest.runtime}`);
  console.log(`Tailscale: ${manifest.network?.tailscale ? "enabled" : "disabled"}`);
  console.log(`Frontend port: ${manifest.ports?.frontend ?? 5173}`);
  console.log(`Backend port: ${manifest.ports?.backend ?? 3000}`);
  console.log(`Database: ${manifest.database?.provider ?? "postgres"}`);
  console.log(`Features: ${manifest.features.length > 0 ? manifest.features.join(", ") : "(none)"}`);
}

async function runFeatures() {
  const manifest = await readManifestFromCwd();

  console.log(`Available features for ${manifest.project.name}`);
  console.log(formatFeatureList(manifest));
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  const command = getCommand(argv);
  const commandArgs = getCommandArgs(argv, command);

  if (command === "create") {
    await runCreate(commandArgs);
    return;
  }

  if (command === "add") {
    await runAdd(commandArgs);
    return;
  }

  if (command === "info") {
    await runInfo();
    return;
  }

  if (command === "features") {
    await runFeatures();
  }
}

main().catch((error) => {
  console.error(`Failed to run command: ${error.message}`);
  process.exitCode = 1;
});
