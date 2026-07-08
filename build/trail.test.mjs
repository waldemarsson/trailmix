// Tests for the trail.mjs frontmatter helper. Run with `node --test`.
// Not shipped — lives in build/, outside the copied-verbatim src/skills tree.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
} from "../src/skills/trailmix-trailhead/refs/trail.mjs";

const today = new Date().toISOString().slice(0, 10);

function tmp() {
  return mkdtempSync(join(tmpdir(), "trailmix-"));
}
function withFile(content, fn) {
  const dir = tmp();
  const f = join(dir, "spec.md");
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

const SPEC = `---
slug: demo
title: Demo
created: 2026-07-01
waypoint: discuss
status: draft
document: pending
updated: 2020-01-01
---

# Body

Prose with a --- horizontal rule that must not be read as frontmatter.
`;

// ---- transitions -----------------------------------------------------------------------------
test("approve sets status=approved and bumps updated", () => {
  withFile(SPEC, (f) => {
    assert.equal(run(["approve", f]), 0);
    const out = readFileSync(f, "utf8");
    assert.match(out, /^status: approved$/m);
    assert.match(out, new RegExp(`^updated: ${today}$`, "m"));
  });
});

test("document-skipped sets document=skipped", () => {
  withFile(SPEC, (f) => {
    assert.equal(run(["document-skipped", f]), 0);
    assert.match(readFileSync(f, "utf8"), /^document: skipped$/m);
  });
});

test("a misspelled command changes nothing and exits non-zero", () => {
  withFile(SPEC, (f) => {
    const before = readFileSync(f, "utf8");
    assert.equal(run(["aprove", f]), 2); // note the typo
    assert.equal(readFileSync(f, "utf8"), before);
  });
});

test("transitions leave the body byte-for-byte unchanged", () => {
  withFile(SPEC, (f) => {
    run(["approve", f]);
    assert.equal(readFileSync(f, "utf8").split("\n---\n")[1], SPEC.split("\n---\n")[1]);
  });
});

test("named ops are idempotent", () => {
  withFile(SPEC, (f) => {
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
  for (const [, [field]] of Object.entries(OPS)) assert.ok(["status", "document"].includes(field));
});

// ---- tasks (implement progress) ----------------------------------------------------------------
const PLAN = `---
slug: demo
waypoint: plan
status: approved
updated: 2020-01-01
---

# Plan body
`;

test("tasks registers ids once and bumps updated", () => {
  withFile(PLAN, (f) => {
    assert.equal(run(["tasks", f, "T1", "T2", "T3"]), 0);
    const out = readFileSync(f, "utf8");
    assert.match(out, /^tasks: T1 T2 T3$/m);
    assert.match(out, new RegExp(`^updated: ${today}$`, "m"));
    assert.throws(() => setTasks(f, ["T1"]), /already registered/);
  });
});

test("tasks rejects bad and duplicate ids", () => {
  withFile(PLAN, (f) => {
    assert.throws(() => setTasks(f, ["task-1"]), /bad task id/);
    assert.throws(() => setTasks(f, ["T1", "T1"]), /duplicate/);
  });
});

test("task-done flips one id; unknown id fails loudly; idempotent", () => {
  withFile(PLAN, (f) => {
    setTasks(f, ["T1", "T2", "T3"]);
    taskDone(f, "T2");
    assert.match(readFileSync(f, "utf8"), /^tasks: T1 T2:done T3$/m);
    taskDone(f, "T2");
    assert.match(readFileSync(f, "utf8"), /^tasks: T1 T2:done T3$/m);
    assert.throws(() => taskDone(f, "T9"), /unknown task id/);
    assert.throws(() => withFile(PLAN, (g) => taskDone(g, "T1")), /no tasks field/);
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
  withFile(PLAN.replace("---\n\n", "tasks: T1 nope\n---\n\n"), (f) => {
    assert.ok(checkFile(f).some((p) => /bad tasks/.test(p)));
  });
  withFile(PLAN, (f) => {
    setTasks(f, ["T1"]);
    assert.deepEqual(checkFile(f), []);
  });
});

// ---- new -------------------------------------------------------------------------------------
test("new scaffolds an anchor with today's dates and valid frontmatter", () => {
  inTemp(() => {
    const f = newTrail("my-feature", "spec", "My Feature");
    const fm = frontmatter(readFileSync(f, "utf8"));
    assert.equal(fm.slug, "my-feature");
    assert.equal(fm.title, "My Feature");
    assert.equal(fm.created, today);
    assert.equal(fm.updated, today);
    assert.equal(fm.status, "draft");
    assert.equal(fm.document, "pending");
    assert.deepEqual(checkFile(f), []); // scaffold passes its own lint
  });
});

test("new scaffolds a non-anchor without document/title/created", () => {
  inTemp(() => {
    const fm = frontmatter(readFileSync(newTrail("f", "plan"), "utf8"));
    assert.equal(fm.waypoint, "plan");
    assert.equal(fm.document, undefined);
    assert.equal(fm.title, undefined);
  });
});

test("new refuses to clobber an existing artifact", () => {
  inTemp(() => {
    newTrail("f", "spec", "T");
    assert.throws(() => newTrail("f", "spec", "T"), /already exists/);
  });
});

test("new rejects a bad slug and an unknown template", () => {
  inTemp(() => {
    assert.throws(() => newTrail("../evil", "spec"), /bad slug/);
    assert.throws(() => newTrail("f", "speck"), /unknown template/);
  });
});

// ---- check -----------------------------------------------------------------------------------
test("check flags a misspelled status and a bad date", () => {
  withFile(SPEC.replace("status: draft", "status: aproved").replace("updated: 2020-01-01", "updated: nope"), (f) => {
    const probs = checkFile(f);
    assert.ok(probs.some((p) => /bad status: aproved/.test(p)));
    assert.ok(probs.some((p) => /bad updated: nope/.test(p)));
  });
});

test("check passes a well-formed anchor", () => {
  withFile(SPEC, (f) => assert.deepEqual(checkFile(f), []));
});

test("check via run returns non-zero when there are problems", () => {
  withFile(SPEC.replace("status: draft", "status: bogus"), (f) => {
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
const anchor = (status, document = "pending") =>
  `slug: feat\ntitle: T\ncreated: ${today}\nupdated: ${today}\nwaypoint: discuss\nstatus: ${status}\ndocument: ${document}`;
const nonAnchor = (waypoint, status) => `slug: feat\nwaypoint: ${waypoint}\nstatus: ${status}\nupdated: ${today}`;

test("derive: spec draft -> awaiting sign-off at discuss", () => {
  assert.deepEqual(deriveTrail(trail({ "spec.md": anchor("draft") })), {
    slug: "feat",
    state: "in-progress",
    next: "discuss (awaiting sign-off)",
  });
});

test("derive: spec approved, no plan -> next plan", () => {
  assert.equal(deriveTrail(trail({ "spec.md": anchor("approved") })).next, "plan");
});

test("derive: plan approved -> next implement (artifact-less phase)", () => {
  const d = trail({ "spec.md": anchor("approved"), "plan.md": nonAnchor("plan", "approved") });
  assert.equal(deriveTrail(d).next, "implement");
});

test("derive: mid-implement tasks land on the first open task", () => {
  const d = trail({
    "spec.md": anchor("approved"),
    "plan.md": nonAnchor("plan", "approved") + "\ntasks: T1:done T2 T3",
  });
  assert.equal(deriveTrail(d).next, "implement (1/3 done, next T2)");
});

test("derive: all task gates green -> next review", () => {
  const d = trail({
    "spec.md": anchor("approved"),
    "plan.md": nonAnchor("plan", "approved") + "\ntasks: T1:done T2:done",
  });
  assert.equal(deriveTrail(d).next, "review");
});

test("derive: tasks on a draft plan don't preempt the plan checkpoint", () => {
  const d = trail({
    "spec.md": anchor("approved"),
    "plan.md": nonAnchor("plan", "draft") + "\ntasks: T1:done T2",
  });
  assert.equal(deriveTrail(d).next, "plan (awaiting sign-off)");
});

test("derive: review approved + document pending -> next document", () => {
  const d = trail({
    "spec.md": anchor("approved"),
    "plan.md": nonAnchor("plan", "approved"),
    "review.md": nonAnchor("review", "approved"),
  });
  assert.equal(deriveTrail(d).next, "document");
});

test("derive: all approved + document done -> done", () => {
  const d = trail({
    "spec.md": anchor("approved", "done"),
    "plan.md": nonAnchor("plan", "approved"),
    "review.md": nonAnchor("review", "approved"),
  });
  assert.deepEqual(deriveTrail(d), { slug: "feat", state: "done", next: "—" });
});

test("derive: trivial track spec-plan draft", () => {
  const d = trail({ "spec-plan.md": `slug: feat\ntitle: T\ncreated: ${today}\nupdated: ${today}\nwaypoint: spec-plan\nstatus: draft\ndocument: pending` });
  assert.equal(deriveTrail(d).next, "spec-plan (awaiting sign-off)");
});

test("summarize prints one line per trail; empty -> no trails yet", () => {
  assert.equal(summarize([]), "no trails yet");
  const line = summarize([trail({ "spec.md": anchor("draft") })]);
  assert.match(line, /^feat · in-progress · next: discuss/);
});

// ---- read ------------------------------------------------------------------------------------
test("read prints frontmatter lines and ignores a body --- rule", () => {
  withFile(SPEC, (f) => {
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
