---
slug: fold-subagents
waypoint: handoff
status: approved
updated: 2026-11-17
---

# Fold implementer and documenter into the main build loop — report

**Result:** Build now implements, fixes review findings, and writes docs in its own loop; the
implementer and documenter are gone (crew: explorer + reviewer), and results land in the brief's
**Evidence** entry. Version 0.13.0. **Verdict:** ready.

## Try it
1. `npm run build && rg -n "documenter|Iron Law|~5 tasks" src build dist README.md` → no hits.
2. Commit, then `npm run verify` → `OK — …` (freshness check needs `dist/` committed).
3. Reinstall the plugin from this branch and run a small trail; watch for: build implementing
   inline, **Evidence** filling under `## Build notes`, reviewer still dispatched, compactions.

## Acceptance criteria → proof
- AC1 → `scripts/verify.sh` minus the freshness block → exit 0; reviewer ran full verify on a committed copy → exit 0
- AC2 → `rg -n documenter src build README.md dist` 0 hits; only `docs/architecture.md:147` rationale
- AC3 → `src/skills/trailmix-build/SKILL.md` §2 inline + craft rules; implementer only under **Fallback only**
- AC3b → build §1 **Evidence** definition; handoff fills report from it; disputes → needs your call
- AC4 → `src/skills/trailmix-handoff/SKILL.md` follow-up loop inline, delta re-review via build §3
- AC5 → `src/skills/trailmix-build/refs/doc-conventions.md` Procedure / Write lean / Rules
- AC6 → `rg -n "Iron Law|~5 tasks|T1–T3 green" src` 0 hits; `verification.md:3` keeps fresh-evidence rule
- AC7 → package.json, plugin.meta.json, dist/ghcp/plugin.json, dist/claude plugin.json, .github marketplace = 0.13.0
- AC8 → `docs/architecture.md` tree, waypoint table, build/handoff rationale, inline-build risk, crew table + dispatch criteria, §10

## Changes
- `src/skills/trailmix-build/SKILL.md` — inline implement/fix/docs, fallback trigger, Evidence entry, craft rules, trims
- `src/skills/trailmix-build/refs/verification.md` — Iron Law framing dropped; records to Evidence
- `src/skills/trailmix-build/refs/doc-conventions.md` — absorbed documenter procedure, write-lean, rules, agent retro
- `src/skills/trailmix-build/refs/weight-heuristics.md` — header: loaded at every docs step
- `src/skills/trailmix-handoff/SKILL.md` — inline follow-ups, report from Evidence, disputes to human, fallback for large change requests
- `src/agents/trailmix-implementer.agent.md` — reframed as fallback worker
- `src/agents/trailmix-documenter.agent.md` — deleted
- `build/maps/models.json` — documenter entry dropped
- `package.json`, `src/meta/plugin.meta.json` — 0.13.0
- `dist/**`, `.github/plugin/marketplace.json` — regenerated

## Deviations from the brief
- T3 (architecture, version) done inline by the orchestrator; the implementer stopped after T2.
- `npm run verify` freshness check can't pass before commit; verified the rest with that block removed.
- M1 and L2 were tagged `judgment` but the brief's Decisions settled them; fixed instead of escalated.

## Self-review
10 findings: 10 fixed in 2 rounds + 1 confirming delta re-review, 0 need your call.
- M1 · fixed, re-review held — handoff fallback contradicted itself and architecture.md
- M2 · fixed, re-review held — Evidence lacked review results and deviations
- M3 · fixed, re-review held — Evidence kept ids only, no what/where
- L1–L7 · fixed — handoff restated build §3; 4-round cap on the human's loop; scope rule invisible to reviewer; mixed-file rule ×3; wrap; "Deviations in the report" during build; fallback scope wording

## Docs
- `docs/architecture.md` — architectural decision: subagents only by context, session-model routing, inline-build compaction risk.
- README unchanged — its claims stay accurate. Agent retro: none (AGENTS.md already covers the freshness gate).

## Verification
- `npm run build` → exit 0
- `scripts/verify.sh` without freshness block → exit 0 ("OK — dist/claude and dist/ghcp are structurally sound plugins…")
- `node --test build/trail.test.mjs` → 57/57 passed
- `trail.mjs check` → 7/7 artifacts valid

## Follow-up (2026-11-17)
Human review against the fold-subagents article; amendment in the brief. **Verdict:** ready.
- GHCP: build and handoff re-read the bundled `AGENTS.md` after a compaction (core + Security);
  Claude build drops the block (CC re-injects on `compact`).
- `trailmix-implementer` deleted with its `models.json` entry and all fallback prose; dispatch
  criteria now: parallel research or fresh-context verification only.
- Report summarizes **Evidence**: template drops Verification (commands move into AC proof) and
  per-finding Self-review lines.
- Prompt audit: build §3 fix loop and `verification.md` rewritten tersely, same rules.
- Self-review: 3 findings (M4, L8, L9), all fixed in 2 delta rounds, 0 need your call.
- Gates: `npm run build` exit 0; `scripts/verify.sh` minus freshness block → OK;
  `node --test build/trail.test.mjs` → 57/57; `git diff --check` exit 0.
