// Tests for the trail.mjs frontmatter helper. Run with `node --test`.
// Not shipped — lives in build/, outside the copied-verbatim src/skills tree.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

import {
  run,
  setField,
  readFiles,
  frontmatter,
  frontmatterLines,
  newTrail,
  checkFile,
  deriveTrail,
  summarize,
  OPS,
  parseTasks,
  setTasks,
  taskDone,
  parseFindings,
  setFindings,
  findingState,
  reopen,
  setBranch,
} from "../src/skills/trailmix-trailhead/refs/trail.mjs";

const today = new Date().toISOString().slice(0, 10);

function tmp() {
  return mkdtempSync(join(tmpdir(), "trailmix-"));
}
function withFile(content, fn) {
  const dir = tmp();
  const f = join(dir, "brief.md");
  writeFileSync(f, content);
  try {
    return fn(f);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
// Run fn with cwd set to a fresh temp dir (newTrail/status default to cwd-relative .trailmix).
function inTemp(fn) {
  const dir = tmp();
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return fn(dir);
  } finally {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
  }
}

const BRIEF = `---
slug: demo
title: Demo
kind: feature
created: 2026-07-01
waypoint: discuss
status: draft
updated: 2020-01-01
---

# Body

Prose with a --- horizontal rule that must not be read as frontmatter.
`;

// ---- transitions -----------------------------------------------------------------------------
test("approve sets status=approved and bumps updated", () => {
  withFile(BRIEF, (f) => {
    assert.equal(run(["approve", f]), 0);
    const out = readFileSync(f, "utf8");
    assert.match(out, /^status: approved$/m);
    assert.match(out, new RegExp(`^updated: ${today}$`, "m"));
  });
});

test("reopen sends a brief back to draft and clears task progress", () => {
  withFile(BRIEF, (f) => {
    run(["approve", f]);
    setTasks(f, ["T1", "T2"]);
    taskDone(f, "T1");
    assert.equal(run(["reopen", f]), 0);
    const out = readFileSync(f, "utf8");
    assert.match(out, /^status: draft$/m);
    assert.doesNotMatch(out, /^tasks:/m);
    assert.equal(out.split("\n---\n")[1], BRIEF.split("\n---\n")[1]); // body untouched
    // the revised plan registers fresh, with no stale :done marks
    setTasks(f, ["T1", "T2", "T3"]);
    assert.match(readFileSync(f, "utf8"), /^tasks: T1 T2 T3$/m);
  });
});

test("a misspelled command changes nothing and exits non-zero", () => {
  withFile(BRIEF, (f) => {
    const before = readFileSync(f, "utf8");
    assert.equal(run(["aprove", f]), 2); // note the typo
    assert.equal(readFileSync(f, "utf8"), before);
  });
});

test("transitions leave the body byte-for-byte unchanged", () => {
  withFile(BRIEF, (f) => {
    run(["approve", f]);
    assert.equal(readFileSync(f, "utf8").split("\n---\n")[1], BRIEF.split("\n---\n")[1]);
  });
});

test("named ops are idempotent", () => {
  withFile(BRIEF, (f) => {
    run(["approve", f]);
    const once = readFileSync(f, "utf8");
    run(["approve", f]);
    assert.equal(readFileSync(f, "utf8"), once);
  });
});

test("setField refuses a file with no frontmatter instead of corrupting it", () => {
  withFile("# just a body\n", (f) => {
    assert.throws(() => setField(f, "status", "approved"), /no frontmatter/);
  });
});

test("every op maps to a known field", () => {
  for (const [, [field]] of Object.entries(OPS)) assert.equal(field, "status");
});

// ---- drop / branch ---------------------------------------------------------------------------
test("drop sets status=dropped, bumps updated, keeps the body", () => {
  withFile(BRIEF, (f) => {
    assert.equal(run(["drop", f]), 0);
    const out = readFileSync(f, "utf8");
    assert.match(out, /^status: dropped$/m);
    assert.match(out, new RegExp(`^updated: ${today}$`, "m"));
    assert.equal(out.split("\n---\n")[1], BRIEF.split("\n---\n")[1]);
    assert.deepEqual(checkFile(f), []); // dropped is valid on a brief
  });
});

test("drop is undone by approve (tasks kept) or reopen (tasks cleared)", () => {
  withFile(APPROVED_BRIEF, (f) => {
    setTasks(f, ["T1", "T2"]);
    taskDone(f, "T1");
    run(["drop", f]);
    run(["approve", f]);
    assert.match(readFileSync(f, "utf8"), /^status: approved$/m);
    assert.match(readFileSync(f, "utf8"), /^tasks: T1:done T2$/m);
    run(["drop", f]);
    run(["reopen", f]);
    assert.match(readFileSync(f, "utf8"), /^status: draft$/m);
    assert.doesNotMatch(readFileSync(f, "utf8"), /^tasks:/m);
  });
});

test("check flags dropped on a report", () => {
  withFile(REPORT.replace("status: draft", "status: dropped"), (f) => {
    assert.ok(checkFile(f).some((p) => /bad status: dropped/.test(p)));
  });
});

test("branch writes branch:, bumps updated, and replaces on re-run", () => {
  withFile(BRIEF, (f) => {
    assert.equal(run(["branch", f, "feature/x"]), 0);
    let out = readFileSync(f, "utf8");
    assert.match(out, /^branch: feature\/x$/m);
    assert.match(out, new RegExp(`^updated: ${today}$`, "m"));
    assert.deepEqual(checkFile(f), []); // accepted when present
    setBranch(f, "trail/demo");
    out = readFileSync(f, "utf8");
    assert.match(out, /^branch: trail\/demo$/m);
    assert.equal(out.match(/^branch:/gm).length, 1);
    assert.equal(out.split("\n---\n")[1], BRIEF.split("\n---\n")[1]);
  });
});

test("branch survives reopen (same work, same branch)", () => {
  withFile(APPROVED_BRIEF, (f) => {
    setBranch(f, "feature/x");
    reopen(f);
    assert.match(readFileSync(f, "utf8"), /^branch: feature\/x$/m);
  });
});

test("branch rejects a missing or whitespace name; check flags an empty branch", () => {
  withFile(BRIEF, (f) => {
    const before = readFileSync(f, "utf8");
    assert.equal(run(["branch", f]), 2);
    assert.throws(() => setBranch(f, "has space"), /bad branch/);
    assert.equal(readFileSync(f, "utf8"), before);
  });
  withFile(BRIEF.replace("---\n\n", "branch:\n---\n\n"), (f) => {
    assert.ok(checkFile(f).some((p) => /bad branch/.test(p)));
  });
});

test("branch is not required: a brief without it passes check", () => {
  withFile(BRIEF, (f) => assert.deepEqual(checkFile(f), []));
});

// ---- tasks (build progress) --------------------------------------------------------------------
const APPROVED_BRIEF = BRIEF.replace("status: draft", "status: approved");

test("tasks registers ids once and bumps updated", () => {
  withFile(APPROVED_BRIEF, (f) => {
    assert.equal(run(["tasks", f, "T1", "T2", "T3"]), 0);
    const out = readFileSync(f, "utf8");
    assert.match(out, /^tasks: T1 T2 T3$/m);
    assert.match(out, new RegExp(`^updated: ${today}$`, "m"));
    assert.throws(() => setTasks(f, ["T1"]), /already registered/);
  });
});

test("tasks rejects bad and duplicate ids", () => {
  withFile(APPROVED_BRIEF, (f) => {
    assert.throws(() => setTasks(f, ["task-1"]), /bad task id/);
    assert.throws(() => setTasks(f, ["T1", "T1"]), /duplicate/);
  });
});

test("task-done flips one id; unknown id fails loudly; idempotent", () => {
  withFile(APPROVED_BRIEF, (f) => {
    setTasks(f, ["T1", "T2", "T3"]);
    taskDone(f, "T2");
    assert.match(readFileSync(f, "utf8"), /^tasks: T1 T2:done T3$/m);
    taskDone(f, "T2");
    assert.match(readFileSync(f, "utf8"), /^tasks: T1 T2:done T3$/m);
    assert.throws(() => taskDone(f, "T9"), /unknown task id/);
    assert.throws(() => withFile(APPROVED_BRIEF, (g) => taskDone(g, "T1")), /no tasks field/);
  });
});

test("parseTasks rejects a malformed token", () => {
  assert.throws(() => parseTasks("T1 done"), /bad task token/);
  assert.deepEqual(parseTasks("T1:done T2"), [
    { id: "T1", done: true },
    { id: "T2", done: false },
  ]);
});

test("check flags a malformed or empty tasks field", () => {
  withFile(APPROVED_BRIEF.replace("---\n\n", "tasks: T1 nope\n---\n\n"), (f) => {
    assert.ok(checkFile(f).some((p) => /bad tasks/.test(p)));
  });
  withFile(APPROVED_BRIEF, (f) => {
    setTasks(f, ["T1"]);
    assert.deepEqual(checkFile(f), []);
  });
});

// ---- findings (hand-off fix loop) --------------------------------------------------------------
const REPORT = `---
slug: demo
waypoint: handoff
status: draft
updated: 2020-01-01
---

# Report body
`;

test("findings registers ids once; finding flips one state", () => {
  withFile(REPORT, (f) => {
    assert.equal(run(["findings", f, "H1", "M1", "L1"]), 0);
    assert.match(readFileSync(f, "utf8"), /^findings: H1 M1 L1$/m);
    assert.equal(run(["finding", f, "H1", "fixed"]), 0);
    findingState(f, "L1", "wont-fix");
    assert.match(readFileSync(f, "utf8"), /^findings: H1:fixed M1 L1:wont-fix$/m);
    findingState(f, "H1", "open"); // reopen after a bad fix
    assert.match(readFileSync(f, "utf8"), /^findings: H1 M1 L1:wont-fix$/m);
  });
});

test("findings appends new ids and keeps existing states", () => {
  withFile(REPORT, (f) => {
    setFindings(f, ["H1", "M1"]);
    findingState(f, "H1", "fixed");
    assert.deepEqual(setFindings(f, ["H1", "M3"]), ["M3"]); // re-review found M3
    assert.match(readFileSync(f, "utf8"), /^findings: H1:fixed M1 M3$/m);
    assert.deepEqual(setFindings(f, ["M1"]), []); // nothing new: no-op on states
    assert.match(readFileSync(f, "utf8"), /^findings: H1:fixed M1 M3$/m);
  });
});

test("finding rejects unknown ids and states outside the vocabulary", () => {
  withFile(REPORT, (f) => {
    setFindings(f, ["H1"]);
    assert.throws(() => findingState(f, "H2", "fixed"), /unknown finding id/);
    assert.throws(() => findingState(f, "H1", "fixt"), /bad finding state/);
    assert.throws(() => setFindings(f, ["X1"]), /bad finding id/);
  });
});

test("parseFindings: bare id is open; bad token/state fails", () => {
  assert.deepEqual(parseFindings("H1:fixed M2"), [
    { id: "H1", state: "fixed" },
    { id: "M2", state: "open" },
  ]);
  assert.throws(() => parseFindings("Q1"), /bad finding token/);
  assert.throws(() => parseFindings("H1:done"), /bad finding state/);
});

test("check flags a malformed findings field", () => {
  withFile(REPORT.replace("---\n\n", "findings: H1:nope\n---\n\n"), (f) => {
    assert.ok(checkFile(f).some((p) => /bad findings/.test(p)));
  });
});

// ---- new -------------------------------------------------------------------------------------
test("new scaffolds a feature brief with today's dates and valid frontmatter", () => {
  inTemp(() => {
    const f = newTrail("my-feature", "brief", "My Feature");
    assert.match(f, /my-feature\/brief\.md$/);
    const fm = frontmatter(readFileSync(f, "utf8"));
    assert.equal(fm.slug, "my-feature");
    assert.equal(fm.title, "My Feature");
    assert.equal(fm.kind, "feature");
    assert.equal(fm.waypoint, "discuss");
    assert.equal(fm.created, today);
    assert.equal(fm.updated, today);
    assert.equal(fm.status, "draft");
    assert.deepEqual(checkFile(f), []); // scaffold passes its own lint
  });
});

test("new scaffolds a bug brief (same file, kind bug) that passes lint", () => {
  inTemp(() => {
    const f = newTrail("login-500", "bug", "Login 500s");
    assert.match(f, /login-500\/brief\.md$/);
    const fm = frontmatter(readFileSync(f, "utf8"));
    assert.equal(fm.kind, "bug");
    assert.equal(fm.waypoint, "discuss");
    assert.deepEqual(checkFile(f), []);
  });
});

test("new scaffolds a report without title/kind/created", () => {
  inTemp(() => {
    const f = newTrail("f", "report");
    const fm = frontmatter(readFileSync(f, "utf8"));
    assert.equal(fm.waypoint, "handoff");
    assert.equal(fm.kind, undefined);
    assert.equal(fm.title, undefined);
    assert.deepEqual(checkFile(f), []);
  });
});

test("new refuses to clobber an existing artifact", () => {
  inTemp(() => {
    newTrail("f", "brief", "T");
    assert.throws(() => newTrail("f", "brief", "T"), /already exists/);
    assert.throws(() => newTrail("f", "bug", "T"), /already exists/); // one brief per trail
  });
});

test("new rejects a bad slug and an unknown template", () => {
  inTemp(() => {
    assert.throws(() => newTrail("../evil", "brief"), /bad slug/);
    assert.throws(() => newTrail("f", "spec"), /unknown template/); // retired
    assert.throws(() => newTrail("f", "plan"), /unknown template/); // retired
  });
});

// ---- check -----------------------------------------------------------------------------------
test("check flags a misspelled status and a bad date", () => {
  withFile(BRIEF.replace("status: draft", "status: aproved").replace("updated: 2020-01-01", "updated: nope"), (f) => {
    const probs = checkFile(f);
    assert.ok(probs.some((p) => /bad status: aproved/.test(p)));
    assert.ok(probs.some((p) => /bad updated: nope/.test(p)));
  });
});

test("check flags a brief with a bad kind or a retired waypoint", () => {
  withFile(BRIEF.replace("kind: feature", "kind: chore"), (f) => {
    assert.ok(checkFile(f).some((p) => /bad kind: chore/.test(p)));
  });
  withFile(BRIEF.replace("waypoint: discuss", "waypoint: plan"), (f) => {
    assert.ok(checkFile(f).some((p) => /bad waypoint: plan/.test(p)));
  });
});

test("check passes a well-formed anchor", () => {
  withFile(BRIEF, (f) => assert.deepEqual(checkFile(f), []));
});

test("check via run returns non-zero when there are problems", () => {
  withFile(BRIEF.replace("status: draft", "status: bogus"), (f) => {
    assert.equal(run(["check", f]), 1);
  });
});

// ---- status (derive) -------------------------------------------------------------------------
function trail(files) {
  const dir = join(tmp(), "feat");
  mkdirSync(dir, { recursive: true });
  for (const [name, fm] of Object.entries(files)) {
    writeFileSync(join(dir, name), `---\n${fm}\n---\n\nbody\n`);
  }
  return dir;
}
const brief = (status, extra = "") =>
  `slug: feat\ntitle: T\nkind: feature\ncreated: ${today}\nupdated: ${today}\nwaypoint: discuss\nstatus: ${status}${extra}`;
const report = (status, extra = "") => `slug: feat\nwaypoint: handoff\nstatus: ${status}\nupdated: ${today}${extra}`;

test("derive: no brief -> empty, next discuss", () => {
  assert.deepEqual(deriveTrail(trail({})), { slug: "feat", state: "empty", next: "discuss" });
});

test("derive: brief draft -> awaiting sign-off at discuss", () => {
  assert.deepEqual(deriveTrail(trail({ "brief.md": brief("draft") })), {
    slug: "feat",
    state: "in-progress",
    next: "discuss (awaiting sign-off)",
  });
});

test("derive: a reopened brief lands back at discuss, with no stale build progress", () => {
  const d = trail({ "brief.md": brief("approved", "\ntasks: T1:done T2") });
  reopen(join(d, "brief.md"));
  assert.equal(deriveTrail(d).next, "discuss (awaiting sign-off)");
});

test("derive: brief approved, no tasks -> build", () => {
  assert.equal(deriveTrail(trail({ "brief.md": brief("approved") })).next, "build");
});

test("derive: mid-build tasks land on the first open task", () => {
  const d = trail({ "brief.md": brief("approved", "\ntasks: T1:done T2 T3") });
  assert.equal(deriveTrail(d).next, "build (1/3 done, next T2)");
});

test("derive: all task gates green, no report -> build self-review", () => {
  const d = trail({ "brief.md": brief("approved", "\ntasks: T1:done T2:done") });
  assert.equal(deriveTrail(d).next, "build (tasks done, next self-review)");
});

test("derive: tasks on a draft brief don't preempt the discuss checkpoint", () => {
  const d = trail({ "brief.md": brief("draft", "\ntasks: T1:done T2") });
  assert.equal(deriveTrail(d).next, "discuss (awaiting sign-off)");
});

test("derive: draft report -> handoff, with open finding count when any", () => {
  const plain = trail({ "brief.md": brief("approved", "\ntasks: T1:done"), "report.md": report("draft") });
  assert.equal(deriveTrail(plain).next, "handoff (awaiting review)");
  const open = trail({
    "brief.md": brief("approved"),
    "report.md": report("draft", "\nfindings: H1:fixed M1 M2 L1:wont-fix"),
  });
  assert.equal(deriveTrail(open).next, "handoff (awaiting review, 2 open)");
});

test("derive: approved report -> done", () => {
  const d = trail({ "brief.md": brief("approved"), "report.md": report("approved") });
  assert.deepEqual(deriveTrail(d), { slug: "feat", state: "done", next: "—" });
});

test("derive: a bug brief follows the same order", () => {
  const d = trail({ "brief.md": brief("approved").replace("kind: feature", "kind: bug") });
  assert.equal(deriveTrail(d).next, "build");
});

test("summarize prints one line per trail; empty -> no trails yet", () => {
  assert.equal(summarize([]), "no trails yet");
  const line = summarize([trail({ "brief.md": brief("draft") })]);
  assert.match(line, /^feat · in-progress · next: discuss/);
});

test("derive: dropped mid-build -> dropped, next —", () => {
  const d = trail({ "brief.md": brief("dropped", "\ntasks: T1:done T2") });
  assert.deepEqual(deriveTrail(d), { slug: "feat", state: "dropped", next: "—" });
});

test("derive: a dropped brief wins over an approved report", () => {
  const d = trail({ "brief.md": brief("dropped"), "report.md": report("approved") });
  assert.deepEqual(deriveTrail(d), { slug: "feat", state: "dropped", next: "—" });
});

// status CLI: capture stdout/stderr of run() inside a temp cwd with real trail dirs.
function capture(fn) {
  const out = [], err = [];
  const [o, e] = [process.stdout.write, process.stderr.write];
  process.stdout.write = (s) => (out.push(String(s)), true);
  process.stderr.write = (s) => (err.push(String(s)), true);
  try {
    const code = fn();
    return { code, out: out.join(""), err: err.join("") };
  } finally {
    process.stdout.write = o;
    process.stderr.write = e;
  }
}
function seed(trails) {
  for (const [slug, files] of Object.entries(trails)) {
    const dir = join(".trailmix/trail", slug);
    mkdirSync(dir, { recursive: true });
    for (const [name, fm] of Object.entries(files)) writeFileSync(join(dir, name), `---\n${fm}\n---\n`);
  }
}
const MIXED = {
  active: { "brief.md": brief("draft") },
  done1: { "brief.md": brief("approved"), "report.md": report("approved") },
  done2: { "brief.md": brief("approved"), "report.md": report("approved") },
  gone: { "brief.md": brief("dropped") },
};

test("status hides done and dropped trails behind a count line", () => {
  inTemp(() => {
    seed(MIXED);
    const r = capture(() => run(["status"]));
    assert.equal(r.code, 0);
    assert.match(r.out, /^active · in-progress/m);
    assert.doesNotMatch(r.out, /done1|done2|gone/);
    assert.match(r.out, /^2 done, 1 dropped hidden — status --all$/m);
  });
});

test("status prints no count line when nothing is hidden", () => {
  inTemp(() => {
    seed({ active: MIXED.active });
    const r = capture(() => run(["status"]));
    assert.equal(r.out, "active · in-progress · next: discuss (awaiting sign-off)\n");
  });
});

test("status prints the count line alone when everything is hidden", () => {
  inTemp(() => {
    seed({ gone: MIXED.gone });
    assert.equal(capture(() => run(["status"])).out, "1 dropped hidden — status --all\n");
  });
});

test("status --all lists every trail with no count line", () => {
  inTemp(() => {
    seed(MIXED);
    const r = capture(() => run(["status", "--all"]));
    assert.equal(r.code, 0);
    for (const s of ["active", "done1", "done2", "gone"]) assert.match(r.out, new RegExp(`^${s} · `, "m"));
    assert.match(r.out, /^gone · dropped · next: —$/m);
    assert.doesNotMatch(r.out, /hidden/);
  });
});

test("status --all with zero trails -> no trails yet", () => {
  inTemp(() => {
    assert.equal(capture(() => run(["status", "--all"])).out, "no trails yet\n");
    assert.equal(capture(() => run(["status"])).out, "no trails yet\n");
  });
});

test("status <dir> always shows a done or dropped trail", () => {
  inTemp(() => {
    seed(MIXED);
    const r = capture(() => run(["status", ".trailmix/trail/done1", ".trailmix/trail/gone"]));
    assert.equal(r.out, "done1 · done · next: —\ngone · dropped · next: —\n");
  });
});

test("status rejects an unknown flag and a missing named dir", () => {
  inTemp(() => {
    seed(MIXED);
    const flag = capture(() => run(["status", "--al"]));
    assert.equal(flag.code, 2);
    assert.match(flag.err, /usage: trail\.mjs status/);
    const missing = capture(() => run(["status", ".trailmix/trail/nope"]));
    assert.equal(missing.code, 2);
    assert.match(missing.err, /nope/);
  });
});

// ---- read ------------------------------------------------------------------------------------
test("read prints frontmatter lines and ignores a body --- rule", () => {
  withFile(BRIEF, (f) => {
    const out = readFiles([f]);
    assert.match(out, /status: draft/);
    assert.doesNotMatch(out, /horizontal rule/);
  });
});

test("read skips nonexistent paths (unexpanded globs) and reports emptiness", () => {
  assert.equal(readFiles([".trailmix/trail/*/*.md"]), "no trails yet");
});

test("frontmatterLines returns null when there is no block", () => {
  assert.equal(frontmatterLines("# nope\n"), null);
});

// ---- CLI entry -------------------------------------------------------------------------------
test("CLI runs when its path contains a space", () => {
  const dir = join(tmp(), "with space");
  mkdirSync(dir);
  const script = join(dir, "trail.mjs");
  writeFileSync(script, readFileSync(new URL("../src/skills/trailmix-trailhead/refs/trail.mjs", import.meta.url)));
  try {
    const r = spawnSync(process.execPath, [script, "bogus"], { encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /usage: trail\.mjs/);
  } finally {
    rmSync(dirname(dir), { recursive: true, force: true });
  }
});
