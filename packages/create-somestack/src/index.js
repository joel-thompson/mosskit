#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { addFeatureToProject, scaffoldProject } from "./scaffold.js";
import { listFeatures, getFeature, isFeatureSupported } from "./features.js";
import { readProjectManifest } from "./manifest.js";
import { frameworkMetadata } from "./metadata.js";

const subcommands = new Set(["create", "add", "info", "features"]);

function parseBooleanFlag(argv, name) {
  if (argv.includes(`--${name}`)) {
    return true;
  }

  if (argv.includes(`--no-${name}`)) {
    return false;
  }

  return undefined;
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
  const positional = argv.filter((value) => !value.startsWith("--"));

  return {
    destination: positional[0],
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
  bun create somestack@latest my-app
  create-somestack my-app [options]
  create-somestack create my-app [options]
  create-somestack add <feature> [--install]
  create-somestack info
  create-somestack features

Create options:
  --auth           Include Clerk authentication
  --no-auth        Skip Clerk authentication
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
      "This command must be run from the root of a Somestack app that contains somestack.json."
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

  console.log(`
Created ${frameworkMetadata.displayName} app in ${result.projectDir}

Next steps:
  cd ${options.destination}
  bun run db:start
  bun run dev
`);
}

async function runAdd(argv) {
  const parsed = parseAddArgs(argv);
  if (!parsed.featureId) {
    throw new Error("Missing feature id. Usage: create-somestack add <feature>");
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
  console.error(`Failed to create project: ${error.message}`);
  process.exitCode = 1;
});
