import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validatorFixture = join(rootDir, "tests", "fixtures", "validator-site-data.json");
const build = spawnSync("node", ["scripts/build.mjs"], {
  cwd: rootDir,
  encoding: "utf8",
  env: {
    ...process.env,
    SAFELIBS_VALIDATOR_FIXTURE: validatorFixture
  }
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
  "<h2>What is this?</h2>",
  "<h2>How's it done?</h2>",
  "<h2>What's ported?</h2>",
  "<h2>Other efforts</h2>",
  "<h2>Other FAQs</h2>",
  "<link rel=\"icon\" href=\"data:image/svg+xml,",
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

const css = await readFile(join(rootDir, "dist", "styles.css"), "utf8");
const script = await readFile(join(rootDir, "dist", "script.js"), "utf8");

const removedRevealSnippets = [
  [html, "data-reveal", "HTML should render all content immediately"],
  [css, "[data-reveal]", "CSS should not hide content behind reveal rules"],
  [css, "is-visible", "CSS should not depend on reveal visibility classes"],
  [css, "translateY(", "CSS should not move content into view as a reveal effect"],
  [css, "scroll-behavior: smooth", "CSS should leave in-page navigation immediate"],
  [script, "IntersectionObserver", "JavaScript should not gate content visibility on IntersectionObserver"],
  [script, "document.documentElement.classList.add(\"js\")", "JavaScript should not enable hidden-js reveal states"]
];

for (const [content, snippet, message] of removedRevealSnippets) {
  if (content.includes(snippet)) {
    throw new Error(`${message}: found ${snippet}`);
  }
}

const exactOccurrences = [
  ["Run baseline tests against the original Ubuntu C library package.", 1],
  ["Binary-compatible exported symbols.", 1],
  ["How are the agents harnessed?", 0],
  ["<h2>What's ported?</h2>", 1],
  ["<h2>How's it done?</h2>", 1],
  ["<h2>What is this?</h2>", 1]
];

for (const [snippet, expectedCount] of exactOccurrences) {
  const actualCount = html.split(snippet).length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} occurrence(s) of \"${snippet}\", found ${actualCount}`);
  }
}

const renderingExpectations = [
  "<p>SafeLibs builds memory-safe (Rust) reimplementations of critical load-bearing C/C++ libraries used throughout open source infrastructure, while attempting to preserve drop-in compatibility at compile-time and runtime.</p>",
  "Install SafeLibs-generated <code>.deb</code> replacements.",
  "or the <code>unsafe</code> parts of these libraries",
  "<em>I</em> don&#39;t use these things",
  "<p>A completed SafeLibs port should provide:</p>",
  "<strong>4,524 sessions, 11.23B tokens, 682.0 agent-hours</strong>",
  "split 0.98B recon, 1.75B setup, 4.79B port, 3.71B test.",
  "href=\"https://safelibs.org/validator\" target=\"_blank\" rel=\"noreferrer\">validation</a>",
  "href=\"https://www.darpa.mil/research/programs/translating-all-c-to-rust\" target=\"_blank\" rel=\"noreferrer\">TRACTOR program</a>",
  "<table class=\"stats-table\">",
  "<th scope=\"col\" class=\"numeric\">Recon tokens</th>",
  "<th scope=\"row\"><a class=\"port-link\" href=\"https://github.com/safelibs/port-libzstd\" target=\"_blank\" rel=\"noreferrer\"><code>libzstd</code></a></th><td><code>04-test</code></td><td class=\"numeric\">281</td><td class=\"numeric\">1,775.7M</td><td class=\"numeric\">1.7M</td><td class=\"numeric\">210.7M</td><td class=\"numeric\">514.4M</td><td class=\"numeric\">1,048.9M</td>",
  "href=\"https://github.com/safelibs\" target=\"_blank\" rel=\"noreferrer\">github.com/safelibs</a>",
  "<details class=\"notes-block\">",
  "<span class=\"big-number\">17</span>"
];

for (const snippet of renderingExpectations) {
  if (!html.includes(snippet)) {
    throw new Error(`Missing expected rendered snippet: ${snippet}`);
  }
}

const removedSnippets = [
  "Agents, but with a harness on",
  "Sharp edges acknowledged",
  "Serious about compatibility. Honest about risk.",
  "Real port work, intentionally sparse public status",
  "<th scope=\"row\"><code>libssl</code></th>",
  "{{validating_count}}",
  "{{total_sessions}}",
  "<th scope=\"row\"><code>glib</code></th>",
  "<th scope=\"row\"><code>libc6</code></th>",
  "<th scope=\"row\"><code>libcurl</code></th>",
  "<th scope=\"row\"><code>libgcrypt</code></th>",
  "<th scope=\"row\"><code>libpng</code></th>",
  "<th scope=\"row\"><code>libsdl</code></th>",
  "<th scope=\"row\"><code>libvips</code></th>"
];

for (const snippet of removedSnippets) {
  if (html.includes(snippet)) {
    throw new Error(`Found removed editorial snippet: ${snippet}`);
  }
}
