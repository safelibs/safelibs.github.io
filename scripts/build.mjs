import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(rootDir, "src");
const distDir = join(rootDir, "dist");
const markdown = await readFile(join(rootDir, "contents.md"), "utf8");

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });

const title = matchRequired(markdown, /^# (.+)$/m, "site title")[1].trim();
const intro = matchRequired(markdown, /^# .+\n\n([\s\S]*?)\n\n## /m, "intro copy")[1].trim();
const missionItems = extractListItems(getSection("Mission"), "Mission");
const priorities = extractListItems(getSection("Priorities"), "Priorities");
const nonGoalBlocks = parseBlocks(getSection("Non-goal"));
const maintainabilityBlocks = parseBlocks(getSection("Maintainability"));
const faqEntries = extractSubsections(getSection("FAQ"), "FAQ");
const pipelineFaq = faqEntries.find((entry) => entry.title === "How are the agents harnessed?");
const pipelineBlocks = pipelineFaq ? parseBlocks(pipelineFaq.body) : [];
const portStatusBlocks = parseBlocks(getSection("Port Status"));
const compatibilitySection = getSection("Compatibility Contract");
const compatibilityLeadText = getSectionLead(compatibilitySection);
const compatibilityBlocks = parseBlocks(compatibilityLeadText);
const compatibilityItems = extractListItems(compatibilityLeadText, "Compatibility Contract");
const verificationText = getSubsection(compatibilitySection, "Verification Philosophy");
const verificationBlocks = parseBlocks(verificationText);
const verificationItems = extractListItems(verificationText, "Verification Philosophy");
const warningFaq = faqEntries.find((entry) => entry.title === "Do you guarantee I won't get hacked?");
const useFaq = faqEntries.find((entry) => entry.title === "But should I use these libraries?");
const buildTimestamp = new Date().toISOString();

const pipelineListBlock = pipelineBlocks.find((block) => block.type === "ol");
const pipelineLeadBlocks = pipelineBlocks.filter((block) => block !== pipelineListBlock);
const pipelineStages = pipelineListBlock ? pipelineListBlock.items : [];

const repoCards = [
  {
    label: "Org layout",
    title: "Per-library ports",
    body:
      "Each target library gets its own port repository under the SafeLibs org so compatibility work, tags, and verification stay isolated.",
    href: "https://github.com/safelibs",
    cta: "Browse the org"
  },
  {
    label: "Website",
    title: "safelibs.github.io",
    body:
      "This site is published from the dedicated GitHub Pages repository and generated directly from the project contents document.",
    href: "https://github.com/safelibs/safelibs.github.io",
    cta: "View the site repo"
  },
  {
    label: "Pipeline",
    title: "Agent workflows",
    body:
      "The Juvenal-driven pipeline owns recon, setup, porting, and downstream validation across the port repositories.",
    href: "https://github.com/safelibs/pipeline",
    cta: "Inspect the pipeline"
  }
];

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | Memory-safe drop-in replacements</title>
    <meta
      name="description"
      content="SafeLibs builds Rust reimplementations of critical C/C++ libraries with drop-in compatibility, performance, and an agentic porting pipeline."
    >
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta
      property="og:description"
      content="Memory-safe replacements for critical C/C++ infrastructure, built around drop-in compatibility and agentic verification."
    >
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://safelibs.github.io/">
    <meta name="theme-color" content="#071018">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
      rel="stylesheet"
    >
    <link rel="stylesheet" href="./styles.css">
    <script type="module" src="./script.js"></script>
  </head>
  <body>
    <div class="site-shell">
      <header class="site-header" data-reveal>
        <div class="brand">
          <div class="brand-mark">SL</div>
          <div class="brand-copy">
            <strong>${escapeHtml(title)}</strong>
            <span>Agentic retranslations for load-bearing infrastructure</span>
          </div>
        </div>
        <nav class="top-nav" aria-label="Section navigation">
          <a href="#mission">Mission</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#contract">Contract</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <main>
        <section class="hero" id="top" data-reveal>
          <div class="hero-copy">
            <p class="eyebrow">memory-safe retranslations / c abi intact / runtime behavior first</p>
            <h1>${escapeHtml(title)}</h1>
            <p class="hero-lede">${renderInline(intro)}</p>
            <div class="hero-actions">
              <a class="button button-primary" href="#contract">Read the compatibility contract</a>
              <a class="button" href="#pipeline">Inspect the pipeline</a>
            </div>
            <ul class="signal-strip" aria-label="Project signals">
              <li class="hero-chip">Rust reimplementations</li>
              <li class="hero-chip">Compile-time and runtime drop-in posture</li>
              <li class="hero-chip">Agent-harnessed verification</li>
            </ul>
          </div>
          <aside class="hero-panel">
            <div class="panel-header">
              <div>
                <p class="panel-label">Operational posture</p>
                <h2 class="panel-title">Serious about compatibility. Honest about risk.</h2>
              </div>
              <div class="panel-badge">No hand-wavy safety theater</div>
            </div>
            <div class="stats-grid">
              ${priorities
                .map(
                  (priority, index) => `
                    <div class="stat-card">
                      <span class="stat-value">0${index + 1}</span>
                      <span class="stat-label">${escapeHtml(priority)}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
            <p class="panel-copy">${plainText(nonGoalBlocks)}</p>
            <p class="panel-copy">${plainText(useFaq ? parseBlocks(useFaq.body) : [])}</p>
          </aside>
        </section>

        <section class="section" id="mission" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">Mission</p>
              <h2>What gets optimized first</h2>
            </div>
            <p>SafeLibs is not trying to invent a new application platform. It is trying to swap out critical C and C++ plumbing without forcing downstream users to rewrite their world.</p>
          </div>
          <div class="mission-grid">
            ${missionItems
              .map(
                (item, index) => `
                  <article class="card">
                    <span class="card-kicker">0${index + 1}</span>
                    <h3 class="card-title">${escapeHtml(toCardTitle(item))}</h3>
                    <p>${renderInline(item)}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="section" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">Priorities</p>
              <h2>Order matters here</h2>
            </div>
            <p>The whole project is explicit about tradeoffs. Compatibility comes first, then performance, then memory safety work that still behaves like the original library.</p>
          </div>
          <div class="priorities-grid">
            ${priorities
              .map(
                (item, index) => `
                  <article class="priority-card">
                    <span class="priority-index">${String(index + 1).padStart(2, "0")}</span>
                    <h3>${escapeHtml(item)}</h3>
                    <p>${priorityCopy(index)}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="section" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">Operating stance</p>
              <h2>Pragmatic, not precious</h2>
            </div>
            <p>The site keeps the sass, but the model is straightforward: retranslating from upstream is cheaper than pretending these generated ports will turn into lovingly hand-maintained Rust codebases.</p>
          </div>
          <div class="stance-grid">
            <article class="body-copy">
              <span class="card-kicker">Non-goal</span>
              ${renderBlocks(nonGoalBlocks)}
            </article>
            <article class="body-copy">
              <span class="card-kicker">Maintainability</span>
              ${renderBlocks(maintainabilityBlocks)}
            </article>
            <article class="quote-card">
              <span class="quote-label">Reality check</span>
              <blockquote>“rofl” is funny right up until you remember nobody but the AI has reviewed this code.</blockquote>
              <p>${plainText(warningFaq ? parseBlocks(warningFaq.body) : []).replace(/^rofl\s+/i, "")}</p>
            </article>
          </div>
        </section>

        <section class="section" id="pipeline" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">Pipeline</p>
              <h2>Agents, but with a harness on</h2>
            </div>
            <p>The porting flow is intentionally staged so each phase has a concrete output, verification criteria, and a taggable boundary before the next model gets to touch the work.</p>
          </div>
          <div class="pipeline-layout">
            <article class="body-copy">
              ${renderBlocks(pipelineLeadBlocks)}
            </article>
            <div class="timeline">
              ${pipelineStages
                .map(
                  (stage, index) => `
                    <article class="pipeline-stage">
                      <span class="timeline-index">${String(index + 1).padStart(2, "0")}</span>
                      <h3>${escapeHtml(stageTitle(stage))}</h3>
                      <p>${renderInline(stageDescription(stage))}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>

        <section class="section" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">Structure</p>
              <h2>Repos stay separated on purpose</h2>
            </div>
            <p>The ports, website, and pipeline live in distinct repositories so agentic work, verification tags, and publishing can stay scoped instead of bleeding across the whole org.</p>
          </div>
          <div class="structure-grid">
            ${repoCards
              .map(
                (card) => `
                  <article class="repo-card">
                    <span class="repo-label">${escapeHtml(card.label)}</span>
                    <h3>${escapeHtml(card.title)}</h3>
                    <p>${escapeHtml(card.body)}</p>
                    <a href="${card.href}" target="_blank" rel="noreferrer">${escapeHtml(card.cta)}</a>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="section" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">Port status</p>
              <h2>Status board pending first ports</h2>
            </div>
            <p>No fake progress bars here. The board should appear only once there are real published ports and actual compatibility results to show.</p>
          </div>
          <article class="status-card">
            <h3>Current signal</h3>
            ${renderBlocks(portStatusBlocks)}
          </article>
        </section>

        <section class="section" id="contract" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">Compatibility contract</p>
              <h2>What a completed port is supposed to prove</h2>
            </div>
            <p>${plainText(compatibilityBlocks)}</p>
          </div>
          <div class="contract-grid">
            <article class="contract-card">
              <span class="card-kicker">Guarantees attempted</span>
              <h3>Drop-in by build and by runtime</h3>
              <ul>
                ${compatibilityItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}
              </ul>
            </article>
            <article class="contract-card">
              <span class="card-kicker">Verification philosophy</span>
              <h3>Clean-room replacement test</h3>
              ${renderBlocks(verificationBlocks.filter((block) => block.type !== "ul"))}
              <ul>
                ${verificationItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}
              </ul>
            </article>
          </div>
        </section>

        <section class="section" id="faq" data-reveal>
          <div class="section-head">
            <div>
              <p class="eyebrow">FAQ</p>
              <h2>Sharp edges acknowledged</h2>
            </div>
            <p>The tone is still a little feral, but the important bits are not jokes: safety claims are scoped tightly, and the project is explicit about where confidence ends.</p>
          </div>
          <div class="faq-list">
            ${faqEntries
              .map(
                (entry, index) => `
                  <details class="faq-item"${index === 0 ? " open" : ""}>
                    <summary class="faq-summary">${escapeHtml(entry.title)}</summary>
                    <div class="faq-content">
                      ${renderBlocks(parseBlocks(entry.body))}
                    </div>
                  </details>
                `
              )
              .join("")}
          </div>
        </section>
      </main>

      <footer class="site-footer" data-reveal>
        <div>
          <p class="footer-title">SafeLibs</p>
          <p class="footer-copy">Generated from <code>contents.md</code>. If the mission shifts, update the source and rebuild instead of hand-editing the page.</p>
        </div>
        <p class="footer-note">
          Built from source text on
          <time data-build-time datetime="${buildTimestamp}">${buildTimestamp}</time>
        </p>
      </footer>
    </div>
  </body>
</html>
`;

await writeFile(join(distDir, "index.html"), html);
await copyFile(join(srcDir, "styles.css"), join(distDir, "styles.css"));
await copyFile(join(srcDir, "script.js"), join(distDir, "script.js"));
await writeFile(join(distDir, ".nojekyll"), "");

function getSection(name) {
  const text = `${markdown}\n## __END__`;
  const pattern = new RegExp(`^## ${escapeRegExp(name)}\\n\\n([\\s\\S]*?)(?=^## )`, "m");
  return matchRequired(text, pattern, `section ${name}`)[1].trim();
}

function getSubsection(sectionBody, name) {
  const text = `${sectionBody}\n### __END__`;
  const pattern = new RegExp(`^### ${escapeRegExp(name)}\\n([\\s\\S]*?)(?=^### )`, "m");
  return matchRequired(text, pattern, `subsection ${name}`)[1].trim();
}

function getSectionLead(sectionBody) {
  const text = `${sectionBody}\n### __END__`;
  return text.split(/^### /m)[0].trim();
}

function extractSubsections(sectionBody, sectionName) {
  const text = `${sectionBody}\n### __END__`;
  const entries = [...text.matchAll(/^### (.+)\n([\s\S]*?)(?=^### )/gm)].map((match) => ({
    title: match[1].trim(),
    body: match[2].trim()
  }));

  if (!entries.length) {
    throw new Error(`Expected subsections in ${sectionName}`);
  }

  return entries;
}

function extractListItems(sectionBody, sectionName) {
  const items = sectionBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(- |\d+\. )/.test(line))
    .map((line) => line.replace(/^(- |\d+\. )/, "").trim());

  if (!items.length) {
    throw new Error(`Expected a list in ${sectionName}`);
  }

  return items;
}

function parseBlocks(text) {
  const lines = text.trim().split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      index += 1;
      const chunk = [];
      while (index < lines.length && !lines[index].startsWith("```")) {
        chunk.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", content: chunk.join("\n") });
      index += 1;
      continue;
    }

    if (/^- /.test(line)) {
      const items = [];
      while (index < lines.length && /^- /.test(lines[index])) {
        items.push(lines[index].replace(/^- /, "").trim());
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\. /.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\. /, "").trim());
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const chunk = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !/^- /.test(lines[index]) &&
      !/^\d+\. /.test(lines[index])
    ) {
      chunk.push(lines[index].trim());
      index += 1;
    }

    blocks.push({ type: "p", content: chunk.join(" ") });
  }

  return blocks;
}

function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "p") {
        return `<p>${renderInline(block.content)}</p>`;
      }

      if (block.type === "ul") {
        return `<ul>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`;
      }

      if (block.type === "ol") {
        return `<ol>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`;
      }

      if (block.type === "code") {
        return `<pre class="terminal-block"><code>${escapeHtml(block.content)}</code></pre>`;
      }

      return "";
    })
    .join("");
}

function renderInline(text) {
  const placeholders = [];
  let output = text;

  output = output.replace(/`([^`]+)`/g, (_, code) => placeholder(`<code>${escapeHtml(code)}</code>`));
  output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) =>
    placeholder(`<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`)
  );

  output = escapeHtml(output);
  output = output.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/_([^_]+)_/g, "<em>$1</em>");

  return placeholders.reduce(
    (value, html, index) => value.replaceAll(`@@PLACEHOLDER${index}@@`, html),
    output
  );

  function placeholder(html) {
    const index = placeholders.push(html) - 1;
    return `@@PLACEHOLDER${index}@@`;
  }
}

function plainText(blocks) {
  return blocks
    .filter((block) => block.type === "p")
    .map((block) => stripMarkdown(block.content))
    .join(" ");
}

function stripMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toCardTitle(item) {
  return stripMarkdown(item)
    .replace(/\.$/, "")
    .replace(/^Preserve /, "")
    .replace(/^Keep /, "")
    .replace(/^Reimplement /, "")
    .replace(/^C ABI and behavioral compatibility so existing consumers can relink without source changes$/i, "Relink without source edits")
    .replace(/^widely-used C\/C\+\+ libraries in Rust for memory safety$/i, "Translate critical libraries")
    .replace(/^ports practical for production by retaining performance characteristics$/i, "Keep it production-practical");
}

function priorityCopy(index) {
  const lines = [
    "The replacement must compile and behave like the original from the consumer's point of view, or the rest of the exercise is decorative.",
    "Ports that crater performance are not usable replacements for the same workloads, so runtime characteristics still matter.",
    "Memory safety matters most when it arrives without breaking the contract above it."
  ];

  return lines[index] ?? "";
}

function stageTitle(stage) {
  return stage.split(" - ")[0].trim();
}

function stageDescription(stage) {
  return stage.split(" - ").slice(1).join(" - ").trim();
}

function matchRequired(text, pattern, label) {
  const match = text.match(pattern);
  if (!match) {
    throw new Error(`Unable to find ${label}`);
  }
  return match;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
