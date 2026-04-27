import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(rootDir, "src");
const distDir = join(rootDir, "dist");
const rawMarkdown = await readFile(join(rootDir, "contents.md"), "utf8");

const DEFAULT_VALIDATOR_URL = "https://safelibs.github.io/validator/site-data.json";
const DEFAULT_VALIDATOR_MODE = "port-04-test";
const validatorUrl = process.env.SAFELIBS_VALIDATOR_URL || DEFAULT_VALIDATOR_URL;
const validatorMode = process.env.SAFELIBS_VALIDATOR_MODE || DEFAULT_VALIDATOR_MODE;
const validatorFixturePath = process.env.SAFELIBS_VALIDATOR_FIXTURE;

const validatorSiteData = await loadValidatorSiteData(validatorUrl, validatorFixturePath);
const validatingLibraries = extractValidatingLibraries(validatorSiteData, validatorMode);
const { text: markdown, tokens: statsTokens } = applyValidatorFilter(rawMarkdown, validatingLibraries);

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });

const title = matchRequired(markdown, /^# (.+)$/m, "site title")[1].trim();
const intro = matchRequired(markdown, /^# .+\n\n([\s\S]*?)\n\n## /m, "intro copy")[1].trim();
const introBlocks = parseBlocks(intro);
const whatSection = getSection("What is this?");
const whatLeadBlocks = parseBlocks(getSectionLead(whatSection));
const scopeItems = extractListItems(getSubsection(whatSection, "Scope"), "Scope");
const prioritiesBlocks = parseBlocks(getSubsection(whatSection, "Priorities, in order"));
const maintainabilityBlocks = parseBlocks(getSubsection(whatSection, "Maintainability"));
const providesBlocks = parseBlocks(getSubsection(whatSection, "What a port provides"));
const verifyBlocks = parseBlocks(getSubsection(whatSection, "How we verify it"));
const faqEntries = extractSubsections(getSection("Other FAQs"), "Other FAQs");
const pipelineBlocks = parseBlocks(getSection("The Pipeline"));
const pipelineListBlock = pipelineBlocks.find((block) => block.type === "ol");
const pipelineLeadBlocks = pipelineBlocks.filter((block) => block !== pipelineListBlock);
const pipelineStages = pipelineListBlock ? pipelineListBlock.items : [];
const portsSection = getSection("Ports");
const portsLeadBlocks = parseBlocks(getSectionLead(portsSection));
const portsNotesBlocks = parseBlocks(getSubsection(portsSection, "Notes"));
const otherEffortsBlocks = parseBlocks(getSection("Other Efforts"));
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
          <a href="#what">What is this?</a>
          <a href="#ports">The Ports</a>
          <a href="#pipeline">The Pipeline</a>
          <a href="#other-efforts">Other efforts</a>
          <a href="#faq">Other FAQs</a>
        </nav>
      </header>

      <main class="site-main">
        <section class="hero" id="top">
          <h1>${escapeHtml(title)}<span class="beta-badge" aria-label="Beta">BETA</span></h1>
          <div class="hero-copy">
            ${renderBlocks(introBlocks)}
          </div>
          <div class="hero-actions">
            <a class="button button-primary" href="#what">What is this?</a>
            <a class="button" href="#ports">The Ports</a>
          </div>
        </section>

        <section class="section" id="what">
          <div class="section-heading">
            <h2>What is this?</h2>
          </div>
          <article class="what-article">
            <div class="lead">${renderBlocks(whatLeadBlocks)}</div>
            <h3>Scope</h3>
            <ul>
              ${scopeItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}
            </ul>
            <h3>Priorities, in order</h3>
            ${renderBlocks(prioritiesBlocks)}
            <h3>Maintainability</h3>
            ${renderBlocks(maintainabilityBlocks)}
            <h3>What a port provides</h3>
            ${renderBlocks(providesBlocks)}
            <h3>How we verify it</h3>
            ${renderBlocks(verifyBlocks)}
          </article>
        </section>

        <section class="section" id="ports">
          <div class="section-heading">
            <h2>The Ports</h2>
          </div>
          <p class="ports-headline-line">
            <span class="big-number">${escapeHtml(statsTokens.validating_count)}</span>
            libraries passing <a href="https://safelibs.org/validator" target="_blank" rel="noreferrer">validation</a>.
          </p>
          <div class="ports-article">
            ${renderBlocks(portsLeadBlocks)}
          </div>
          ${
            statsTokens.in_progress.length
              ? `<div class="in-progress-section">
            <p class="in-progress-line">
              <span class="big-number small">${statsTokens.in_progress.length}</span> more still in progress:
            </p>
            <ul class="in-progress-list">${statsTokens.in_progress
              .map(
                (entry) =>
                  `<li><a class="port-link" href="https://github.com/safelibs/port-${escapeAttribute(entry.name)}" target="_blank" rel="noreferrer"><code>${escapeHtml(entry.name)}</code></a><span class="stage-badge stage-${escapeAttribute(entry.stage)}">${escapeHtml(entry.stage)}</span></li>`
              )
              .join("")}</ul>
          </div>`
              : ""
          }
          <details class="notes-block">
            <summary>How to read this table</summary>
            <div class="notes-content">
              ${renderBlocks(portsNotesBlocks)}
            </div>
          </details>
        </section>

        <section class="section" id="pipeline">
          <div class="section-heading">
            <h2>The Pipeline</h2>
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

        <section class="section" id="other-efforts">
          <div class="section-heading">
            <h2>Other efforts</h2>
          </div>
          <article class="panel prose">
            ${renderBlocks(otherEffortsBlocks)}
          </article>
        </section>

        <section class="section" id="faq">
          <div class="section-heading">
            <h2>Other FAQs</h2>
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
        <a href="https://github.com/safelibs" target="_blank" rel="noreferrer">github.com/safelibs</a>
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
          "Calendar span",
          "Total unsafe",
          "ABI unsafe",
          "Other unsafe"
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
                  ${block.header
                    .map(
                      (cell, cellIndex) =>
                        `<th scope="col"${numericColumns.includes(cellIndex) ? ' class="numeric"' : ""}>${renderInline(cell)}</th>`
                    )
                    .join("")}
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
                              const libName = stripMarkdown(cell);
                              const linked = libName
                                ? `<a class="port-link" href="https://github.com/safelibs/port-${escapeAttribute(libName)}" target="_blank" rel="noreferrer">${renderInline(cell)}</a>`
                                : renderInline(cell);
                              return `<th scope="row"${numericClass}>${linked}</th>`;
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
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const isExternal = /^https?:\/\//.test(url);
    const attrs = isExternal ? ' target="_blank" rel="noreferrer"' : "";
    return placeholder(`<a href="${escapeAttribute(url)}"${attrs}>${escapeHtml(label)}</a>`);
  });
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

async function loadValidatorSiteData(url, fixturePath) {
  if (fixturePath) {
    const text = await readFile(fixturePath, "utf8");
    return JSON.parse(text);
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "safelibs-website" }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch validator site data from ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

function extractValidatingLibraries(siteData, mode) {
  if (!siteData || typeof siteData !== "object") {
    throw new Error("Validator site data must be a JSON object");
  }
  if (siteData.schema_version !== 2) {
    throw new Error(
      `Unsupported validator schema_version ${JSON.stringify(siteData.schema_version)}; expected 2`
    );
  }
  const proofs = Array.isArray(siteData.proofs) ? siteData.proofs : [];
  const proof = proofs.find((entry) => entry && entry.mode === mode);
  if (!proof) {
    throw new Error(`Validator proof for mode ${JSON.stringify(mode)} was not found`);
  }
  const validating = new Set();
  for (const entry of proof.libraries || []) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const totals = entry.totals || {};
    if (
      totals.failed === 0 &&
      totals.passed === totals.cases &&
      typeof totals.cases === "number" &&
      totals.cases > 0
    ) {
      const name = String(entry.library || "").trim();
      if (name) {
        validating.add(name);
      }
    }
  }
  return validating;
}

function applyValidatorFilter(text, validating) {
  const sectionPattern = /(^## Ports\n\n[\s\S]*?)(?=^## )/m;
  const sectionMatch = `${text}\n## __END__`.match(sectionPattern);
  if (!sectionMatch) {
    throw new Error("Unable to locate Ports section in contents.md");
  }
  const originalSection = sectionMatch[1];

  const lines = originalSection.split("\n");
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (
      lines[i].trim().startsWith("|") &&
      lines[i + 1] &&
      isTableSeparatorLine(lines[i + 1])
    ) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) {
    throw new Error("Unable to locate Ports table in contents.md");
  }

  let endIndex = headerIndex + 2;
  while (endIndex < lines.length && lines[endIndex].trim().startsWith("|")) {
    endIndex += 1;
  }

  const dataRows = lines.slice(headerIndex + 2, endIndex);
  const filteredRows = [];
  const inProgress = [];
  const stageOrder = ["recon", "setup", "port", "test"];
  const stats = {
    sessions: 0,
    totalTokens: 0,
    reconTokens: 0,
    setupTokens: 0,
    portTokens: 0,
    testTokens: 0,
    agentHours: 0,
    totalUnsafe: 0,
    abiUnsafe: 0,
    otherUnsafe: 0,
    count: 0
  };

  for (const row of dataRows) {
    const cells = parseTableRow(row);
    const libraryName = stripBacktickName(cells[0] || "");
    if (!validating.has(libraryName)) {
      const completedStage = stripBacktickName(cells[1] || "");
      const stageMatch = completedStage.match(/^0?(\d)-(\w+)$/);
      let nextStage = "recon";
      if (stageMatch) {
        const completedNum = Number.parseInt(stageMatch[1], 10);
        nextStage = stageOrder[completedNum] || "test";
      }
      inProgress.push({ name: libraryName, stage: nextStage });
      continue;
    }
    filteredRows.push(row);
    stats.count += 1;
    stats.sessions += parseTableNumber(cells[2]);
    stats.totalTokens += parseTableNumber(cells[3]);
    stats.reconTokens += parseTableNumber(cells[4]);
    stats.setupTokens += parseTableNumber(cells[5]);
    stats.portTokens += parseTableNumber(cells[6]);
    stats.testTokens += parseTableNumber(cells[7]);
    stats.agentHours += parseTableNumber(cells[8]);
    stats.totalUnsafe += parseTableNumber(cells[10]);
    stats.abiUnsafe += parseTableNumber(cells[11]);
    stats.otherUnsafe += parseTableNumber(cells[12]);
  }

  inProgress.sort((a, b) => {
    const ai = stageOrder.indexOf(a.stage);
    const bi = stageOrder.indexOf(b.stage);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  if (filteredRows.length === 0) {
    throw new Error(
      "Validator filter removed every Port Effort Stats row; refusing to render an empty table"
    );
  }

  const updatedLines = [
    ...lines.slice(0, headerIndex + 2),
    ...filteredRows,
    ...lines.slice(endIndex)
  ];
  const filteredSection = updatedLines.join("\n");

  const tokens = {
    validating_count: String(stats.count),
    total_sessions: formatThousands(stats.sessions),
    total_tokens_b: formatBillions(stats.totalTokens),
    total_agent_hours: stats.agentHours.toFixed(1),
    recon_tokens_b: formatBillions(stats.reconTokens),
    setup_tokens_b: formatBillions(stats.setupTokens),
    port_tokens_b: formatBillions(stats.portTokens),
    test_tokens_b: formatBillions(stats.testTokens),
    total_unsafe: formatThousands(stats.totalUnsafe),
    abi_unsafe: formatThousands(stats.abiUnsafe),
    other_unsafe: formatThousands(stats.otherUnsafe),
    abi_unsafe_pct: percent(stats.abiUnsafe, stats.totalUnsafe),
    other_unsafe_pct: percent(stats.otherUnsafe, stats.totalUnsafe)
  };

  let finalText = text.replace(originalSection, filteredSection);
  finalText = finalText.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(tokens, key)) {
      return tokens[key];
    }
    throw new Error(`Unknown placeholder ${match} in contents.md`);
  });
  return { text: finalText, tokens: { ...tokens, in_progress: inProgress } };
}

function isTableSeparatorLine(line) {
  if (!line || !line.trim().startsWith("|")) {
    return false;
  }
  const cells = parseTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function stripBacktickName(cell) {
  return String(cell).replace(/`/g, "").trim();
}

function parseTableNumber(cell) {
  if (cell == null) {
    return 0;
  }
  const trimmed = String(cell).trim();
  if (!trimmed || trimmed === "-") {
    return 0;
  }
  const cleaned = trimmed.replace(/,/g, "").replace(/[Mh]$/, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function formatThousands(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatBillions(valueInM) {
  const billions = valueInM / 1000;
  return billions.toFixed(2);
}

function percent(part, total) {
  if (!total) {
    return "0.0";
  }
  return ((part * 100) / total).toFixed(1);
}
