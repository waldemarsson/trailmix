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
- Load `refs/review-checklist.md` for the dimensions to assess and severity calibration.

## Output — `.trailmix/trail/<slug>/review.md`
GORP findings, each with a stable id: `id · file:line · what → why → fix`. Group HIGH / MEDIUM /
LOW. Include a spec-compliance checklist and a verdict: **Ready to proceed? Yes | No | With
fixes.** No preamble, no sign-off — the report *is* the artifact.

## Checkpoint
The human picks which findings to fix (e.g. `H1, M2`). Selected fixes go back through
`implement` (apply exactly those, verify each). Then `document`.
