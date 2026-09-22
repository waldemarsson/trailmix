---
slug: harness-refresh
waypoint: handoff
status: approved
updated: 2026-09-22
---

# Refresh the CC and GHCP harness integration — report

**Result:** Items 1–3 and 5–8 shipped as 0.8.0 in f323617. Item 4 (the CC reviewer command allowlist)
was dropped. **Verdict:** ready.

## Not verifiable here
Neither `claude` nor `copilot` is installed here, so no live session was run. Unconfirmed:
- whether the GHCP `subagentStart` matcher sees plugin agents as `trailmix-*`; the matcher is unanchored to cover a prefixed form
- whether CC resolves `skills: [trailmix:gorp]` for plugin agents; a miss is skipped with a warning
- the exact GHCP model slugs; the fallback lists reduce the risk

## Acceptance criteria → proof
- AC1 → `npm run verify` runs all four hooks under bash and dash, with a 10k check
- AC2 → `dist/*/agents/*` frontmatter
- AC3 → the unbalanced-marker test throws; `rg "<!-- /?only" dist` finds no matches
- AC4 → `npm run verify` → OK

## Deviations from the brief
- Item 4 was dropped (see the brief's Amendments).
- Fixed a dangling §12 reference in `docs/architecture.md` (now §8).

## Verification
- `npm run verify` → OK on f323617
