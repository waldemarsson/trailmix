---
slug: herdr-trail-actions
waypoint: handoff
status: approved
updated: 2026-11-27
---
# Herdr mod trail actions — report

**Result:** The Herdr trailmix panel has an Open | Closed toggle. The reader dialog can approve (brief or report), drop, reopen and delete a trail. Delete needs a confirm click and is backed by a new `trail.mjs delete <slug>` op. **Verdict:** ready. AC6 confirmed by hand in Herdr.

## Try it
1. `npm run build`, then install `dist/herdr-app/` per `src/herdr-app/RECIPE.md`. Run `herdr-app check` on the mod.
2. Panel header: switch between Open and Closed. Closed lists done and dropped trails with pills.
3. Open a trail, then use the header buttons:
   - draft brief → Approve brief
   - report → Approve report (shows `· N pending` when there are pending findings)
   - Drop
   - on a dropped trail → Reopen (back to discuss)
   - Delete → click again on "Confirm delete?"; the dialog closes and the panel refreshes.
4. CLI: `node src/skills/trailmix-trailhead/refs/trail.mjs delete <slug>`. It refuses bad slugs, missing trails, symlinks and non-directories.

## Acceptance criteria → proof
- AC1 → 5 delete tests in `build/trail.test.mjs`.
- AC2, AC3, AC3b, AC4 → tests in `build/herdr-app.test.mjs` (`actionsFor`, `actionArgs`/`parseAction` run against real trail.mjs, `stillApplies`, `groupTrails`/`cardFor`/`pillFor`). Both files: 128/128 pass.
- AC5 → `scripts/verify.sh` passes except the git-freshness check, which passes once `dist/` is committed.
- AC6 → met: you installed the mod in Herdr and confirmed it works. The smoke harness also passes 12/12.

## Changes
- `src/skills/trailmix-trailhead/refs/trail.mjs` — `delete <slug>` op (`deleteTrail`).
- `src/herdr-app/mods/trailmix/logic.js` — pure helpers: action set per state, argv, parse, stale check, confirm step, change watch, closed grouping, cards and pills.
- `src/herdr-app/mods/trailmix/main.js` — `runTrail` exec helper, Open/Closed toggle, reader action bar, cross-copy refresh via the `trailmix.changed` shared key.
- `build/trail.test.mjs`, `build/herdr-app.test.mjs` — tests.
- `package.json`, `src/meta/plugin.meta.json` — 0.16.0 (MINOR). `dist/` and the marketplace stubs are regenerated.

## Deviations from the brief
- The stale-click note reads "Trail changed meanwhile — buttons updated": the buttons re-render, so there is nothing for the user to refresh.
- The panel and the reader share the `runTrail` exec helper. The sh fallback memo is set on any non-error result.
- A transient status error keeps the last buttons; every click re-checks status first. Buttons clear only when both files are gone ("Trail not found or unreachable").

## Self-review
9 findings (0 HIGH, 3 MED, 6 LOW), all fixed over 2 rounds. Delta re-review confirmed the MED fixes.

## Docs
- `src/herdr-app/RECIPE.md` — actions, toggle, delete; drops the read-only claim.
- `src/skills/trailmix-trailhead/refs/trail-metadata.md` — `delete` op; agents never run it.
- `README.md` — Herdr blurb.
- `docs/architecture.md` — the mod now runs actions via exec.
