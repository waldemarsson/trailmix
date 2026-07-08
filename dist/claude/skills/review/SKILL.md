---
name: review
description: Waypoint 4 — senior read-only review of the uncommitted implementation against spec
  and plan; returns HIGH/MED/LOW findings with a verdict. Dispatches the reviewer agent.
  Use once implementation is complete, not as an entry point for a raw request.
---

# review — catch issues before they cascade

Review the completed work against `spec.md` and `plan.md`, across architecture, code, security,
tests, and style. Read-only — never edit.

## How
- **Dispatch the `reviewer` agent** (strong-tier, read-only; or a general read-only subagent if
  not installed). Commits don't exist yet — it inspects the unstaged diff, staged diff, and
  untracked files (`git status`, `git diff`, `git diff --cached`, and untracked file contents).
  It comments only on code it actually read.
- Pass the reviewer the path to `refs/review-checklist.md` (under this skill's base directory) —
  it holds the dimensions, severity calibration, and report shape. Don't load it into your own
  context; the reviewer reads it.

## Output — `.trailmix/trail/<slug>/review.md`
Scaffold the file with `trail.mjs new <slug> review` (correct `waypoint: review`, `status: draft`
frontmatter; see `trailhead/refs/trail-metadata.md`), then write the reviewer's returned
report as the body verbatim — the report *is* the artifact; transcribe it, don't rewrite it.
(This artifact necessarily transits chat once — the reviewer is read-only and can't write it.)

## Checkpoint
The human picks which findings to fix (e.g. `H1, M2`). Selected fixes go back through
`implement` (apply exactly those, verify each). Then `document`.
