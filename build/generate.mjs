#!/usr/bin/env node
// trailmix generator — neutral src/ -> dist/{claude,ghcp}/
// Zero-dependency. Node >= 16.7 (uses fs.cpSync).
// dist/{claude,ghcp}/ are real, self-contained plugins — the only supported install path is
// each CLI's marketplace/plugin system (see the root .claude-plugin/ and .github/plugin/
// marketplace.json stubs writeRootMarketplaces() emits). No standalone/flat installer.
//
// Emits, per platform:
//   dist/<p>/skills/**            copied verbatim (frontmatter is the portable common subset)
//   dist/<p>/agents/<name>.<ext>  frontmatter transformed (agent name->model, neutral tools->platform)
//   dist/<p>/hooks/hooks.json     SessionStart hook — the one thing actually loaded automatically
//   dist/<p>/AGENTS.md            bundled reference only; not auto-loaded from inside a plugin

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  mkdirSync,
  cpSync,
  renameSync,
} from "node:fs";
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

// Note on read-only agents: neutral specs may carry `readonly: true` (explorer, reviewer). It is
// deliberately NOT emitted — neither platform has a read-only-shell primitive. The explorer is
// read-only by construction (its tools are read/search/web, no shell/edit); the reviewer keeps
// `shell` because it needs `git diff`/`git status`, so its read-only is prompt discipline (spelled
// out in the agent body), not an enforced flag. Emitting a `readonly` field would look meaningful
// while doing nothing, and risks tripping a platform's frontmatter parser.
function renderAgent(data, body, platform, neutralName) {
  if (!models[neutralName]) throw new Error(`no model mapping for agent: ${neutralName}`);
  const model = models[neutralName][platform];
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

// Every trailmix-prefixed skill/agent name this repo defines, longest first so a name that's a
// prefix of another (trailmix-implement/trailmix-implementer, trailmix-review/-reviewer,
// trailmix-document/-documenter) replaces correctly instead of leaving a dangling suffix.
const NAMESPACED_NAMES = [
  "trailmix-discuss",
  "trailmix-document",
  "trailmix-documenter",
  "trailmix-explorer",
  "trailmix-gorp",
  "trailmix-implement",
  "trailmix-implementer",
  "trailmix-lean-code",
  "trailmix-plan",
  "trailmix-review",
  "trailmix-reviewer",
  "trailmix-terse",
  "trailmix-trailhead",
].sort((a, b) => b.length - a.length);

// Claude Code auto-prefixes every skill/agent in a plugin with the plugin's own name
// (`trailmix:discuss`), so the manual `trailmix-` prefix baked into src/ for GHCP's benefit
// (GHCP never auto-namespaces) would double up there. Strip it for CC's dist output only.
function stripNamespace(text) {
  let out = text;
  for (const name of NAMESPACED_NAMES) {
    out = out.split(name).join(name.slice("trailmix-".length));
  }
  return out;
}

function transformTree(dir, transform) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      transformTree(p, transform);
    } else if (entry.name.endsWith(".md")) {
      const content = readFileSync(p, "utf8");
      const out = transform(content);
      if (out !== content) writeFileSync(p, out);
    }
  }
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

// SessionStart hook: injects the full AGENTS.md always-on core as context at every session
// boundary. This is the only always-on delivery mechanism now (no installer writes a root
// CLAUDE.md/AGENTS.md) — matches how Superpowers' SessionStart hook injects its full
// using-superpowers meta-skill rather than a short pointer.
// CC: matcher covers every session-boundary event; plain stdout becomes additionalContext.
// GHCP: sessionStart only covers new/resumed sessions (no clear/compact equivalent to hook);
// output must be the {"additionalContext": ...} JSON shape, from both a bash and a powershell
// script since Copilot CLI runs on Windows too.
function writeHooks(base, platform, message) {
  mkdirSync(join(base, "hooks"), { recursive: true });

  if (platform === "claude") {
    writeFileSync(
      join(base, "hooks/hooks.json"),
      json({
        hooks: {
          SessionStart: [
            {
              matcher: "startup|resume|clear|compact",
              hooks: [{ type: "command", command: `printf '%s' ${shellQuote(message)}` }],
            },
          ],
        },
      })
    );
  } else {
    const contextJson = JSON.stringify({ additionalContext: message });
    writeFileSync(
      join(base, "hooks/hooks.json"),
      json({
        version: 1,
        hooks: {
          sessionStart: [
            {
              type: "command",
              bash: `printf '%s' ${shellQuote(contextJson)}`,
              powershell: `Write-Output '${contextJson.replace(/'/g, "''")}'`,
            },
          ],
        },
      })
    );
  }
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
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
      hooks: "hooks/hooks.json",
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

// Skills are copied verbatim (never frontmatter-parsed), so a malformed SKILL.md would ship
// silently. Assert each one has the portable common-subset keys before we build anything.
function validateSkills() {
  const skillsDir = join(SRC, "skills");
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const p = join(skillsDir, entry.name, "SKILL.md");
    const { data } = parseFrontmatter(readFileSync(p, "utf8"));
    if (!data.name) throw new Error(`skill missing frontmatter 'name': ${p}`);
    if (!data.description) throw new Error(`skill missing frontmatter 'description': ${p}`);
  }
}

function generate() {
  validateSkills();
  rmSync(DIST, { recursive: true, force: true });

  for (const [, p] of Object.entries(PLATFORMS)) {
    const base = join(DIST, p.dir);
    mkdirSync(join(base, "agents"), { recursive: true });

    // skills — copy, then for CC strip the manual trailmix- prefix (plugin auto-namespaces)
    cpSync(join(SRC, "skills"), join(base, "skills"), { recursive: true });
    if (p.dir === "claude") {
      for (const entry of readdirSync(join(base, "skills"))) {
        if (!entry.startsWith("trailmix-")) continue;
        renameSync(join(base, "skills", entry), join(base, "skills", stripNamespace(entry)));
      }
      transformTree(join(base, "skills"), stripNamespace);
    }

    // AGENTS.md — bundled reference copy AND the source of the SessionStart hook's injected
    // content below. Neither CLI auto-loads a file named AGENTS.md/CLAUDE.md from inside an
    // installed plugin, so this file itself never reaches a session; the hook is what's active.
    const agentsMd = readFileSync(join(SRC, "instructions/AGENTS.md"), "utf8");
    const platformAgentsMd = p.dir === "claude" ? stripNamespace(agentsMd) : agentsMd;
    writeFileSync(join(base, "AGENTS.md"), platformAgentsMd);

    // agents — transform frontmatter (and for CC, strip the manual namespace prefix)
    for (const file of readdirSync(join(SRC, "agents"))) {
      if (!file.endsWith(".agent.md")) continue;
      let { data, body } = parseFrontmatter(readFileSync(join(SRC, "agents", file), "utf8"));
      const neutralName = data.name;
      if (p.dir === "claude") {
        data = { ...data, name: stripNamespace(data.name), description: stripNamespace(data.description) };
        body = stripNamespace(body);
      }
      const outName = data.name + p.agentExt;
      writeFileSync(join(base, "agents", outName), renderAgent(data, body, p.dir, neutralName));
    }

    // SessionStart hook — injects the full always-on core (AGENTS.md), since neither CLI
    // auto-loads it from inside a plugin. Same content already computed above for the
    // bundled AGENTS.md copy.
    writeHooks(base, p.dir, platformAgentsMd);

    // plugin manifest + marketplace catalog
    writePackaging(base, p.dir);
  }

  writeRootMarketplaces();
  console.log("generated dist/claude, dist/ghcp, and root marketplace catalogs");
}

generate();
