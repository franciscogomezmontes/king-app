#!/usr/bin/env node
/**
 * Expo's Metro web export (web.output: "single") hardcodes every asset reference as an
 * absolute root path (`/favicon.ico`, `/_expo/static/js/...`, and — baked directly into the JS
 * bundle itself — every `expo-font` file under `/assets/...`). That's correct for a host that
 * serves the build from its domain root, but GitHub Pages project sites serve from a subpath
 * (`https://<user>.github.io/<repo>/`), so every one of those absolute references 404s unless
 * rewritten to include that subpath. There's no Expo CLI flag for this in "single" output mode
 * (EXPO_BASE_URL only affects expo-router's static-site-generation mode), so this is a deliberate
 * small postprocessing step instead — see .github/workflows/deploy-pages.yml, which is the only
 * caller. Scoped to exactly the two known absolute-path shapes; if a future Expo upgrade changes
 * how it emits these, this script is the one place to update, not the build itself.
 */
const fs = require("fs");
const path = require("path");

const [, , distDir, basePath] = process.argv;
if (!distDir || !basePath) {
  console.error("Usage: fix-web-basepath.js <dist-dir> </base-path>");
  process.exit(1);
}

const indexPath = path.join(distDir, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
html = html.replace('href="/favicon.ico"', `href="${basePath}/favicon.ico"`);
html = html.replace('src="/_expo/', `src="${basePath}/_expo/`);
fs.writeFileSync(indexPath, html);

const jsDir = path.join(distDir, "_expo", "static", "js", "web");
for (const file of fs.readdirSync(jsDir)) {
  if (!file.endsWith(".js")) continue;
  const filePath = path.join(jsDir, file);
  const contents = fs.readFileSync(filePath, "utf8");
  const rewritten = contents.split('"/assets/').join(`"${basePath}/assets/`);
  if (rewritten !== contents) fs.writeFileSync(filePath, rewritten);
}

console.log(`Rewrote absolute asset paths in ${distDir} to base path ${basePath}`);
