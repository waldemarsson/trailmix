---
name: build
description: Waypoint 2 — autonomously turn an approved brief into verified, self-reviewed,
  documented code: plan tasks, implement TDD-style, review, fix findings, update docs. No human
  checkpoint inside; stops only for real blockers. Use once the discuss checkpoint is signed off,
  not as an entry point for a raw request.
---

# build — brief in, verified change out

Run the whole build without the human. They answer blockers only; their next checkpoint is
`handoff`. Keep the main context clean: subagents do the work and return GORP; read
diffs from `git diff`, not from their messages.

Helper: `${CLAUDE_PLUGIN_ROOT}/skills/trailhead/refs/trail.mjs` — the host fills in the
path; use it for every `trail.mjs` call below.

**On entry:** the brief is approved (discuss did it at sign-off; see
`trailhead/refs/trail-metadata.md`). Resuming? `trail.mjs status` names the step; tasks
marked `:done` are done — don't redo them or re-read their diffs.

## 1. Plan (internal, no checkpoint)
Fill the brief's `## Build notes`: file map, then tasks (T1, T2…), each an independently testable
deliverable with the contract it exposes, the behaviors to test, and its gate command. Map every
acceptance criterion to a task. Reuse the brief's **Context**; dispatch `explorer` only
for real gaps. Register the ids: `trail.mjs tasks <brief.md> T1 T2 …`. Bug brief: T1 is the red
test, and it fails before any fix exists.

## 2. Implement
Dispatch `implementer` (or a general subagent if not installed) with the brief path and
the resolved `trail.mjs` path. It works the tasks in order, TDD where practical, stamps
`task-done` after each green gate, and verifies per `refs/verification.md` (pass it the path).

## 3. Self-review and fix
Dispatch `reviewer` (read-only) with the brief and the path to `refs/review-checklist.md`.
It returns findings to you; there is no review artifact. Then:
- **Fix every finding with a clear fix inside the brief's scope**, whatever its severity:
  dispatch the implementer with those ids, then a **delta re-review** of only those ids plus
  regression risk in the code they touched.
- **At most 2 fix rounds.** Whatever is still open after that goes to the report.
- **Leave for the human:** judgment calls, scope changes, anything that contradicts a brief
  decision, and fixes the implementer disputed with a technical reason.

## 4. Docs
Dispatch `documenter` with the brief and the diff, plus the paths to
`refs/weight-heuristics.md` and `refs/doc-conventions.md`. It edits the repo's docs by weight,
where zero edits is a valid result, and runs the agent retro. Its edits stay in the diff for the
human to review.

Then go straight to `handoff`.

## Stop and ask: the only pause
Stop only when you can't continue without guessing on something that matters: a requirement that's
ambiguous in a way that changes behavior, a brief decision the code proves wrong, a destructive
or irreversible step, or missing access. Ask one crisp question with a recommended answer. Record
the resolution as a dated line under the brief's `**Amendments:**`. If the approach no longer
holds, `trail.mjs reopen <brief.md>` (back to draft, task progress cleared) and return to
`discuss`: revise the brief in place, drop its stale `## Build notes`, and show a new
digest.

Don't stop for anything you can decide yourself. Note those calls under **Deviations** in the
report instead.
