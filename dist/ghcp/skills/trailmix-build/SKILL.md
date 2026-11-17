---
name: trailmix-build
description: Waypoint 2 — autonomously turn an approved brief into verified, self-reviewed,
  documented code — plan tasks, implement TDD-style, review, fix findings, update docs. No human
  checkpoint inside; stops only for real blockers. Use once the discuss checkpoint is signed off,
  not as an entry point for a raw request.
---

# build — brief in, verified change out

Run the whole build without the human. They answer blockers only; their next checkpoint is
`trailmix-handoff`. Implement, fix findings, and write docs yourself; a fresh-context reviewer
verifies. Post a one-line progress note per milestone, never pause.

**After a compaction:** re-read `<this skill's base dir>/../../AGENTS.md` before continuing —
Copilot CLI doesn't re-inject the always-on core (Security included) after compaction.

**On entry:** the brief is approved (discuss did it at sign-off; see
`trailmix-trailhead/refs/trail-metadata.md`). Resuming? `trail.mjs status` names the step; tasks
marked `:done` are done — don't redo them or re-read their diffs.

## 1. Plan (internal, no checkpoint)
Fill the brief's `## Build notes`: file map, then tasks (T1, T2…), each an independently testable
deliverable with the contract it exposes, the behaviors to test, and its gate command. Map every
acceptance criterion to a task. Reuse the brief's **Context**; dispatch `trailmix-explorer` only
for real gaps. Register the ids: `trail.mjs tasks <brief.md> T1 T2 …`. Bug brief: T1 is the red
test, and it fails before any fix exists.

Keep **Evidence:** under `## Build notes` current. It's your notes on disk: a compacted or
resumed build continues from it, and handoff summarizes it. One terse line each: gate results
(counts + command), `ACn → met | gap`, review findings (`id · clear|judgment [· stop] ·
file:line · what → fixed | escalated | disputed`, with options when not fixed), deviations,
docs touched + why, and anything unverified, `TBD`, or mixed.

**Pre-existing changes:** preserve earlier edits during implementation and docs. A listed
pre-existing file you also change is mixed: record it in **Evidence**; it's wholly in scope.
Other listed pre-existing files stay outside review and the trail's commit scope.

## 2. Implement
Work tasks yourself in order, one at a time; cover every listed behavior with tests, TDD where
practical. Run each task's gate before moving on; only after it is green, stamp
`trail.mjs task-done <brief.md> <Tid>`. Verify per `refs/verification.md` and record **Evidence**.
- Keep changes surgical; don't touch unrelated code. Comments explain *why*, not what code or
  config already says.
- Improve the how freely; never silently change a contract or brief decision — stop and ask.
- Same gate still red after three fix attempts? Stop patching and name the assumption that
  might be wrong.

## 3. Self-review and fix
Dispatch `trailmix-reviewer` (read-only) with the brief and the path to `refs/review-checklist.md`;
name any **Pre-existing changes** as out of scope, except mixed files. Findings come back to you;
there is no review artifact.
- **Fix** every finding with a clear fix inside the brief's scope, any severity: check it
  against the code first, re-run the gate after. Dispute one with a technical reason instead of
  applying it.
- **Re-review:** a fixed HIGH, MEDIUM, or `stop` finding counts only after a delta re-review of
  those ids, the ids still open, and regression risk in code the round touched. A LOW counts
  once its gate is green.
- **Rounds:** another one while the last resolved something; hard ceiling 4. Escalate a fix
  that fails twice, fixes that conflict, or one that needs a scope change.
- **To the human** (report → needs your call): judgment calls, scope changes, anything that
  contradicts a brief decision, disputes, and escalations. A `judgment` `stop` finding is a
  stop-and-ask.

## 4. Docs
Load both `refs/doc-conventions.md` and `refs/weight-heuristics.md` every time and run their
procedure yourself against the brief and fresh diff. Zero edits is valid; edits stay in the diff
for the human.

Then go straight to `trailmix-handoff`.

## Decision rights
Default contract. The brief's **Autonomy** line, when present, overrides it.
- **Decide alone**, preferring the option that's easiest to reverse: internal structure, naming,
  helpers, and refactors inside scope; test design, fixtures, error messages; using existing
  dependencies and patterns; following an existing convention where the brief is silent.
- **Escalate:** public API, CLI, or file-format changes, or anything that breaks callers; new or
  upgraded dependencies; schema or data migrations, or deleting or rewriting data; auth,
  permissions, secrets, trust boundaries; deploy, config, or runtime changes outside the repo.

## Stop and ask: the only pause
Stop only when you can't continue without guessing on something that matters: an escalate-class
decision the brief doesn't settle, a `judgment` finding marked `stop`, a requirement that's
ambiguous in a way that changes behavior, a brief decision the code proves wrong, a destructive
or irreversible step, or missing access. Ask one crisp question with a recommended answer. Record
the resolution as a dated line under the brief's `**Amendments:**`. If the approach no longer
holds, `trail.mjs reopen <brief.md>` (back to draft, task progress cleared) and return to
`trailmix-discuss`: revise the brief in place, drop its stale `## Build notes`, and show a new
digest.

Don't stop for anything you can decide yourself. Record those calls as deviations in
**Evidence**; the report lists them under **Deviations**.

Autopilot fits build: it runs without prompts. Finishing build means handoff — write the report
before signalling completion, and still stop for blockers.
