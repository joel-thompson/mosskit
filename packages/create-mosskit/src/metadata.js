import packageJson from "../package.json" with { type: "json" };

export const frameworkMetadata = {
  name: "mosskit",
  displayName: "MossKit",
  createPackageName: packageJson.name,
  cliVersion: packageJson.version,
  manifestSchemaVersion: 1,
  templateVersion: "1",
  packageManager: "bun",
  runtime: "bun",
  docsUrl: "https://github.com/joel-thompson/mosskit",
  tokens: {
    appName: "__APP_NAME__",
    appPackageName: "__APP_PACKAGE_NAME__",
    stackDisplayName: "__STACK_DISPLAY_NAME__",
    docsUrl: "__STACK_DOCS_URL__"
  }
};
