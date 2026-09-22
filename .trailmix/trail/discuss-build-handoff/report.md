---
slug: discuss-build-handoff
waypoint: handoff
status: approved
updated: 2026-09-22
---

# Restructure to Discuss → Build → Handoff — report

**Result:** Five waypoints became three. There are two artifacts (`brief.md`, `report.md`) and two
human checkpoints (the discuss digest and the handoff). **Verdict:** ready.
Committed as 383cb3c; full `npm run verify` → OK.

## Try it
1. `node --test build/trail.test.mjs`
2. `node src/skills/trailmix-trailhead/refs/trail.mjs status`
3. Read `src/skills/trailmix-{discuss,build,handoff}/SKILL.md`

## Acceptance criteria → proof
- AC1 → `ls src/skills`: build, discuss, gorp, handoff, lean-code, terse, trailhead
- AC2 → `build/trail.test.mjs` (derive/new/check tests)
- AC3 → verify minus the freshness gate → OK; freshness pending commit
- AC4 → the stale-reference `rg` across src/docs/README/AGENTS.md comes back clean

## Deviations from the brief
- Removed this repo's old `resume-and-status` trail (old format; git history keeps it).
- Removed `evals/` (the human asked for this).
- README Node floor raised to ≥18 to match `AGENTS.md` (`node --test`).

## Docs
`docs/architecture.md`, `README.md`, `AGENTS.md` (Evals section dropped).

## Verification
- `node --test build/trail.test.mjs` → 39/39 passed
- `trail.mjs check` → ok
- `scripts/verify.sh` without the freshness block → OK (structure, hooks under bash + dash)
