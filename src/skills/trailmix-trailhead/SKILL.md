---
name: trailmix-trailhead
description: Entry point for a request to build, add, change, fix, or ship something. Routes
  the work through trailmix's Discuss→Build→Handoff workflow, sizes it, and names the feature.
  Use at the start of a coding task, before diving into code. SKIP for read-only work
  (questions, exploration, debugging investigation) and edits too small to outlive the session —
  those need no trail.
---

# trailhead — route the work

You're about to build, change, fix, or ship something. Don't jump straight to code. Route it
through the trail. (Resuming work from an earlier session, or want an overview? See **Resume a
trail** and **Trail status** below.)

<!-- only:claude -->
Helper: `${CLAUDE_PLUGIN_ROOT}/skills/trailmix-trailhead/refs/trail.mjs` — the host fills in the
path; use it for every `trail.mjs` call below.
<!-- /only -->

## 1. Name the work
Pick a short kebab-case feature slug. Its artifacts live in `.trailmix/trail/<slug>/`. First
trail in a repo: add `.trailmix/` to `.gitignore` unless the human wants trails committed
(shared across machines/teammates).

## 2. Size it
- **No trail** (read-only work, or an edit smaller than the ceremony — typo-class fix, config
  tweak, rename): no slug, no artifacts. Just do it and note that the trail was skipped.
- **Trail** (everything else): the brief scales to the work. A one-line change gets a
  five-line brief and a one-bullet digest; a cross-cutting feature gets the full template. A
  defect in existing behavior (not new behavior) is a **bug** brief: build writes a failing test
  that reproduces it **before** any fix.

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
2. The reported `next` is where to land: `discuss (awaiting sign-off)` or `handoff (awaiting
   review…)` means resume at that pending checkpoint; `build (…)` means continue building at the
   named step.
3. Summarize state in one short block: title, what's approved, open findings if any, what's next.
4. Load the **body of only** the waypoint you're resuming into, then continue from its checkpoint.

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
- Starting build approves the brief; accepting the handoff approves the report (via the
  `trail.mjs approve` helper — a named op, so the status is never typed by hand). Details in
  `refs/trail-metadata.md`.
- Terse prose, lean code, and GORP handoffs are always on (see `AGENTS.md`).
- If a waypoint skill isn't installed yet, follow the phase as described in the table above.
