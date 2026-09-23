---
slug: discuss-build-handoff
title: Restructure to Discuss → Build → Handoff
kind: feature
created: 2026-09-22
updated: 2026-09-22
waypoint: discuss
status: approved
tasks: T1:done T2:done T3:done T4:done
---

# Restructure to Discuss → Build → Handoff — brief

**Goal:** The human no longer reads spec or plan; they discuss, let the agent implement, then
review the result and the PR. Move human checkpoints to where attention actually goes: clearing
uncertainty up front, and reviewing the finished change.

**Decisions:**
- Three waypoints: Discuss → Build → Handoff. The term "waypoint" stays.
- Discuss: parallel research first, then batched clarify rounds (numbered, recommended
  defaults) until nothing is open. Writes `brief.md`. The checkpoint is a digest of at most 5
  bullets.
- `spec.md`, `plan.md`, `spec-plan.md`, `bug.md` and `review.md` are removed. The brief (anchor,
  `kind: feature | bug`) replaces them; the report is the handoff artifact.
- Build is autonomous: it writes internal build notes and tasks into the brief, implements,
  self-reviews, and **fixes review findings itself** (clear, in-scope ones; at most 2 rounds). It
  **updates docs automatically**. It stops only for real blockers.
- Handoff: `report.md` surfaced in chat, with a follow-up loop. The report is **not** a PR body.
- Old-format trails: **support dropped**. No migration and no compatibility reads.
- The trivial track is gone. The brief scales to the work.
- Version 0.7.0 (MINOR: waypoints, artifacts, and `trail.mjs` ops changed).

**Out of scope:** opening PRs, committing on the human's behalf, migrating old trails.

**Acceptance criteria:**
- [ ] AC1: skills are trailhead, discuss, build, handoff (+ terse, lean-code, gorp); plan,
  implement, review, and document are removed
- [ ] AC2: `trail.mjs` vocabulary is brief/bug/report, waypoints discuss/handoff; `status`
  derives discuss → build → handoff → done; the document ops are removed
- [ ] AC3: `npm run verify` is green, and `dist/` is regenerated
- [ ] AC4: docs and README describe the new flow; nothing references removed artifacts

**Context:**
- `src/skills/trailmix-trailhead/refs/trail.mjs` — the vocabulary + derivation owner
- `build/generate.mjs` — `NAMESPACED_NAMES` list must match the skill/agent set

## Build notes
**Tasks:**
- T1: `trail.mjs` + tests · gate `node --test build/trail.test.mjs`
- T2: skills, agents, core instructions, generator names, version · gate `npm run build`
- T3: docs/architecture.md, README.md · gate the stale-reference `rg` comes back empty
- T4: full gate `npm run verify`

**Amendments:**
- 2026-09-22: removed this repo's old `resume-and-status` trail (old format; it fails `check`
  under the new schema, and git history keeps it).
- 2026-09-22: removed `evals/` entirely at the human's request (never used; stale after the
  restructure).
