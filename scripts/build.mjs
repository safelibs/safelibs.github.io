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
const introBlocks = parseBlocks(intro);
const missionText = getSection("Mission");
const missionItems = extractListItems(missionText, "Mission");
const prioritiesText = getSection("Priorities");
const prioritiesBlocks = parseBlocks(prioritiesText);
const nonGoalBlocks = parseBlocks(getSection("Non-goal"));
const maintainabilityBlocks = parseBlocks(getSection("Maintainability"));
const faqEntries = extractSubsections(getSection("FAQ"), "FAQ");
const pipelineFaq = faqEntries.find((entry) => entry.title === "How are the agents harnessed?");

if (!pipelineFaq) {
  throw new Error("Expected FAQ entry for pipeline details");
}

const pipelineBlocks = parseBlocks(pipelineFaq.body);
const pipelineListBlock = pipelineBlocks.find((block) => block.type === "ol");
const pipelineLeadBlocks = pipelineBlocks.filter((block) => block !== pipelineListBlock);
const pipelineStages = pipelineListBlock ? pipelineListBlock.items : [];
const projectStructureBlocks = parseBlocks(getSection("Project Structure"));
const portStatusBlocks = parseBlocks(getSection("Port Status"));
const effortStatsBlocks = parseBlocks(getSection("Port Effort Stats"));
const compatibilitySection = getSection("Compatibility Contract");
const compatibilityLeadText = getSectionLead(compatibilitySection);
const compatibilityBlocks = parseBlocks(compatibilityLeadText);
const verificationBlocks = parseBlocks(getSubsection(compatibilitySection, "Verification Philosophy"));
const buildTimestamp = new Date().toISOString();
const metaDescription = truncate(stripMarkdown(intro), 180);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | Memory-safe drop-in replacements</title>
    <meta name="description" content="${escapeAttribute(metaDescription)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeAttribute(metaDescription)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://safelibs.github.io/">
    <meta name="theme-color" content="#071018">
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23071018'/%3E%3Cpath d='M18 43h28v-8H28c-5 0-9-4-9-9s4-9 9-9h18v8H28c-1 0-1 .5-1 1s.5 1 1 1h8c6 0 10 4 10 9s-4 7-10 7H18z' fill='%2351d4b9'/%3E%3C/svg%3E">
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
      <header class="site-header">
        <a class="brand" href="#top" aria-label="${escapeHtml(title)} home">
          <span class="brand-mark">SL</span>
          <span class="brand-copy">
            <strong>${escapeHtml(title)}</strong>
          </span>
        </a>
        <nav class="top-nav" aria-label="Section navigation">
          <a href="#mission">Mission</a>
          <a href="#maintainability">Maintainability</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#effort">Stats</a>
          <a href="#contract">Contract</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <main class="site-main">
        <section class="hero" id="top">
          <p class="eyebrow">Generated from <code>contents.md</code></p>
          <h1>${escapeHtml(title)}</h1>
          <div class="hero-copy">
            ${renderBlocks(introBlocks)}
          </div>
          <div class="hero-actions">
            <a class="button button-primary" href="#contract">Compatibility Contract</a>
            <a class="button" href="#faq">FAQ</a>
          </div>
        </section>

        <section class="section" id="mission">
          <div class="section-heading">
            <h2>Mission</h2>
          </div>
          <div class="split-grid">
            <article class="panel">
              <ul class="feature-list">
                ${missionItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}
              </ul>
            </article>
            <article class="panel">
              <h3>Priorities</h3>
              ${renderBlocks(prioritiesBlocks)}
            </article>
          </div>
        </section>

        <section class="section" id="maintainability">
          <div class="section-heading">
            <h2>Maintainability</h2>
          </div>
          <div class="split-grid">
            <article class="panel">
              <h3>Non-goal</h3>
              ${renderBlocks(nonGoalBlocks)}
            </article>
            <article class="panel">
              <h3>Maintainability</h3>
              ${renderBlocks(maintainabilityBlocks)}
            </article>
          </div>
        </section>

        <section class="section" id="pipeline">
          <div class="section-heading">
            <h2>Pipeline</h2>
          </div>
          <article class="panel">
            ${renderBlocks(pipelineLeadBlocks)}
          </article>
          <div class="timeline">
            ${pipelineStages
              .map(
                (stage, index) => `
                  <article class="pipeline-stage">
                    <span class="timeline-index">${String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>${escapeHtml(stageTitle(stage))}</h3>
                      <p>${renderInline(stageDescription(stage))}</p>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="section" id="structure">
          <div class="section-heading">
            <h2>Project Structure</h2>
          </div>
          <article class="panel prose">
            ${renderBlocks(projectStructureBlocks)}
          </article>
        </section>

        <section class="section" id="status">
          <div class="section-heading">
            <h2>Port Status</h2>
          </div>
          <article class="panel prose">
            ${renderBlocks(portStatusBlocks)}
          </article>
        </section>

        <section class="section" id="effort">
          <div class="section-heading">
            <h2>Port Effort Stats</h2>
          </div>
          <article class="panel prose">
            ${renderBlocks(effortStatsBlocks)}
          </article>
        </section>

        <section class="section" id="contract">
          <div class="section-heading">
            <h2>Compatibility Contract</h2>
          </div>
          <div class="split-grid">
            <article class="panel">
              ${renderBlocks(compatibilityBlocks)}
            </article>
            <article class="panel">
              <h3>Verification Philosophy</h3>
              ${renderBlocks(verificationBlocks)}
            </article>
          </div>
        </section>

        <section class="section" id="faq">
          <div class="section-heading">
            <h2>FAQ</h2>
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

      <footer class="site-footer">
        <p class="footer-copy">Generated from <code>contents.md</code>.</p>
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

    if (isTableStart(lines, index)) {
      const header = parseTableRow(lines[index]);
      const rows = [];
      index += 2;

      while (index < lines.length && /^\|/.test(lines[index].trim())) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ type: "table", header, rows });
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
      !isTableStart(lines, index) &&
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

      if (block.type === "table") {
        const numericHeadings = new Set([
          "Sessions",
          "Tokens",
          "Total tokens",
          "Recon tokens",
          "Setup tokens",
          "Port tokens",
          "Test tokens",
          "Agent time",
          "Calendar span"
        ]);
        const numericColumns = block.header
          .map((heading, index) => ({ heading: stripMarkdown(heading), index }))
          .filter(({ heading }) => numericHeadings.has(heading))
          .map(({ index }) => index);

        return `
          <div class="table-shell">
            <table class="stats-table">
              <thead>
                <tr>
                  ${block.header.map((cell) => `<th scope="col">${renderInline(cell)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${block.rows
                  .map(
                    (row) => `
                      <tr>
                        ${row
                          .map((cell, cellIndex) => {
                            const numericClass = numericColumns.includes(cellIndex) ? ' class="numeric"' : "";
                            if (cellIndex === 0) {
                              return `<th scope="row"${numericClass}>${renderInline(cell)}</th>`;
                            }
                            return `<td${numericClass}>${renderInline(cell)}</td>`;
                          })
                          .join("")}
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      return "";
    })
    .join("");
}

function isTableStart(lines, index) {
  return Boolean(
    lines[index] &&
      lines[index + 1] &&
      /^\|/.test(lines[index].trim()) &&
      isTableSeparator(lines[index + 1])
  );
}

function isTableSeparator(line) {
  const cells = parseTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(text) {
  const placeholders = [];
  let output = text;

  output = output.replace(/`([^`]+)`/g, (_, code) => placeholder(`<code>${escapeHtml(code)}</code>`));
  output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) =>
    placeholder(`<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`)
  );
  output = output.replace(/https?:\/\/[^\s<)]+/g, (url) =>
    placeholder(`<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`)
  );

  output = escapeHtml(output);
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

function stageTitle(stage) {
  return stage.split(" - ")[0].trim();
}

function stageDescription(stage) {
  return stage.split(" - ").slice(1).join(" - ").trim();
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

function truncate(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
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
