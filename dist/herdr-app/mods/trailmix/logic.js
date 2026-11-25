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
// The argv shim keeps trail.mjs's direct-run guard (realpathSync(argv[1])) from firing.
export function loaderFor(source) {
  const url = JSON.stringify(encodeURIComponent(source));
  return `const a=process.argv.slice(1);process.argv=[process.argv[0],process.execPath];const m=await import("data:text/javascript,"+${url});process.exitCode=m.run(a);`;
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

// exec rejected (can't start, no such folder, unreachable machine, timeout).
export function execError(err, { machine, node }) {
  const msg = firstLine(err?.message ?? err);
  if (/cannot start/i.test(msg) && /not found/i.test(msg)) return `${node} not found on ${machineLabel(machine)} — set the \`node\` setting`;
  return `${machineLabel(machine)}: ${msg || "exec failed"}`;
}

export function groupTrails(trails) {
  const count = (s) => trails.filter((t) => t.state === s).length;
  return { open: trails.filter((t) => t.state !== "done" && t.state !== "dropped"), done: count("done"), dropped: count("dropped") };
}

export const isCheckpoint = (next) => CHECKPOINTS.some((c) => String(next ?? "").startsWith(c));

export function stripFrontmatter(text) {
  return String(text ?? "").replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "");
}

// Fires once per checkpoint entry per trail, keyed by machine+folder+slug so spaces sharing a
// folder notify once. The first result for a folder only seeds; a trail re-arms once it leaves
// the checkpoint. `working`: an agent there is working, so the human isn't needed yet.
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
