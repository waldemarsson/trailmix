---
name: trailmix-trailhead
description: Entry point for a request to build, add, change, fix, or ship something. Routes
  the work through trailmix's Discuss→Build→Handoff workflow, sizes it, and names the feature.
  Use at the start of a coding task, before diving into code. SKIP for read-only work and for
  changes that are both unambiguous and localized — most small work needs no trail.
---

# trailhead — route the work

You're about to build, change, fix, or ship something. First decide whether it needs a trail at
all. (Resuming work from an earlier session, or want an overview? See **Resume a trail** and
**Trail status** below.)

## 1. Size it — default to no trail
A trail pays off only when there's something to clarify, or enough work that an autonomous build
beats doing it inline. Be aggressive about skipping it.

- **No trail**: the intent is unambiguous and the change is localized. For example a small fix
  with a clear cause, a rename, a config or dependency bump, docs, tests only, or a contained
  refactor. No slug, no artifacts. Just do it: test changed behavior, run the relevant checks,
  and say the trail was skipped. A bug fix still gets its failing test first.
- **Trail**: open questions or edge cases to settle, a design choice, several modules or a public
  contract, schema/data migrations, or security-sensitive code. The brief scales to the work. A
  defect in existing behavior is a **bug** brief: build writes a failing test that reproduces it
  **before** any fix.
- **Unsure?** Ask in one line with a recommendation (`Trail or just do it? I'd just do it — one
  file, clear fix.`). Don't guess.

## 2. Name the trail
Trail only. Pick a short kebab-case slug; its artifacts live in `.trailmix/trail/<slug>/`. First
trail in a repo: add `.trailmix/` to `.gitignore` unless the human wants trails committed
(shared across machines/teammates).

## 3. Walk the waypoints
Pull each waypoint skill when you reach it — don't preload them all.

| Waypoint | Skill | Human | Output |
|---|---|---|---|
| Discuss | `trailmix-discuss` | answers clarify rounds, signs off on the digest | `brief.md` |
| Build | `trailmix-build` | nothing, unless the agent hits a blocker | code, tests, docs |
| Handoff | `trailmix-handoff` | reviews the result, picks follow-ups, accepts | `report.md` |

Human attention goes to two places: clearing up uncertainty before build, and reviewing the
result after it. Everything in between runs on its own.

## Resume a trail
A trail survives a fresh session. If a `.trailmix/trail/<slug>/` already exists for this work — or
the human says "resume `<slug>`" — pick it up instead of starting over:
1. Load `refs/trail-metadata.md`; run `trail.mjs status .trailmix/trail/<slug>` to get the
   **derived** resume point (state + next waypoint) from frontmatter only — no bodies, and no
   hand-derivation. (Use `trail.mjs read …/<slug>/*.md` for the raw fields; awk fallback if the
   helper can't run.)
2. The reported `next` is where to land: `discuss` or `discuss (awaiting sign-off)` means discuss
   (write or finish the brief, then the digest); `build (…)` means continue building at the
   named step; `handoff (awaiting review…)` means the follow-up loop; `—` (done) means nothing to do.
3. Summarize state in one short block: title, what's approved, open findings if any, what's next.
4. Load the skill of only the waypoint you're resuming into, and the artifact bodies it needs,
   then continue from that step.

## Trail status
To survey trails, run `trail.mjs status` (per `refs/trail-metadata.md`) — it reads frontmatter
only and prints one derived line per trail (`slug · state · next waypoint`), for all trails or a
given one. Falls back to the awk read pass if the helper can't run. This is agent behavior, not a
`trailmix` command; don't load artifact bodies.

## Rules
- Two checkpoints: the discuss digest and the handoff. Pause at both. The human drives them;
  build doesn't pause except for real blockers.
- The signed-off brief is a good point to **clear or restart the session**: it *is* the
  distilled context, and resume lands exactly there. Recommend it after a long discuss; never
  require it.
- Host modes: if the host CLI's own plan mode is active, fold the discuss checkpoint into it —
  one ceremony, brief still written — don't run both rituals.
- Write outputs to disk; keep chat for decisions and short summaries.
- Signing off on the digest approves the brief; accepting the handoff approves the report (via
  the `trail.mjs approve` helper — a named op, so the status is never typed by hand). Details in
  `refs/trail-metadata.md`.
- Terse prose, lean code, and GORP handoffs are always on (see `AGENTS.md`).
- If a waypoint skill isn't installed yet, follow the phase as described in the table above.
