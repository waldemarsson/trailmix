#!/usr/bin/env node
// trailmix generator — neutral src/ -> dist/{claude,ghcp}/
// Zero-dependency. Node >= 16.7 (uses fs.cpSync).
//
// Emits, per platform:
//   dist/<p>/skills/**            copied verbatim (frontmatter is the portable common subset)
//   dist/<p>/agents/<name>.<ext>  frontmatter transformed (tier->model, neutral tools->platform)
//   dist/<p>/AGENTS.md            copied verbatim (both CLIs read it at the target repo root)

import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const models = JSON.parse(readFileSync(join(ROOT, "build/maps/models.json"), "utf8"));
const tools = JSON.parse(readFileSync(join(ROOT, "build/maps/tools.json"), "utf8"));
const meta = JSON.parse(readFileSync(join(SRC, "meta/plugin.meta.json"), "utf8"));

const PLATFORMS = {
  claude: { dir: "claude", agentExt: ".md" },
  ghcp: { dir: "ghcp", agentExt: ".agent.md" },
};

// --- minimal frontmatter parser (controlled inputs: single-line values, inline arrays) ---
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter");
  const [, fm, body] = m;
  const data = {};
  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    data[key] = parseValue(raw.trim());
  }
  return { data, body: body.replace(/^\r?\n/, "") };
}

function parseValue(raw) {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw.replace(/^["']|["']$/g, "");
}

function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function mapTools(neutral, platform) {
  const out = [];
  for (const t of neutral || []) {
    const entry = tools[t];
    if (!entry) throw new Error(`unknown tool alias: ${t}`);
    out.push(...entry[platform]);
  }
  return out;
}

function renderAgent(data, body, platform) {
  const tier = data.tier || "standard";
  if (!models[tier]) throw new Error(`unknown tier: ${tier}`);
  const model = models[tier][platform];
  const mapped = mapTools(data.tools, platform);
  const lines = ["---", `name: ${data.name}`, `description: ${yamlQuote(data.description)}`];
  if (platform === "claude") {
    lines.push(`tools: ${mapped.join(", ")}`);
  } else {
    lines.push(`tools: [${mapped.map((t) => `"${t}"`).join(", ")}]`);
  }
  lines.push(`model: ${model}`, "---", "", body);
  return lines.join("\n");
}

function json(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

// Root-level marketplace catalogs, so `/plugin marketplace add owner/repo` (which clones the
// whole repo, no subdirectory support) resolves: each entry's relative "source" points into the
// per-platform dist/ dir, which still carries the real plugin.json for that platform.
function writeRootMarketplaces() {
  const owner = { name: meta.author?.name || meta.name };

  mkdirSync(join(ROOT, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(ROOT, ".claude-plugin/marketplace.json"),
    json({
      name: meta.name,
      owner,
      plugins: [{ name: meta.name, source: "./dist/claude", description: meta.description }],
    })
  );

  mkdirSync(join(ROOT, ".github/plugin"), { recursive: true });
  writeFileSync(
    join(ROOT, ".github/plugin/marketplace.json"),
    json({
      name: meta.name,
      owner,
      metadata: { description: meta.description, version: meta.version },
      plugins: [
        {
          name: meta.name,
          description: meta.description,
          version: meta.version,
          source: "./dist/ghcp",
        },
      ],
    })
  );
}

// Emit plugin manifest + marketplace catalog per platform.
// CC:   .claude-plugin/plugin.json           + .claude-plugin/marketplace.json
// GHCP: plugin.json (root)                    + .github/plugin/marketplace.json
// Both marketplaces list this dir as a single plugin with source ".".
function writePackaging(base, platform) {
  const owner = { name: meta.author?.name || meta.name };

  if (platform === "claude") {
    const manifest = {
      name: meta.name,
      description: meta.description,
      version: meta.version,
      author: meta.author,
      license: meta.license,
    };
    if (meta.homepage) manifest.homepage = meta.homepage;
    if (meta.keywords) manifest.keywords = meta.keywords;
    mkdirSync(join(base, ".claude-plugin"), { recursive: true });
    writeFileSync(join(base, ".claude-plugin/plugin.json"), json(manifest));
    writeFileSync(
      join(base, ".claude-plugin/marketplace.json"),
      json({
        name: meta.name,
        owner,
        plugins: [{ name: meta.name, source: ".", description: meta.description }],
      })
    );
  } else {
    const manifest = {
      name: meta.name,
      description: meta.description,
      version: meta.version,
      author: meta.author,
      license: meta.license,
      agents: "agents/",
      skills: "skills/",
    };
    if (meta.homepage) manifest.homepage = meta.homepage;
    if (meta.repository) manifest.repository = meta.repository;
    if (meta.keywords) manifest.keywords = meta.keywords;
    writeFileSync(join(base, "plugin.json"), json(manifest));
    mkdirSync(join(base, ".github/plugin"), { recursive: true });
    writeFileSync(
      join(base, ".github/plugin/marketplace.json"),
      json({
        name: meta.name,
        owner,
        metadata: { description: meta.description, version: meta.version },
        plugins: [
          { name: meta.name, description: meta.description, version: meta.version, source: "." },
        ],
      })
    );
  }
}

function generate() {
  rmSync(DIST, { recursive: true, force: true });

  for (const [, p] of Object.entries(PLATFORMS)) {
    const base = join(DIST, p.dir);
    mkdirSync(join(base, "agents"), { recursive: true });

    // skills — verbatim copy
    cpSync(join(SRC, "skills"), join(base, "skills"), { recursive: true });

    // AGENTS.md — verbatim copy to platform root (install places it at repo root)
    cpSync(join(SRC, "instructions/AGENTS.md"), join(base, "AGENTS.md"));

    // Claude Code reads CLAUDE.md, NOT AGENTS.md. Ship a CLAUDE.md that imports it
    // so the always-on core actually loads (import path is relative to this file).
    if (p.dir === "claude") {
      writeFileSync(join(base, "CLAUDE.md"), "@AGENTS.md\n");
    }

    // agents — transform frontmatter
    for (const file of readdirSync(join(SRC, "agents"))) {
      if (!file.endsWith(".agent.md")) continue;
      const { data, body } = parseFrontmatter(readFileSync(join(SRC, "agents", file), "utf8"));
      const outName = data.name + p.agentExt;
      writeFileSync(join(base, "agents", outName), renderAgent(data, body, p.dir));
    }

    // plugin manifest + marketplace catalog
    writePackaging(base, p.dir);
  }

  writeRootMarketplaces();
  console.log("generated dist/claude, dist/ghcp, and root marketplace catalogs");
}

generate();
