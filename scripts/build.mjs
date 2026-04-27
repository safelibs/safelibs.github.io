import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths and config
// ---------------------------------------------------------------------------

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(rootDir, "content");
const srcDir = join(rootDir, "src");
const distDir = join(rootDir, "dist");

const SITE_TITLE = "SafeLibs";
const SITE_TAGLINE = "Memory-safe drop-in replacements";
const SITE_URL = "https://safelibs.github.io/";
const VALIDATOR_LINK = "https://safelibs.org/validator";
const ORG_LINK = "https://github.com/safelibs";

const DEFAULT_VALIDATOR_URL = "https://safelibs.github.io/validator/site-data.json";
const DEFAULT_VALIDATOR_MODE = "port-04-test";
const validatorUrl = process.env.SAFELIBS_VALIDATOR_URL || DEFAULT_VALIDATOR_URL;
const validatorMode = process.env.SAFELIBS_VALIDATOR_MODE || DEFAULT_VALIDATOR_MODE;
const validatorFixturePath = process.env.SAFELIBS_VALIDATOR_FIXTURE;

// ---------------------------------------------------------------------------
// Top-level build
// ---------------------------------------------------------------------------

const validating = await loadValidatingLibraries();
const ports = await loadPorts(validating);

const introHtml = renderMarkdown(await readContent("intro.md"));
const whatsThisHtml = renderMarkdown(await readContent("whats-this.md"));
const howToUseHtml = renderMarkdown(await readContent("how-to-use.md"));
const pipeline = parsePipeline(await readContent("pipeline.md"));
const portsNotesHtml = renderMarkdown(await readContent("ports-notes.md"));
const faqEntries = parseFaqs(await readContent("faqs.md"));
const responsibleHtml = renderMarkdown(await readContent("responsible.md"));
const otherEffortsHtml = renderMarkdown(await readContent("other-efforts.md"));

const tokens = {
  validating_count: String(ports.totals.count),
  total_sessions: formatThousands(ports.totals.sessions),
  total_tokens_b: formatBillions(ports.totals.totalTokens),
  total_agent_hours: ports.totals.agentHours.toFixed(1),
  recon_tokens_b: formatBillions(ports.totals.reconTokens),
  setup_tokens_b: formatBillions(ports.totals.setupTokens),
  port_tokens_b: formatBillions(ports.totals.portTokens),
  test_tokens_b: formatBillions(ports.totals.testTokens),
  total_unsafe: formatThousands(ports.totals.totalUnsafe),
  abi_unsafe: formatThousands(ports.totals.abiUnsafe),
  other_unsafe: formatThousands(ports.totals.otherUnsafe),
  abi_unsafe_pct: percent(ports.totals.abiUnsafe, ports.totals.totalUnsafe),
  other_unsafe_pct: percent(ports.totals.otherUnsafe, ports.totals.totalUnsafe)
};

const html = renderPage({
  introHtml,
  whatsThisHtml,
  howToUseHtml,
  pipeline,
  portsNotesHtml,
  faqEntries: faqEntries.map((entry) => ({
    title: entry.title,
    bodyHtml: renderMarkdown(applyTokens(entry.bodyMd, tokens))
  })),
  responsibleHtml,
  otherEffortsHtml,
  ports,
  tokens
});

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });
await writeFile(join(distDir, "index.html"), html);
await copyFile(join(srcDir, "styles.css"), join(distDir, "styles.css"));
await copyFile(join(srcDir, "script.js"), join(distDir, "script.js"));
await writeFile(join(distDir, ".nojekyll"), "");

// ---------------------------------------------------------------------------
// Content loading
// ---------------------------------------------------------------------------

async function readContent(name) {
  return readFile(join(contentDir, name), "utf8");
}

// ---------------------------------------------------------------------------
// Validator + ports data
// ---------------------------------------------------------------------------

async function loadValidatingLibraries() {
  const data = validatorFixturePath
    ? JSON.parse(await readFile(validatorFixturePath, "utf8"))
    : await fetchValidatorJson(validatorUrl);
  if (data?.schema_version !== 2) {
    throw new Error(
      `Unsupported validator schema_version ${JSON.stringify(data?.schema_version)}; expected 2`
    );
  }
  const proof = (data.proofs || []).find((entry) => entry?.mode === validatorMode);
  if (!proof) {
    throw new Error(`Validator proof for mode ${JSON.stringify(validatorMode)} was not found`);
  }
  const set = new Set();
  for (const entry of proof.libraries || []) {
    const totals = entry?.totals || {};
    if (
      typeof totals.cases === "number" &&
      totals.cases > 0 &&
      totals.failed === 0 &&
      totals.passed === totals.cases
    ) {
      const name = String(entry.library || "").trim();
      if (name) set.add(name);
    }
  }
  return set;
}

async function fetchValidatorJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "safelibs-website" } });
  if (!response.ok) {
    throw new Error(`Failed to fetch validator data from ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

async function loadPorts(validating) {
  const tableMd = await readContent("ports-table.md");
  const { header, rows } = parsePortsTable(tableMd);

  const stageOrder = ["recon", "setup", "port", "test"];
  const validatingRows = [];
  const inProgress = [];
  const totals = {
    count: 0,
    sessions: 0,
    totalTokens: 0,
    reconTokens: 0,
    setupTokens: 0,
    portTokens: 0,
    testTokens: 0,
    agentHours: 0,
    totalUnsafe: 0,
    abiUnsafe: 0,
    otherUnsafe: 0
  };

  for (const row of rows) {
    if (!validating.has(row.library)) {
      const stageMatch = row.completedStage.match(/^0?(\d)-(\w+)$/);
      let nextStage = "recon";
      if (stageMatch) {
        const completedNum = Number.parseInt(stageMatch[1], 10);
        nextStage = stageOrder[completedNum] || "test";
      }
      inProgress.push({ name: row.library, stage: nextStage });
      continue;
    }
    validatingRows.push(row);
    totals.count += 1;
    totals.sessions += row.numbers.sessions;
    totals.totalTokens += row.numbers.totalTokens;
    totals.reconTokens += row.numbers.reconTokens;
    totals.setupTokens += row.numbers.setupTokens;
    totals.portTokens += row.numbers.portTokens;
    totals.testTokens += row.numbers.testTokens;
    totals.agentHours += row.numbers.agentHours;
    totals.totalUnsafe += row.numbers.totalUnsafe;
    totals.abiUnsafe += row.numbers.abiUnsafe;
    totals.otherUnsafe += row.numbers.otherUnsafe;
  }

  if (validatingRows.length === 0) {
    throw new Error("No validating ports — refusing to render an empty table");
  }

  inProgress.sort((a, b) => {
    const ai = stageOrder.indexOf(a.stage);
    const bi = stageOrder.indexOf(b.stage);
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
  });

  return { header, rows: validatingRows, inProgress, totals };
}

function parsePortsTable(text) {
  const lines = text.split("\n").filter((line) => line.trim().startsWith("|"));
  if (lines.length < 3) {
    throw new Error("ports-table.md does not contain a valid markdown table");
  }
  const header = parseTableRow(lines[0]);
  const dataLines = lines.slice(2);
  const rows = [];
  for (const line of dataLines) {
    const cells = parseTableRow(line);
    if (cells.length !== header.length) {
      throw new Error(`ports-table row has ${cells.length} cells, expected ${header.length}`);
    }
    const library = stripBackticks(cells[0]);
    rows.push({
      library,
      completedStage: stripBackticks(cells[1]),
      cells,
      numbers: {
        sessions: parseTableNumber(cells[2]),
        totalTokens: parseTableNumber(cells[3]),
        reconTokens: parseTableNumber(cells[4]),
        setupTokens: parseTableNumber(cells[5]),
        portTokens: parseTableNumber(cells[6]),
        testTokens: parseTableNumber(cells[7]),
        agentHours: parseTableNumber(cells[8]),
        calendarSpan: parseTableNumber(cells[9]),
        totalUnsafe: parseTableNumber(cells[10]),
        abiUnsafe: parseTableNumber(cells[11]),
        otherUnsafe: parseTableNumber(cells[12])
      }
    });
  }
  return { header, rows };
}

// ---------------------------------------------------------------------------
// FAQ + pipeline content shaping
// ---------------------------------------------------------------------------

function parseFaqs(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("### ")) {
    throw new Error("faqs.md must start with a ### heading");
  }
  const sentinel = `${trimmed}\n### __END__`;
  const matches = [...sentinel.matchAll(/^### (.+)\n([\s\S]*?)(?=^### )/gm)];
  if (matches.length === 0) {
    throw new Error("faqs.md has no ### entries");
  }
  return matches.map((match) => ({
    title: match[1].trim(),
    bodyMd: match[2].trim()
  }));
}

function parsePipeline(text) {
  const blocks = parseBlocks(text);
  const olBlock = blocks.find((block) => block.type === "ol");
  if (!olBlock) {
    throw new Error("pipeline.md must contain a numbered list of stages");
  }
  const leadBlocks = blocks.filter((block) => block !== olBlock);
  return {
    leadHtml: renderBlocks(leadBlocks),
    stages: olBlock.items.map((item) => {
      const [head, ...rest] = item.split(" - ");
      return {
        title: head.trim(),
        description: rest.join(" - ").trim()
      };
    })
  };
}

// ---------------------------------------------------------------------------
// Page composition
// ---------------------------------------------------------------------------

function renderPage({
  introHtml,
  whatsThisHtml,
  howToUseHtml,
  pipeline,
  portsNotesHtml,
  faqEntries,
  responsibleHtml,
  otherEffortsHtml,
  ports,
  tokens
}) {
  const metaDescription = truncate(stripHtml(introHtml), 180);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(SITE_TITLE)} | ${escapeHtml(SITE_TAGLINE)}</title>
    <meta name="description" content="${escapeAttribute(metaDescription)}">
    <meta property="og:title" content="${escapeHtml(SITE_TITLE)}">
    <meta property="og:description" content="${escapeAttribute(metaDescription)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeAttribute(SITE_URL)}">
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
      ${renderHeader()}
      <main class="site-main">
        ${renderHero(introHtml)}
        ${renderSection("what", "What's this?", `<article class="what-article">${whatsThisHtml}</article>`)}
        ${renderSection("use", "How do I use this?", `<article class="panel prose">${howToUseHtml}</article>`)}
        ${renderPortsSection(ports, portsNotesHtml, tokens)}
        ${renderPipelineSection(pipeline)}
        ${renderSection("responsible", "Who's responsible?", `<article class="panel prose">${responsibleHtml}</article>`)}
        ${renderSection("other-efforts", "Other efforts", `<article class="panel prose">${otherEffortsHtml}</article>`)}
        ${renderFaqSection(faqEntries)}
      </main>
      <footer class="site-footer">
        <a href="${escapeAttribute(ORG_LINK)}" target="_blank" rel="noreferrer">github.com/safelibs</a>
      </footer>
    </div>
  </body>
</html>
`;
}

function renderHeader() {
  return `
      <header class="site-header">
        <a class="brand" href="#top" aria-label="${escapeHtml(SITE_TITLE)} home">
          <span class="brand-mark">SL</span>
          <span class="brand-copy">
            <strong>${escapeHtml(SITE_TITLE)}</strong>
          </span>
        </a>
        <nav class="top-nav" aria-label="Section navigation">
          <a href="#what">What's this?</a>
          <a href="#use">How do I use this?</a>
          <a href="#ports">What's ported?</a>
          <a href="#pipeline">How's it done?</a>
          <a href="#responsible">Who's responsible?</a>
          <a href="#other-efforts">Other efforts</a>
          <a href="#faq">Other FAQs</a>
        </nav>
      </header>`;
}

function renderHero(introHtml) {
  return `
        <section class="hero" id="top">
          <h1>${escapeHtml(SITE_TITLE)}<span class="beta-badge" aria-label="Beta">BETA</span></h1>
          <div class="hero-copy">
            ${introHtml}
          </div>
        </section>`;
}

function renderSection(id, title, bodyHtml) {
  return `
        <section class="section" id="${escapeAttribute(id)}">
          <div class="section-heading">
            <h2>${title}</h2>
          </div>
          ${bodyHtml}
        </section>`;
}

function renderPortsSection(ports, notesHtml, tokens) {
  const headlineHtml = `
          <p class="ports-headline-line">
            <span class="big-number">${escapeHtml(tokens.validating_count)}</span>
            libraries passing <a href="${escapeAttribute(VALIDATOR_LINK)}" target="_blank" rel="noreferrer">validation</a>.
          </p>`;

  const summaryHtml = `<p>Across the ${escapeHtml(tokens.validating_count)} validating ports so far: <strong>${escapeHtml(tokens.total_sessions)} sessions, ${escapeHtml(tokens.total_tokens_b)}B tokens, ${escapeHtml(tokens.total_agent_hours)} agent-hours</strong>, split ${escapeHtml(tokens.recon_tokens_b)}B recon, ${escapeHtml(tokens.setup_tokens_b)}B setup, ${escapeHtml(tokens.port_tokens_b)}B port, ${escapeHtml(tokens.test_tokens_b)}B test.</p>`;

  const tableHtml = renderPortsTable(ports.header, ports.rows);

  const unsafeLineHtml = `<p><strong>${escapeHtml(tokens.total_unsafe)}</strong> <code>unsafe { ... }</code> blocks across the validating ports — ${escapeHtml(tokens.abi_unsafe)} (${escapeHtml(tokens.abi_unsafe_pct)}%) forced by the C ABI, ${escapeHtml(tokens.other_unsafe)} (${escapeHtml(tokens.other_unsafe_pct)}%) other.</p>`;

  const inProgressHtml = ports.inProgress.length
    ? `
          <div class="in-progress-section">
            <p class="in-progress-line">
              <span class="big-number small">${ports.inProgress.length}</span> more still in progress:
            </p>
            <ul class="in-progress-list">${ports.inProgress
              .map(
                (entry) =>
                  `<li><a class="port-link" href="https://github.com/safelibs/port-${escapeAttribute(entry.name)}" target="_blank" rel="noreferrer"><code>${escapeHtml(entry.name)}</code></a><span class="stage-badge stage-${escapeAttribute(entry.stage)}">${escapeHtml(entry.stage)}</span></li>`
              )
              .join("")}</ul>
          </div>`
    : "";

  return `
        <section class="section" id="ports">
          <div class="section-heading">
            <h2>What's ported?</h2>
          </div>
          ${headlineHtml}
          <div class="ports-article">
            ${summaryHtml}
            ${tableHtml}
            ${unsafeLineHtml}
          </div>${inProgressHtml}
          <details class="notes-block">
            <summary>How to read this table</summary>
            <div class="notes-content">
              ${notesHtml}
            </div>
          </details>
        </section>`;
}

function renderPortsTable(header, rows) {
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
  const numericColumns = new Set(
    header
      .map((cell, index) => ({ heading: stripMarkdown(cell), index }))
      .filter(({ heading }) => numericHeadings.has(heading))
      .map(({ index }) => index)
  );

  const headerHtml = header
    .map(
      (cell, index) =>
        `<th scope="col"${numericColumns.has(index) ? ' class="numeric"' : ""}>${renderInline(cell)}</th>`
    )
    .join("");

  const rowsHtml = rows
    .map(({ cells }) => {
      const tds = cells
        .map((cell, index) => {
          const numericClass = numericColumns.has(index) ? ' class="numeric"' : "";
          if (index === 0) {
            const libName = stripMarkdown(cell);
            const inner = libName
              ? `<a class="port-link" href="https://github.com/safelibs/port-${escapeAttribute(libName)}" target="_blank" rel="noreferrer">${renderInline(cell)}</a>`
              : renderInline(cell);
            return `<th scope="row"${numericClass}>${inner}</th>`;
          }
          return `<td${numericClass}>${renderInline(cell)}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  return `<div class="table-shell"><table class="stats-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

function renderPipelineSection(pipeline) {
  const stagesHtml = pipeline.stages
    .map(
      (stage, index) => `
                  <article class="pipeline-stage">
                    <span class="timeline-index">${String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>${escapeHtml(stage.title)}</h3>
                      <p>${renderInline(stage.description)}</p>
                    </div>
                  </article>`
    )
    .join("");

  return `
        <section class="section" id="pipeline">
          <div class="section-heading">
            <h2>How's it done?</h2>
          </div>
          <article class="panel">
            ${pipeline.leadHtml}
          </article>
          <div class="timeline">${stagesHtml}
          </div>
        </section>`;
}

function renderFaqSection(entries) {
  const itemsHtml = entries
    .map(
      (entry, index) => `
                  <details class="faq-item"${index === 0 ? " open" : ""}>
                    <summary class="faq-summary">${escapeHtml(entry.title)}</summary>
                    <div class="faq-content">
                      ${entry.bodyHtml}
                    </div>
                  </details>`
    )
    .join("");

  return `
        <section class="section" id="faq">
          <div class="section-heading">
            <h2>Other FAQs</h2>
          </div>
          <div class="faq-list">${itemsHtml}
          </div>
        </section>`;
}

// ---------------------------------------------------------------------------
// Markdown parsing + rendering
// ---------------------------------------------------------------------------

function renderMarkdown(text) {
  return renderBlocks(parseBlocks(text));
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

    if (/^### /.test(line)) {
      blocks.push({ type: "h3", content: line.replace(/^### /, "").trim() });
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
      !/^### /.test(lines[index]) &&
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
      switch (block.type) {
        case "p":
          return `<p>${renderInline(block.content)}</p>`;
        case "h3":
          return `<h3>${renderInline(block.content)}</h3>`;
        case "ul":
          return `<ul>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`;
        case "ol":
          return `<ol>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`;
        case "code":
          return `<pre class="terminal-block"><code>${escapeHtml(block.content)}</code></pre>`;
        case "table":
          return renderGenericTable(block);
        default:
          return "";
      }
    })
    .join("");
}

function renderGenericTable(block) {
  const headerHtml = block.header.map((cell) => `<th scope="col">${renderInline(cell)}</th>`).join("");
  const rowsHtml = block.rows
    .map((row) => {
      const tds = row
        .map((cell, cellIndex) =>
          cellIndex === 0
            ? `<th scope="row">${renderInline(cell)}</th>`
            : `<td>${renderInline(cell)}</td>`
        )
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
  return `<div class="table-shell"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

function isTableStart(lines, index) {
  return Boolean(
    lines[index] &&
      lines[index + 1] &&
      /^\|/.test(lines[index].trim()) &&
      isTableSeparatorLine(lines[index + 1])
  );
}

function isTableSeparatorLine(line) {
  if (!line || !line.trim().startsWith("|")) return false;
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

// ---------------------------------------------------------------------------
// Token + utility helpers
// ---------------------------------------------------------------------------

function applyTokens(html, tokens) {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(tokens, key)) {
      throw new Error(`Unknown placeholder ${match} in content`);
    }
    return tokens[key];
  });
}

function stripBackticks(value) {
  return String(value).replace(/`/g, "").trim();
}

function parseTableNumber(cell) {
  if (cell == null) return 0;
  const trimmed = String(cell).trim();
  if (!trimmed || trimmed === "-") return 0;
  const cleaned = trimmed.replace(/,/g, "").replace(/[Mh]$/, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function formatThousands(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatBillions(valueInM) {
  return (valueInM / 1000).toFixed(2);
}

function percent(part, total) {
  if (!total) return "0.0";
  return ((part * 100) / total).toFixed(1);
}

function stripMarkdown(text) {
  return String(text)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
