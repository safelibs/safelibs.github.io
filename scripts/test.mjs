import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = spawnSync("node", ["scripts/build.mjs"], {
  cwd: rootDir,
  encoding: "utf8"
});

if (build.status !== 0) {
  process.stdout.write(build.stdout);
  process.stderr.write(build.stderr);
  process.exit(build.status ?? 1);
}

const requiredFiles = ["index.html", "styles.css", "script.js", ".nojekyll"];

for (const file of requiredFiles) {
  await access(join(rootDir, "dist", file), constants.F_OK);
}

const html = await readFile(join(rootDir, "dist", "index.html"), "utf8");

const expectations = [
  "<title>SafeLibs | Memory-safe drop-in replacements</title>",
  "Agents, but with a harness on",
  "Sharp edges acknowledged",
  "safelibs.github.io",
  "Generated from <code>contents.md</code>",
  "rofl",
  "Recon",
  "Setup",
  "Port",
  "Test"
];

for (const snippet of expectations) {
  if (!html.includes(snippet)) {
    throw new Error(`Missing expected output snippet: ${snippet}`);
  }
}

if (html.includes("PLACEHOLDER") || html.includes("undefined")) {
  throw new Error("Build output contains unresolved placeholders or undefined values");
}

if (html.includes("TODO:")) {
  throw new Error("Build output still contains TODO placeholder text");
}

const exactOccurrences = [
  ["Run baseline tests against the original Ubuntu C library package.", 1],
  ["Binary-compatible exported symbols.", 1],
  ["### Verification Philosophy", 0]
];

for (const [snippet, expectedCount] of exactOccurrences) {
  const actualCount = html.split(snippet).length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} occurrence(s) of \"${snippet}\", found ${actualCount}`);
  }
}

const renderingExpectations = [
  "Install SafeLibs-generated <code>.deb</code> replacements.",
  "or the <code>unsafe</code> parts of these libraries",
  "<em>I</em> don&#39;t use these things",
  "<p>A completed SafeLibs port should provide:</p>",
  "As of April 7, 2026, the SafeLibs org has 23 <code>port-*</code> repositories under active work."
];

for (const snippet of renderingExpectations) {
  if (!html.includes(snippet)) {
    throw new Error(`Missing expected rendered snippet: ${snippet}`);
  }
}
