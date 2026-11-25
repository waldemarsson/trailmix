---
slug: herdr-app-mod
waypoint: handoff
status: draft
updated: 2026-11-25
---
# Herdr app mod showing trail status — report

**Result:** `npm run build` now emits `dist/herdr-app/`, a herdr-app mod. It docks a "Trails" panel listing each space's trails (local or remote, via `exec` on the space's machine with trail.mjs inlined), opens the brief or report in a dialog, and toasts when a trail waits on you. `trail.mjs status --json` backs it. **Verdict:** ready. AC6 (real herdr-app UI) is your manual check.

## Try it
1. On the host, copy the mod: `limactl copy -r agentbox:~/workspace/trailmix/dist/herdr-app/mods/trailmix ~/.config/herdr-app/mods/` (or check out this branch on the host and copy from there).
2. Make node reachable for `exec` on the VM. Check with `hc exec -- node -v`; if it isn't found, either run `ln -s "$(command -v node)" ~/.local/bin/node` on the VM (if that's on exec's PATH), or set the prop in your layout: `{ "mod": "trailmix", "props": { "node": { "<vm machine>": "/home/marwal/.nvm/versions/node/v24.22.2/bin/node" } } }`.
3. Run `herdr-app check`, then open the app. The panel should list this repo's trails (`herdr-app-mod` at handoff, awaiting review). Click it to open the dialog; Esc closes it.
4. Toast check: move a trail into a checkpoint (e.g. `trail.mjs reopen` on a scratch trail's brief) while no agent is working. One "needs you" toast should appear.

## Acceptance criteria → proof
- AC1 → 4 `--json` tests in `build/trail.test.mjs`, red first.
- AC2 → loader built from dist `trail-source.js` matches a direct run (`build/herdr-app.test.mjs`). Also checked on real `hc exec` on the VM (unicode titles) and on Node 20, 22 and 24.
- AC3 → logic tests in `build/herdr-app.test.mjs` (grouping, counts, notifier, phase/checkpoint cross-test).
- AC4 → `npm run verify` OK: dist files, JSON, source equality, import/API bans. Mutation-checked.
- AC5 → README, `docs/architecture.md`, `AGENTS.md`, `trail-metadata.md`; 0.15.0 in both version files.
- AC6 → **you**: real UI is unverified (no herdr-app on the VM). Open points: markdown in the scroll container, docked `size`/`title`, `props()` null for the docked copy, render after a visibility change.
- Gates: `node --test build/trail.test.mjs build/herdr-app.test.mjs` 89/89; `npm run verify` OK.

## Changes
- `src/herdr-app/mods/trailmix/{main.js,logic.js,mod.json}` — panel/dialog view; pure logic (loader, node lookup, parsing, errors, grouping, notifier).
- `src/herdr-app/RECIPE.md` — what the mod does, how it's built, watch-outs (node PATH, argv size).
- `src/skills/trailmix-trailhead/refs/trail.mjs` — `status --json`.
- `build/generate.mjs` — `writeHerdrApp()` emits the mod + generated `trail-source.js`.
- `scripts/verify.sh` — herdr-app section (tests, files, source equality, import/API bans).
- `build/herdr-app.test.mjs` (new), `build/trail.test.mjs` — tests.
- `dist/**`, `.github/plugin/marketplace.json` — regenerated.

## Deviations from the brief
- `working` hold spans every space sharing a folder, because status is fetched once per machine+folder.
- Spaces with no trails are hidden; an all-empty panel says "No trails in any space".
- The verify import check covers static imports only (the loader string has a dynamic `import(` meant for node).
- Amendment: the loader escapes only `[%#?\r\n\t]` instead of full encodeURIComponent: about 22 KB, under Windows' 32,767 command-line cap.
- Judgment fixes from review: one notifier per panel copy (two docked copies each toast); polling pauses while the window is hidden; embedded HTML renders as text; spaces without a folder are skipped.

## Self-review
3 rounds, 12 findings, all fixed. Includes 1 `stop`: raw `?` truncated the loader on Node ≤20, now escaped, with a test. Round 3 found nothing new.

## Docs
- `README.md` — Herdr app install + develop notes (new install target).
- `docs/architecture.md` — tree, install, §9 mod design (third generated output).
- `AGENTS.md` — repo now emits three outputs; dist/herdr-app is generated.
- `src/skills/trailmix-trailhead/refs/trail-metadata.md` — `--json` flag.
- No agent-retro line.
