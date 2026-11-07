// Metro config for a pnpm monorepo. See https://docs.expo.dev/guides/monorepos/ — pnpm's
// symlink-based node_modules layout needs a bit of extra config Metro doesn't assume by
// default, so that it can (a) see changes in packages/rules-engine and packages/ui-kit, and
// (b) actually follow pnpm's symlinks when resolving those workspace packages.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo, not just apps/mobile, so edits to packages/* trigger a rebuild.
config.watchFolders = [workspaceRoot];

// Let Metro find modules hoisted to the workspace root as well as this app's own node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm installs packages via symlinks into node_modules/.pnpm — Metro needs to follow them.
config.resolver.unstable_enableSymlinks = true;

// Some packages (e.g. styleq, a react-native-web dependency) only expose subpaths via
// package.json "exports" maps rather than as literal files. Metro doesn't honor "exports"
// by default; without this, resolving things like "styleq/transform-localize-style" fails.
config.resolver.unstable_enablePackageExports = true;

// With package-exports resolution on, colyseus.js's HTTP helper (@colyseus/httpie) resolves to
// its Node-only build on native platforms — its exports map has no "react-native" condition, and
// Metro's native condition set (require/import/react-native) picks "import" before "browser",
// landing on a build that imports Node's http/https/url and 500s. httpie also ships a universal
// xhr build under its "browser" condition (uses fetch/XMLHttpRequest, both available in React
// Native) — adding "browser" to the allowed set lets that one win instead, since it comes first
// in httpie's own exports key order. Confirmed working on web already; this only changes native.
config.resolver.unstable_conditionNames = ["require", "import", "react-native", "browser"];

module.exports = config;
