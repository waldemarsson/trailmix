---
slug: usability-round
waypoint: handoff
status: approved
updated: 2026-11-03
findings: M2:fixed M3:fixed L7:fixed
---

# Usability round — report

**Result:** trailmix now sets up a branch and flags uncommitted changes at sign-off, reports build
progress, splits large builds across sequential implementers, offers commit/push/draft PR at
acceptance, can drop trails, and `status` hides finished ones. **Verdict:** ready, 2 need your call.

## Needs your call
- M2 · `src/skills/trailmix-handoff/SKILL.md:51` — committing a file flagged `mixed` also commits your earlier uncommitted edits in it (brief: mixed files are wholly in scope; edge case: never commit recorded files). Options: keep it and have the commit question name the mixed files (recommended) · exclude mixed files from the commit · ask per file.
- M3 · `src/skills/trailmix-build/SKILL.md:38` vs `:92` (GHCP build only) — "never in parallel" sits next to "parallel subagents (`/fleet`) can take independent tasks". Options: reword the `/fleet` note to read-only work (explorers, reviewers) (recommended) · drop the `/fleet` sentence · keep both.

## Try it
1. `node src/skills/trailmix-trailhead/refs/trail.mjs status` → only open trails, plus `2 done hidden — status --all`.
2. `node src/skills/trailmix-trailhead/refs/trail.mjs status --all` and `status --bogus` (exit 2).
3. On a scratch trail: `new demo brief "Demo"`, then `branch <brief> feature/demo`, `drop <brief>`, `status --all` → `demo · dropped · next: —`; `approve <brief>` undoes it.
4. Read the new prose: discuss digest/sign-off, build §1–2, handoff Acceptance.

## Acceptance criteria → proof
- AC1 → tests: drop, undo via approve/reopen, dropped report flagged, branch write/replace/survives reopen/rejects empty (`build/trail.test.mjs`)
- AC2 → tests: status hide/count/alone/none/`--all`/zero trails/named dir/bad flag/missing dir; dropped mid-build and after approved report
- AC3 → test: branch optional; `trail.mjs check` → 5 artifacts valid
- AC4 → reviewer checked each listed prose item (round 1 and re-review)
- AC5 → 0.12.0 in both files; `npm run verify` OK on a committed copy

## Changes
- `src/skills/trailmix-trailhead/refs/trail.mjs` — `drop` and `branch` ops, `dropped` (brief only, wins in derive), status filtering + count line + `--all`, exit 2 on bad flag / missing dir
- `build/trail.test.mjs` — 16 new tests (41 → 57)
- `src/skills/trailmix-trailhead/SKILL.md`, `refs/trail-metadata.md` — schema, lifecycle, ops, resume branch warning, status view, drop
- `src/skills/trailmix-discuss/SKILL.md` — research-skip rule; git at digest/sign-off (branch proposal/decline, default-branch detection, dirty tree, non-git skip, sign-off order)
- `src/skills/trailmix-discuss/refs/brief-template.md`, `bug-template.md` — **Pre-existing changes** line
- `src/skills/trailmix-build/SKILL.md`, `src/agents/trailmix-implementer.agent.md` — chunked implementers, early stop + `Notes for next:`, progress lines, baseline to reviewer/documenter
- `src/skills/trailmix-handoff/SKILL.md`, `refs/report-template.md` — opt-in commit/push/PR; `mixed` flag in Changes
- `package.json`, `src/meta/plugin.meta.json` — 0.12.0; `dist/` regenerated

## Deviations from the brief
- Discuss skipped explorer research (all touched files were already read in-session) — the new rule, applied to itself.
- Build ran as 2 implementer chunks (T1–T2, T3–T6) — the new split rule, applied to itself.
- Task stamps used the installed 0.11.0 helper, since the src copy was being edited.
- Commit scope for `.trailmix/` narrowed to `.trailmix/trail/<slug>/` so other trails aren't swept in (reviewer: consistent with "only files the trail changed").
- L6 fixed by the orchestrator directly (two-line wording fix).

## Self-review
9 findings: 7 fixed in 2 rounds, 2 need your call.
- M1 · fixed, re-review held — report template had no slot for the `mixed` flag the commit rule relies on
- L1–L6 · fixed — detached-HEAD branch recording, sign-off order, default branch defined in handoff, reflows, duplicate lines cut, stale `status` wording

## Docs
- `README.md` — waypoint table and Resume & status reflect git setup, progress, commit offer, `dropped`, `branch:`, status view
- `docs/architecture.md` — discuss/build/handoff behavior and helper vocabulary
- Agent retro: none

## Verification
- `node --test build/trail.test.mjs` → 57/57 passed
- `node src/skills/trailmix-trailhead/refs/trail.mjs check` → 5 artifacts valid
- `npm run verify` → OK on a committed scratch copy (live tree fails only the freshness check until commit)

## Follow-up (2026-11-03)
- M2 · fixed, re-review held — commit question names `mixed` files and warns they include the human's earlier edits
- M3 · fixed, re-review held — GHCP `/fleet` parallel sentence removed
- L7 (new) · fixed — rewrapped two build/SKILL.md lines over 100 chars
- `node --test build/trail.test.mjs` → 57/57 passed
