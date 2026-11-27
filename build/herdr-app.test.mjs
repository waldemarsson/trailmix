// Tests for the Herdr app mod's pure logic (src/herdr-app/mods/trailmix/logic.js) and for the
// generated trail-source.js loader. Not shipped. Run: node --test build/herdr-app.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  nodeFor, loaderFor, statusArgs, actionArgs, parseAction, actionsFor, stillApplies, confirmStep, createChangeWatch, closedPill, pillFor, cardFor, parseStatus, parseShellStatus, viaShell, execError, groupTrails, isCheckpoint, statusPill, trailRank, spaceRank, tally, findDock, relocate, stripFrontmatter, createNotifier, toastFor,
} from "../src/herdr-app/mods/trailmix/logic.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRAIL = join(ROOT, "src/skills/trailmix-trailhead/refs/trail.mjs");

const brief = (status, extra = "") =>
  `slug: x\ntitle: Ünïcode · title\nkind: feature\ncreated: 2026-01-01\nupdated: 2026-01-01\nwaypoint: discuss\nstatus: ${status}${extra}`;
const report = (status, extra = "") => `slug: x\nwaypoint: handoff\nstatus: ${status}\nupdated: 2026-01-01${extra}`;
// One fixture trail per phase trail.mjs can derive; `cp` = must the mod treat it as a checkpoint.
const PHASES = {
  "a-empty": { files: {}, cp: false },
  "b-discuss": { files: { "brief.md": brief("draft") }, cp: true },
  "c-build": { files: { "brief.md": brief("approved") }, cp: false },
  "d-build-tasks": { files: { "brief.md": brief("approved", "\ntasks: T1:done T2") }, cp: false },
  "e-build-review": { files: { "brief.md": brief("approved", "\ntasks: T1:done") }, cp: false },
  "f-handoff": { files: { "brief.md": brief("approved"), "report.md": report("draft") }, cp: true },
  "g-handoff-findings": { files: { "brief.md": brief("approved"), "report.md": report("draft", "\nfindings: H1 M1:fixed") }, cp: true },
  "h-done": { files: { "brief.md": brief("approved"), "report.md": report("approved") }, cp: false },
  "i-dropped": { files: { "brief.md": brief("dropped") }, cp: false },
};

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "trailmix-herdr-"));
  for (const [slug, { files }] of Object.entries(PHASES)) {
    const d = join(dir, ".trailmix/trail", slug);
    mkdirSync(d, { recursive: true });
    for (const [name, fm] of Object.entries(files)) writeFileSync(join(d, name), `---\n${fm}\n---\nbody\n`);
  }
  return dir;
}
const inFixture = (fn) => {
  const dir = fixture();
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const direct = (cwd) => execFileSync(process.execPath, [TRAIL, "status", "--json"], { cwd, encoding: "utf8" });

// ---- loader (AC2) ----------------------------------------------------------------------------

test("loader built from the generated trail-source.js matches running trail.mjs directly", async () => {
  const { default: source } = await import("../dist/herdr-app/mods/trailmix/trail-source.js");
  inFixture((cwd) => {
    const viaLoader = execFileSync(process.execPath, statusArgs(source), { cwd, encoding: "utf8" });
    assert.equal(viaLoader, direct(cwd));
    assert.equal(JSON.parse(viaLoader).trails.length, Object.keys(PHASES).length);
  });
});

test("loader in a folder with no trails yields an empty list", () => {
  const cwd = mkdtempSync(join(tmpdir(), "trailmix-herdr-"));
  try {
    const out = execFileSync(process.execPath, statusArgs(readFileSync(TRAIL, "utf8")), { cwd, encoding: "utf8" });
    assert.deepEqual(JSON.parse(out), { trails: [] });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("loader reports a thrown error as one line and exit 1, like a direct run", () => {
  const cwd = mkdtempSync(join(tmpdir(), "trailmix-herdr-"));
  try {
    mkdirSync(join(cwd, ".trailmix"));
    writeFileSync(join(cwd, ".trailmix/trail"), "not a dir");
    const r = spawnSync(process.execPath, statusArgs(readFileSync(TRAIL, "utf8")), { cwd, encoding: "utf8" });
    const d = spawnSync(process.execPath, [TRAIL, "status", "--json"], { cwd, encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.equal(r.stderr, d.stderr);
    assert.match(r.stderr, /^error: \S/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("loader's data: URL keeps the whole source in its path (Node ≤20 reads only the pathname)", () => {
  const source = readFileSync(TRAIL, "utf8");
  const url = new URL("data:text/javascript," + JSON.parse(loaderFor(source).match(/\+("(?:[^"\\]|\\.)*")\)/)[1]));
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
  assert.equal(decodeURIComponent(url.pathname.slice("text/javascript,".length)), source);
});

test("status command line stays under Windows' 32,767-character cap with room to grow", () => {
  const args = statusArgs(readFileSync(TRAIL, "utf8"));
  assert.ok(["node", ...args].join(" ").length < 28000);
  assert.ok(["sh", ...viaShell(args)].join(" ").length < 28000);
});

// ---- cross-test: real trail.mjs output through the matcher ------------------------------------

test("checkpoint matcher agrees with real trail.mjs output at every phase", () => {
  inFixture((cwd) => {
    const { trails } = JSON.parse(direct(cwd));
    const got = Object.fromEntries(trails.map((t) => [t.slug, isCheckpoint(t.next)]));
    assert.deepEqual(got, Object.fromEntries(Object.entries(PHASES).map(([s, p]) => [s, p.cp])));
  });
});

test("statusPill labels every open phase of real trail.mjs output, blocked exactly at checkpoints", () => {
  inFixture((cwd) => {
    const open = JSON.parse(direct(cwd)).trails.filter((t) => t.state !== "done" && t.state !== "dropped");
    assert.ok(open.length);
    for (const t of open) {
      assert.notEqual(statusPill(t.next).label, t.next, t.next);
      assert.equal(statusPill(t.next).tone === "blocked", PHASES[t.slug].cp, t.slug);
    }
  });
});

// ---- node setting ----------------------------------------------------------------------------

test("nodeFor: string applies everywhere", () => {
  assert.equal(nodeFor("/opt/node/bin/node", "vm"), "/opt/node/bin/node");
});

test("nodeFor: map hit by machine name, local key for this computer", () => {
  const s = { vm: "/home/me/.nvm/bin/node", local: "/usr/bin/node" };
  assert.equal(nodeFor(s, "vm"), "/home/me/.nvm/bin/node");
  assert.equal(nodeFor(s, null), "/usr/bin/node");
});

test("nodeFor: map miss, unset, or junk falls back to node", () => {
  assert.equal(nodeFor({ vm: "/x" }, "other"), "node");
  assert.equal(nodeFor(undefined, null), "node");
  assert.equal(nodeFor(42, "vm"), "node");
});

// ---- result parsing and errors ---------------------------------------------------------------

test("parseStatus returns trails on exit 0 with valid JSON", () => {
  assert.deepEqual(parseStatus({ code: 0, stdout: '{"trails":[{"slug":"a"}]}\n', stderr: "" }), { trails: [{ slug: "a" }] });
});

test("parseStatus maps a nonzero exit to its first stderr line", () => {
  assert.deepEqual(parseStatus({ code: 1, stdout: "", stderr: "error: boom\n  at x\n" }), { error: "trail.mjs exited 1: error: boom" });
});

test("parseStatus maps unparsable or wrong-shape stdout to an error", () => {
  assert.deepEqual(parseStatus({ code: 0, stdout: "no trails yet\n", stderr: "" }), { error: "unexpected trail.mjs output: no trails yet" });
  assert.deepEqual(parseStatus({ code: 0, stdout: "{}", stderr: "" }), { error: "unexpected trail.mjs output: {}" });
});

test("execError: hc's missing-program message points at the node setting", () => {
  const e = new Error("cannot start node: No such file or directory (os error 2)");
  assert.equal(execError(e, { machine: "vm", node: "node" }), "node not found on vm — set the `node` setting");
});

test("execError: the app's missing-program message points at the node setting", () => {
  const e = new Error("cannot start /opt/node: program not found");
  assert.equal(execError(e, { machine: null, node: "/opt/node" }), "/opt/node not found on local — set the `node` setting");
});

test("execError: a missing folder is not a node problem", () => {
  const e = new Error("cannot start folder /w: No such file or directory (os error 2)");
  assert.equal(execError(e, { machine: "vm", node: "node" }), "vm: cannot start folder /w: No such file or directory (os error 2)");
});

test("execError: no sh on the machine (Windows) points at the node setting", () => {
  const e = new Error("cannot start sh: program not found");
  assert.equal(execError(e, { machine: "win", node: "node" }), "node not found on win — set the `node` setting");
});

const fakeNode = (path, label) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/bin/sh\necho ${label} "$@"\n`, { mode: 0o755 });
};
const fakeHome = (nodes, { prefix = "tm-home-", volta = false } = {}) => {
  const home = mkdtempSync(join(tmpdir(), prefix));
  for (const v of nodes) fakeNode(join(home, ".nvm/versions/node", v, "bin/node"), v);
  if (volta) fakeNode(join(home, ".volta/bin/node"), "volta");
  // PATH holds only the tools the finder uses, so a system node can't leak in.
  const tools = join(home, "tools");
  mkdirSync(tools);
  for (const t of ["ls", "sort"]) symlinkSync(execFileSync("/bin/sh", ["-c", `command -v ${t}`], { encoding: "utf8" }).trim(), join(tools, t));
  return home;
};
const runShell = (home, args) => spawnSync("/bin/sh", viaShell(args), { encoding: "utf8", env: { HOME: home, PATH: join(home, "tools") } });

test("viaShell: with node off PATH, runs the highest nvm version with the args", () => {
  const home = fakeHome(["v9.0.0", "v24.10.0", "v24.9.3", "v18.2.0"]);
  try {
    const r = runShell(home, ["status", "--json"]);
    assert.equal(r.stdout, "v24.10.0 status --json\n");
    assert.equal(r.status, 0);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("viaShell: finds nvm under a HOME with spaces", () => {
  const home = fakeHome(["v20.0.0"], { prefix: "tm home " });
  try {
    assert.equal(runShell(home, ["a b"]).stdout, "v20.0.0 a b\n");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("viaShell: a version manager's shim wins over nvm", () => {
  const home = fakeHome(["v24.1.0"], { volta: true });
  try {
    assert.equal(runShell(home, ["status"]).stdout, "volta status\n");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("parseShellStatus: a 127 from trail.mjs itself is not the node hint", () => {
  assert.deepEqual(parseShellStatus({ code: 127, stdout: "", stderr: "boom" }, "vm"), { error: "trail.mjs exited 127: boom" });
});

test("viaShell: no node anywhere reads as the node-setting hint", () => {
  const home = fakeHome([]);
  try {
    const r = runShell(home, ["status"]);
    assert.equal(parseShellStatus({ code: r.status, stdout: r.stdout, stderr: r.stderr }, "vm").error, "node not found on vm — set the `node` setting");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("parseShellStatus: a found node's output parses like a direct run", () => {
  assert.deepEqual(parseShellStatus({ code: 0, stdout: '{"trails":[]}', stderr: "" }, "vm"), { trails: [] });
});

test("execError: other rejections name the machine", () => {
  assert.equal(execError(new Error("machine unreachable"), { machine: null, node: "node" }), "local: machine unreachable");
  assert.equal(execError("timed out", { machine: "vm", node: "node" }), "vm: timed out");
});

// ---- grouping --------------------------------------------------------------------------------

test("groupTrails keeps open trails and counts done and dropped", () => {
  const trails = [
    { slug: "a", state: "in-progress" },
    { slug: "b", state: "done" },
    { slug: "c", state: "empty" },
    { slug: "d", state: "dropped" },
    { slug: "e", state: "done" },
  ];
  assert.deepEqual(groupTrails(trails), { open: [trails[0], trails[2]], closed: [trails[1], trails[3], trails[4]], done: 2, dropped: 1 });
});

// ---- frontmatter -----------------------------------------------------------------------------

test("stripFrontmatter removes only the leading block", () => {
  assert.equal(stripFrontmatter("---\nslug: a\n---\n# Title\n\n---\nrule\n"), "# Title\n\n---\nrule\n");
  assert.equal(stripFrontmatter("---\r\nslug: a\r\n---\r\nbody"), "body");
  assert.equal(stripFrontmatter("# no frontmatter\n"), "# no frontmatter\n");
});

// ---- notifier --------------------------------------------------------------------------------

const AT = { slug: "t", title: "T", next: "discuss (awaiting sign-off)" };
const AWAY = { slug: "t", title: "T", next: "build" };
const obs = (n, trails, { working = false, machine = "vm", folder = "/w" } = {}) =>
  n.observe({ machine, folder, trails, working }).map((t) => t.slug);

test("notifier: initial load at a checkpoint does not fire", () => {
  const n = createNotifier();
  assert.deepEqual(obs(n, [AT]), []);
  assert.deepEqual(obs(n, [AT]), []);
});

test("notifier: fires once on entry with no working agent", () => {
  const n = createNotifier();
  obs(n, [AWAY]);
  assert.deepEqual(obs(n, [AT]), ["t"]);
  assert.deepEqual(obs(n, [AT]), []);
});

test("notifier: a trail appearing after load at a checkpoint fires", () => {
  const n = createNotifier();
  obs(n, []);
  assert.deepEqual(obs(n, [AT]), ["t"]);
});

test("notifier: holds while an agent works, fires when it stops", () => {
  const n = createNotifier();
  obs(n, [AWAY]);
  assert.deepEqual(obs(n, [AT], { working: true }), []);
  assert.deepEqual(obs(n, [AT], { working: false }), ["t"]);
});

test("notifier: re-arms after leaving the checkpoint", () => {
  const n = createNotifier();
  obs(n, [AWAY]);
  obs(n, [AT]);
  obs(n, [{ ...AT, next: "handoff (awaiting review)" }]);
  assert.deepEqual(obs(n, [AWAY]), []);
  assert.deepEqual(obs(n, [{ ...AT, next: "handoff (awaiting review, 2 pending)" }]), ["t"]);
});

test("notifier: two spaces on one folder notify once; another machine is separate", () => {
  const n = createNotifier();
  obs(n, [AWAY]);
  obs(n, [AWAY], { machine: null });
  assert.deepEqual(obs(n, [AT]), ["t"]);
  assert.deepEqual(obs(n, [AT]), []);
  assert.deepEqual(obs(n, [AT], { machine: null }), ["t"]);
});

test("toastFor selects the space and falls back to the slug", () => {
  assert.deepEqual(toastFor({ slug: "s", next: "handoff (awaiting review)" }, { id: "p1", name: "trailmix" }), {
    title: "s needs you",
    body: "trailmix · handoff (awaiting review)",
    level: "info",
    action: { name: "space.select", args: { id: "p1" } },
  });
});

test("statusPill: each next step reads as a short label", () => {
  assert.deepEqual(statusPill("discuss"), { label: "Discussing", tone: "muted" });
  assert.deepEqual(statusPill("discuss (awaiting sign-off)"), { label: "Needs sign-off", tone: "blocked" });
  assert.deepEqual(statusPill("build"), { label: "Building", tone: "working" });
  assert.deepEqual(statusPill("build (1/3 done, next T2)"), { label: "Building 1/3 · T2", tone: "working" });
  assert.deepEqual(statusPill("build (tasks done, next self-review)"), { label: "Self-review", tone: "working" });
  assert.deepEqual(statusPill("handoff (awaiting review)"), { label: "Needs review", tone: "blocked" });
  assert.deepEqual(statusPill("handoff (awaiting review, 5 pending)"), { label: "Needs review · 5 pending", tone: "blocked" });
  assert.deepEqual(statusPill("something new"), { label: "something new", tone: "muted" });
});

test("trailRank: waiting on you, then building, then the rest", () => {
  assert.equal(trailRank("handoff (awaiting review, 2 pending)"), 0);
  assert.equal(trailRank("discuss (awaiting sign-off)"), 0);
  assert.equal(trailRank("build (1/3 done, next T2)"), 1);
  assert.equal(trailRank("discuss"), 2);
});

test("spaceRank: a space ranks by its most urgent trail", () => {
  assert.equal(spaceRank([{ next: "discuss" }, { next: "build" }], undefined), 1);
});

test("spaceRank: an unreadable space ranks last", () => {
  assert.equal(spaceRank([], "node not found on vm"), 3);
});

test("findDock: finds the docked block by mod, nested or floating", () => {
  const root = { id: "root", children: [
    { id: "work", children: [{ id: "tabs", content: { mod: "tabs" } }] },
    { id: "b4f1", content: { mod: "trailmix" }, hidden: true },
  ] };
  assert.deepEqual(findDock(root, "trailmix"), { id: "b4f1", hidden: true, inSidebar: false });
  assert.deepEqual(findDock({ id: "r", floating: [{ id: "f", content: { mod: "trailmix" } }] }, "trailmix"), { id: "f", hidden: false, inSidebar: false });
});

test("findDock: no dock or no layout gives null", () => {
  assert.equal(findDock({ id: "r", children: [{ id: "x", content: { mod: "files" } }] }, "trailmix"), null);
  assert.equal(findDock(null, "trailmix"), null);
});

test("tally: counts trails waiting on you and building; the rest don't count", () => {
  const open = ["handoff (awaiting review)", "discuss (awaiting sign-off)", "build (1/3 done, next T2)", "discuss"].map((next) => ({ next }));
  assert.deepEqual(tally(open), { waiting: 2, building: 1 });
  assert.deepEqual(tally([]), { waiting: 0, building: 0 });
});

const mainShape = () => ({ id: "root", type: "row", children: [
  { id: "sidebar", type: "column", children: [{ id: "sidebar-lists", type: "column", children: [
    { id: "spaces", type: "block", content: { mod: "spaces" } }, { id: "agents", type: "block", content: { mod: "agents" } }] }] },
  { id: "work", type: "column", children: [] },
  { id: "b4f1", type: "block", content: { mod: "trailmix" }, size: { px: 300 } },
] });

test("relocate: sidebar moves the block under Agents and drops the right column", () => {
  const root = mainShape();
  const moved = relocate(root, "trailmix", "sidebar");
  assert.deepEqual(moved.children.map((n) => n.id), ["sidebar", "work"]);
  assert.deepEqual(moved.children[0].children[0].children.map((n) => n.id), ["spaces", "agents", "trailmix"]);
  assert.deepEqual(findDock(moved, "trailmix"), { id: "trailmix", hidden: false, inSidebar: true });
  assert.equal(root.children.length, 3, "input layout is not mutated");
});

test("relocate: null removes the block, wherever it is", () => {
  const gone = relocate(relocate(mainShape(), "trailmix", "sidebar"), "trailmix", null);
  assert.deepEqual(gone.children.map((n) => n.id), ["sidebar", "work"]);
  assert.deepEqual(gone.children[0].children[0].children.map((n) => n.id), ["spaces", "agents"]);
  assert.equal(findDock(gone, "trailmix"), null);
});

test("relocate: a layout without Herdr's sidebar gives null", () => {
  assert.equal(relocate({ id: "root", type: "row", children: [{ id: "x", content: { mod: "trailmix" } }] }, "trailmix", "sidebar"), null);
});

// ---- actions ---------------------------------------------------------------------------------

const EXPECTED_ACTIONS = {
  "a-empty": ["delete"],
  "b-discuss": ["approve-brief", "drop", "delete"],
  "c-build": ["drop", "delete"],
  "d-build-tasks": ["drop", "delete"],
  "e-build-review": ["drop", "delete"],
  "f-handoff": ["approve-report", "drop", "delete"],
  "g-handoff-findings": ["approve-report", "drop", "delete"],
  "h-done": ["delete"],
  "i-dropped": ["reopen", "delete"],
};

test("actionsFor offers the agreed buttons at every phase of real trail.mjs output", () => {
  inFixture((cwd) => {
    const got = Object.fromEntries(JSON.parse(direct(cwd)).trails.map((t) => [t.slug, actionsFor(t).map((a) => a.op)]));
    assert.deepEqual(got, EXPECTED_ACTIONS);
  });
});

test("actionsFor labels a report approval with its pending findings", () => {
  assert.equal(actionsFor({ slug: "x", state: "in-progress", next: "handoff (awaiting review, 2 pending)" })[0].label, "Approve report · 2 pending");
  assert.equal(actionsFor({ slug: "x", state: "in-progress", next: "handoff (awaiting review)" })[0].label, "Approve report");
});

test("actionsFor offers no delete for a folder name that isn't a slug", () => {
  assert.deepEqual(actionsFor({ slug: "Foo_bar", state: "dropped", next: "—" }).map((a) => a.op), ["reopen"]);
});

test("each action, run through the loader, does what its button says", () => {
  const source = readFileSync(TRAIL, "utf8");
  const read = (cwd, slug, f) => readFileSync(join(cwd, ".trailmix/trail", slug, f), "utf8");
  inFixture((cwd) => {
    const runOp = (op, slug) => {
      const r = spawnSync(process.execPath, actionArgs(source, op, slug), { cwd, encoding: "utf8" });
      return parseAction({ code: r.status, stdout: r.stdout, stderr: r.stderr }, null);
    };
    assert.deepEqual(runOp("approve-brief", "b-discuss"), { ok: true });
    assert.match(read(cwd, "b-discuss", "brief.md"), /^status: approved$/m);
    assert.deepEqual(runOp("approve-report", "f-handoff"), { ok: true });
    assert.match(read(cwd, "f-handoff", "report.md"), /^status: approved$/m);
    assert.deepEqual(runOp("drop", "c-build"), { ok: true });
    assert.match(read(cwd, "c-build", "brief.md"), /^status: dropped$/m);
    assert.deepEqual(runOp("reopen", "i-dropped"), { ok: true });
    assert.match(read(cwd, "i-dropped", "brief.md"), /^status: draft$/m);
    assert.deepEqual(runOp("delete", "h-done"), { ok: true });
    assert.equal(existsSync(join(cwd, ".trailmix/trail/h-done")), false);
    assert.match(runOp("delete", "h-done").error, /^trail\.mjs exited 1: error: delete: no such trail: h-done$/);
  });
});

test("statusArgs with a trail dir reports just that trail", () => {
  const source = readFileSync(TRAIL, "utf8");
  inFixture((cwd) => {
    const out = JSON.parse(execFileSync(process.execPath, statusArgs(source, "i-dropped"), { cwd, encoding: "utf8" }));
    assert.deepEqual(out.trails.map((t) => t.slug), ["i-dropped"]);
  });
});

test("parseAction: node missing behind sh reads as the node-setting hint", () => {
  assert.deepEqual(parseAction({ code: 127, stdout: "", stderr: "trailmix: node not found\n" }, "vm"), { error: "node not found on vm — set the `node` setting" });
});

test("parseAction: a nonzero exit gives its first stderr line", () => {
  assert.deepEqual(parseAction({ code: 2, stdout: "", stderr: "usage: trail.mjs delete <slug>\nmore" }, null), { error: "trail.mjs exited 2: usage: trail.mjs delete <slug>" });
});

test("stillApplies refuses an action the trail moved past", () => {
  const dropped = { slug: "x", state: "dropped", next: "—" };
  assert.equal(stillApplies("approve-brief", dropped), false);
  assert.equal(stillApplies("drop", dropped), false);
  assert.equal(stillApplies("reopen", dropped), true);
  assert.equal(stillApplies("reopen", { slug: "x", state: "in-progress", next: "build" }), false);
  assert.equal(stillApplies("delete", undefined), false);
});

test("confirmStep: delete arms on the first click and runs on the second", () => {
  assert.deepEqual(confirmStep(null, "delete"), { run: false, armed: "delete" });
  assert.deepEqual(confirmStep("delete", "delete"), { run: true, armed: null });
});

test("confirmStep: any other action runs at once and disarms delete", () => {
  assert.deepEqual(confirmStep("delete", "drop"), { run: true, armed: null });
  assert.deepEqual(confirmStep(null, "reopen"), { run: true, armed: null });
});

test("change watch ignores the value found at start and reports each new nonce once", () => {
  const w = createChangeWatch({ machine: null, folder: "/old", nonce: 1 });
  assert.equal(w.observe({ machine: null, folder: "/old", nonce: 1 }), null);
  assert.deepEqual(w.observe({ machine: "vm", folder: "/a", nonce: 2 }), { machine: "vm", folder: "/a" });
  assert.equal(w.observe({ machine: "vm", folder: "/a", nonce: 2 }), null);
  assert.equal(w.observe(undefined), null);
});

test("closedPill: done and dropped read as short muted labels", () => {
  assert.deepEqual(closedPill("done"), { label: "Done", tone: "muted" });
  assert.deepEqual(closedPill("dropped"), { label: "Dropped", tone: "dim" });
});

const MIX = [
  { slug: "a", state: "in-progress", next: "build" },
  { slug: "b", state: "done", next: "—" },
  { slug: "c", state: "in-progress", next: "discuss (awaiting sign-off)" },
  { slug: "d", state: "dropped", next: "—" },
];

test("cardFor: Open view lists open trails, counts closed ones, priority puts waiting first", () => {
  const c = cardFor(MIX, undefined, { closedView: false, priority: true });
  assert.deepEqual(c.list.map((t) => t.slug), ["c", "a"]);
  assert.equal(c.show, true);
  assert.equal(c.counts, "1 done · 1 dropped");
  assert.equal(c.rank, 0);
});

test("cardFor: Closed view lists done and dropped in folder order, with no counts", () => {
  const c = cardFor(MIX, undefined, { closedView: true, priority: true });
  assert.deepEqual(c.list.map((t) => t.slug), ["b", "d"]);
  assert.equal(c.counts, "");
  assert.equal(c.rank, 2);
});

test("cardFor: a space with nothing for the view has no card; an error always shows, ranked last", () => {
  const open = [{ slug: "a", state: "in-progress", next: "build" }];
  assert.equal(cardFor(open, undefined, { closedView: true, priority: false }).show, false);
  assert.equal(cardFor([MIX[1]], undefined, { closedView: false, priority: false }).show, false);
  const err = cardFor(undefined, "vm: unreachable", { closedView: true, priority: false });
  assert.deepEqual([err.show, err.list, err.rank], [true, [], 3]);
});

test("pillFor: closed trails by state, open ones by next step", () => {
  assert.equal(pillFor(MIX[1]).label, "Done");
  assert.equal(pillFor(MIX[3]).label, "Dropped");
  assert.equal(pillFor(MIX[2]).label, "Needs sign-off");
});
