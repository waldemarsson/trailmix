// Pure logic for the trailmix mod: no herdr or Node imports, so build/herdr-app.test.mjs can test it.

// Status strings come from trail.mjs deriveTrail; the cross-test in build/herdr-app.test.mjs
// fails if they drift.
const CHECKPOINTS = ["discuss (awaiting sign-off)", "handoff (awaiting review"];

export const machineLabel = (machine) => machine ?? "local";

// `node` setting: a string, or a map keyed by machine name ("local" for this computer).
export function nodeFor(setting, machine) {
  if (typeof setting === "string" && setting) return setting;
  const v = setting && typeof setting === "object" ? setting[machineLabel(machine)] : undefined;
  return typeof v === "string" && v ? v : "node";
}

// trail.mjs travels in argv and runs on the space's machine, so nothing is installed there.
// The argv shim keeps trail.mjs's direct-run guard (realpathSync(argv[1])) from firing; the catch
// mirrors that guard's error line. Only the characters a data: URL can't carry are escaped (`?` too:
// Node ≤20 reads the source from the pathname), which
// keeps the command line well under Windows' 32,767-character cap (encodeURIComponent: +60%).
export function loaderFor(source) {
  const url = JSON.stringify(source.replace(/[%#?\r\n\t]/g, encodeURIComponent));
  return `const a=process.argv.slice(1);process.argv=[process.argv[0],process.execPath];try{const m=await import("data:text/javascript,"+${url});process.exitCode=m.run(a);}catch(e){process.stderr.write("error: "+e.message+"\\n");process.exitCode=1;}`;
}

export const statusArgs = (source) => ["--input-type=module", "-e", loaderFor(source), "status", "--json"];

const firstLine = (s) => String(s ?? "").trim().split(/\r?\n/)[0] || "";

// exec resolved: { trails } on success, { error } otherwise.
export function parseStatus(result) {
  if (result.code !== 0) return { error: `trail.mjs exited ${result.code}${firstLine(result.stderr) ? `: ${firstLine(result.stderr)}` : ""}` };
  try {
    const out = JSON.parse(result.stdout);
    if (Array.isArray(out?.trails)) return { trails: out.trails };
  } catch {}
  return { error: `unexpected trail.mjs output: ${firstLine(result.stdout) || "(empty)"}` };
}

// exec rejected (can't start, no such folder, unreachable machine, timeout). A missing program
// reads "cannot start <program>: …"; a missing cwd reads "cannot start folder <path>: …".
export const cannotStart = (err, program) => firstLine(err?.message ?? err).includes(`cannot start ${program}:`);

export function execError(err, { machine, node }) {
  if (cannotStart(err, node)) return missingNode(machine, node);
  if (cannotStart(err, "sh")) return missingNode(machine);
  return `${machineLabel(machine)}: ${firstLine(err?.message ?? err) || "exec failed"}`;
}

const missingNode = (machine, node = "node") => `${node} not found on ${machineLabel(machine)} — set the \`node\` setting`;

// exec runs without a login shell, so a node from a version manager isn't on its PATH. With no
// `node` setting, the mod retries through sh, which looks where the common managers put it.
const NOT_FOUND = "trailmix: node not found";
// Only version names are word-split, never HOME; they sort numerically with POSIX sort.
const FIND_NODE = `d="$HOME/.nvm/versions/node"; n=$(command -v node) || for c in "$HOME/.volta/bin/node" "$HOME/.local/share/mise/shims/node" "$HOME/.asdf/shims/node" "$HOME/.local/share/fnm/aliases/default/bin/node"; do [ -x "$c" ] && n=$c && break; done; [ -n "$n" ] || for v in $(ls "$d" 2>/dev/null | sort -t. -k1.2,1nr -k2,2nr -k3,3nr); do [ -x "$d/$v/bin/node" ] && n="$d/$v/bin/node" && break; done; [ -n "$n" ] || { echo "${NOT_FOUND}" >&2; exit 127; }; exec "$n" "$@"`;

export const viaShell = (args) => ["-c", FIND_NODE, "sh", ...args];

export function parseShellStatus(result, machine) {
  if (result.code === 127 && String(result.stderr ?? "").includes(NOT_FOUND)) return { error: missingNode(machine) };
  return parseStatus(result);
}

export function groupTrails(trails) {
  const count = (s) => trails.filter((t) => t.state === s).length;
  return { open: trails.filter((t) => t.state !== "done" && t.state !== "dropped"), done: count("done"), dropped: count("dropped") };
}

export const isCheckpoint = (next) => CHECKPOINTS.some((c) => String(next ?? "").startsWith(c));

// A trail's next step as a short pill: tone is a theme color name.
export function statusPill(next) {
  const n = String(next ?? "");
  if (n === "discuss") return { label: "Discussing", tone: "muted" };
  if (n.startsWith("discuss (awaiting sign-off)")) return { label: "Needs sign-off", tone: "blocked" };
  const review = n.match(/^handoff \(awaiting review(?:, (\d+) pending)?\)/);
  if (review) return { label: review[1] ? `Needs review · ${review[1]} pending` : "Needs review", tone: "blocked" };
  if (n === "build") return { label: "Building", tone: "working" };
  if (n.startsWith("build (tasks done")) return { label: "Self-review", tone: "working" };
  const build = n.match(/^build \((\d+\/\d+) done, next (\S+)\)/);
  if (build) return { label: `Building ${build[1]} · ${build[2]}`, tone: "working" };
  return { label: n, tone: "muted" };
}

// Priority order: waiting on you, then building, then the rest; a space by its most urgent
// trail, an unreadable one last.
const RANK = { blocked: 0, working: 1 };
export const trailRank = (next) => RANK[statusPill(next).tone] ?? 2;
export const spaceRank = (open, error) => (error ? 3 : Math.min(2, ...open.map((t) => trailRank(t.next))));

// Herdr gives an auto-docked block a random id, so find it by its mod.
export function findDock(node, mod) {
  if (!node || typeof node !== "object") return null;
  if (node.content?.mod === mod && node.id) return { id: node.id, hidden: node.hidden === true };
  for (const kid of [...(node.children ?? []), ...(node.floating ?? [])]) {
    const hit = findDock(kid, mod);
    if (hit) return hit;
  }
  return null;
}

export function stripFrontmatter(text) {
  return String(text ?? "").replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "");
}

// Fires once per checkpoint entry per trail, keyed by machine+folder+slug so spaces sharing a
// folder notify once. The first result for a folder only seeds; a trail re-arms once it leaves
// the checkpoint. `working`: an agent there is working, so the human isn't needed yet.
// One per panel copy: a new copy seeds again rather than toasting what it never saw arrive.
export function createNotifier() {
  const seen = new Set();
  const fired = new Set();
  return {
    observe({ machine, folder, trails, working }) {
      const base = `${machineLabel(machine)}\0${folder}\0`;
      const seeding = !seen.has(base);
      seen.add(base);
      const at = new Set(trails.filter((t) => isCheckpoint(t.next)).map((t) => base + t.slug));
      for (const k of fired) if (k.startsWith(base) && !at.has(k)) fired.delete(k);
      const out = [];
      for (const t of trails) {
        const k = base + t.slug;
        if (!at.has(k) || fired.has(k) || (!seeding && working)) continue;
        fired.add(k);
        if (!seeding) out.push(t);
      }
      return out;
    },
  };
}

export const toastFor = (trail, space) => ({
  title: `${trail.title || trail.slug} needs you`,
  body: `${space.name} · ${trail.next}`,
  level: "info",
  action: { name: "space.select", args: { id: space.id } },
});
