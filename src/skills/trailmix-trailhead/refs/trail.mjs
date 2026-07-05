#!/usr/bin/env node
// trailmix trail helper — deterministic frontmatter ops for trail artifacts.
// Zero-dependency (Node >= 16). Bundled in the plugin and invoked by the trailhead skill; never
// installed on PATH, never a `trailmix` command.
//
// It is a PURE DATA TOOL over trail artifacts. It owns the closed *vocabulary* of the trail
// (statuses, waypoints, templates) so the LLM can never misspell one — it names an intent
// (`approve`, `new … spec`), not a literal. It does NOT own the workflow *rules*: no gates, no
// enforced ordering, no state machine. `status` derives a read-only summary from the same
// vocabulary but blocks nothing. The skill decides *when* to act; this performs the mechanical
// edit/extraction correctly and repeatably. Artifact bodies are left byte-for-byte unchanged.
//
// Usage:
//   node trail.mjs read <file.md> [...]            print each file's frontmatter block
//   node trail.mjs new <slug> <template> [title]   scaffold a trail artifact (frontmatter only)
//   node trail.mjs approve           <file.md>     status -> approved
//   node trail.mjs supersede         <file.md>     status -> superseded
//   node trail.mjs document-done     <anchor.md>   document -> done
//   node trail.mjs document-skipped  <anchor.md>   document -> skipped
//   node trail.mjs check [file.md ...]             lint frontmatter (default: all trails)
//   node trail.mjs status [dir ...]                one line per trail (default: all trails)

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

// ---- the vocabulary, defined once ------------------------------------------------------------
export const OPS = {
  approve: ["status", "approved"],
  supersede: ["status", "superseded"],
  "document-done": ["document", "done"],
  "document-skipped": ["document", "skipped"],
};
export const TEMPLATES = {
  spec: { file: "spec.md", waypoint: "discuss", anchor: true },
  "spec-plan": { file: "spec-plan.md", waypoint: "spec-plan", anchor: true },
  plan: { file: "plan.md", waypoint: "plan", anchor: false },
  review: { file: "review.md", waypoint: "review", anchor: false },
};
const STATUS = ["draft", "approved", "superseded"];
const WAYPOINT = ["discuss", "spec-plan", "plan", "review"]; // artifact-bearing waypoints
const DOC = ["pending", "done", "skipped"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
// Phase order per track (implement + document have no artifact of their own).
const PHASES = {
  full: ["discuss", "plan", "implement", "review", "document"],
  trivial: ["spec-plan", "implement", "review", "document"],
};
const HAS_ARTIFACT = new Set(WAYPOINT);
const TRAILS = ".trailmix/trail";

// Opening `---` line, the block, then a closing `---` line. Only the leading block counts, so a
// `---` thematic break inside the body is never mistaken for frontmatter.
const FM = /^(---\r?\n)([\s\S]*?)(\r?\n---[ \t]*\r?\n?)([\s\S]*)$/;
const today = () => new Date().toISOString().slice(0, 10);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function frontmatterLines(text) {
  const m = text.match(FM);
  return m ? m[2].split(/\r?\n/) : null;
}

// Parse frontmatter into a key->value map (controlled inputs: single-line scalar values).
export function frontmatter(text) {
  const lines = frontmatterLines(text);
  if (!lines) return null;
  const map = {};
  for (const l of lines) {
    const m = l.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}

// ---- read ------------------------------------------------------------------------------------
// Return "<file>: <line>" for each frontmatter line across the given files. Missing files are
// skipped (an unexpanded `*` glob is harmless); none readable -> "no trails yet".
export function readFiles(files) {
  const present = files.filter((f) => existsSync(f));
  if (present.length === 0) return "no trails yet";
  const out = [];
  for (const f of present) {
    const lines = frontmatterLines(readFileSync(f, "utf8"));
    if (lines === null) {
      out.push(`${f}: (no frontmatter)`);
      continue;
    }
    for (const line of lines) if (line.trim()) out.push(`${f}: ${line}`);
  }
  return out.join("\n");
}

// ---- transitions (named ops) -----------------------------------------------------------------
// Set one frontmatter field in place (replace the key line, else append), always bumping
// `updated`. Errors rather than corrupt if the file has no frontmatter. Reached only through a
// named op, so (field, value) is always from OPS.
export function setField(file, field, value) {
  const text = readFileSync(file, "utf8");
  const m = text.match(FM);
  if (!m) throw new Error(`no frontmatter block in ${file}`);
  const [, open, block, close, body] = m;

  const updates = new Map([
    [field, value],
    ["updated", today()],
  ]);
  const lines = block.split(/\r?\n/);
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const k = lines[i].match(/^([A-Za-z_][\w-]*):/);
    if (k && updates.has(k[1])) {
      lines[i] = `${k[1]}: ${updates.get(k[1])}`;
      seen.add(k[1]);
    }
  }
  for (const [k, v] of updates) if (!seen.has(k)) lines.push(`${k}: ${v}`);
  writeFileSync(file, open + lines.join("\n") + close + body);
}

// ---- new (scaffold) --------------------------------------------------------------------------
// Create <slug>/<template>.md with a correct frontmatter block (dates, slug, waypoint, initial
// status/document) — the creation-time misspelling surface, owned here. Writes frontmatter only;
// the skill fills the body from its template ref. Refuses to clobber an existing artifact.
export function newTrail(slug, template, title) {
  if (!SLUG.test(slug)) throw new Error(`bad slug: ${slug} (kebab-case: a-z 0-9 -)`);
  const t = TEMPLATES[template];
  if (!t) throw new Error(`unknown template: ${template} (use ${Object.keys(TEMPLATES).join(" | ")})`);
  const dir = join(TRAILS, slug);
  const file = join(dir, t.file);
  if (existsSync(file)) throw new Error(`already exists: ${file}`);
  const d = today();
  const fm = t.anchor
    ? [`slug: ${slug}`, `title: ${title || "<title>"}`, `created: ${d}`, `updated: ${d}`, `waypoint: ${t.waypoint}`, "status: draft", "document: pending"]
    : [`slug: ${slug}`, `waypoint: ${t.waypoint}`, "status: draft", `updated: ${d}`];
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, `---\n${fm.join("\n")}\n---\n`);
  return file;
}

// ---- check (lint) ----------------------------------------------------------------------------
// Validate one artifact's frontmatter against the schema. Returns an array of "<file>: <problem>"
// (empty = clean). Pure validation — no workflow rules.
export function checkFile(file) {
  const fm = frontmatter(readFileSync(file, "utf8"));
  if (!fm) return [`${file}: no frontmatter`];
  const probs = [];
  const bad = (label, val, ok) => { if (!ok) probs.push(`${label}: ${val ?? "(missing)"}`); };
  bad("missing slug", fm.slug, !!fm.slug);
  bad("bad status", fm.status, STATUS.includes(fm.status));
  bad("bad waypoint", fm.waypoint, WAYPOINT.includes(fm.waypoint));
  bad("bad updated", fm.updated, DATE.test(fm.updated || ""));
  if (fm.waypoint === "discuss" || fm.waypoint === "spec-plan") {
    bad("missing title", fm.title, !!fm.title);
    bad("bad created", fm.created, DATE.test(fm.created || ""));
    bad("bad document", fm.document, DOC.includes(fm.document));
  }
  return probs.map((p) => `${file}: ${p}`);
}

// ---- status (derive, read-only) --------------------------------------------------------------
// Reconstruct one trail's position from frontmatter alone. Reports the resume point; enforces
// nothing. This is the one derivation that knows phase *order* (structure) — never the *rules*.
export function deriveTrail(dir) {
  const slug = basename(dir);
  const byWp = {};
  let anchorDoc;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const fm = frontmatter(readFileSync(join(dir, f), "utf8"));
    if (!fm) continue;
    if (fm.waypoint) byWp[fm.waypoint] = fm.status;
    if (fm.document !== undefined) anchorDoc = fm.document;
  }
  const phases = PHASES["spec-plan" in byWp ? "trivial" : "full"];
  const present = phases.filter((p) => HAS_ARTIFACT.has(p) && p in byWp);
  if (present.length === 0) return { slug, state: "empty", next: phases[0] };

  // Furthest artifact still draft => its checkpoint is pending; land there.
  let draft = null;
  for (const p of present) if (byWp[p] === "draft") draft = p;
  if (draft) return { slug, state: "in-progress", next: `${draft} (awaiting sign-off)` };

  // All present artifacts signed off => the next phase after the last one present.
  const nextIdx = phases.indexOf(present[present.length - 1]) + 1;
  if (nextIdx >= phases.length) return { slug, state: "done", next: "—" };
  const p = phases[nextIdx];
  if (p === "document") {
    if (anchorDoc === undefined || anchorDoc === "pending") return { slug, state: "in-progress", next: "document" };
    return { slug, state: "done", next: "—" };
  }
  return { slug, state: "in-progress", next: p };
}

export function summarize(dirs) {
  if (dirs.length === 0) return "no trails yet";
  return dirs
    .map((d) => deriveTrail(d))
    .map((t) => `${t.slug} · ${t.state} · next: ${t.next}`)
    .join("\n");
}

// Trail dirs under .trailmix/trail (cwd-relative), sorted. [] if none.
function trailDirs() {
  if (!existsSync(TRAILS)) return [];
  return readdirSync(TRAILS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(TRAILS, e.name))
    .sort();
}
const allArtifacts = () =>
  trailDirs().flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => join(d, f)));

// ---- dispatch --------------------------------------------------------------------------------
// Returns an exit code (never exits) so tests can drive it. A misspelled command falls through to
// the usage error rather than doing anything.
export function run(argv) {
  const [cmd, ...rest] = argv;

  if (cmd === "read") {
    process.stdout.write(readFiles(rest) + "\n");
    return 0;
  }
  if (OPS[cmd]) {
    const [file] = rest;
    if (!file) return usage(`${cmd} <file.md>`);
    const [field, value] = OPS[cmd];
    setField(file, field, value);
    process.stdout.write(`${file} ← ${field}=${value} (updated ${today()})\n`);
    return 0;
  }
  if (cmd === "new") {
    const [slug, template, ...titleWords] = rest;
    if (!slug || !template) return usage("new <slug> <template> [title]");
    process.stdout.write(newTrail(slug, template, titleWords.join(" ") || undefined) + "\n");
    return 0;
  }
  if (cmd === "check") {
    const files = (rest.length ? rest : allArtifacts()).filter((f) => existsSync(f));
    const problems = files.flatMap((f) => checkFile(f));
    if (problems.length) {
      process.stdout.write(problems.join("\n") + "\n");
      return 1;
    }
    process.stdout.write(`ok — ${files.length} artifact(s) valid\n`);
    return 0;
  }
  if (cmd === "status") {
    process.stdout.write(summarize(rest.length ? rest : trailDirs()) + "\n");
    return 0;
  }
  return usage(
    `read <file...> | new <slug> <template> [title] | ${Object.keys(OPS).join(" | ")} <file> | check [file...] | status [dir...]`
  );
}

function usage(s) {
  process.stderr.write(`usage: trail.mjs ${s}\n`);
  return 2;
}

// Only run the CLI when invoked directly, so tests can import the functions above.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(run(process.argv.slice(2)));
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    process.exit(1);
  }
}
