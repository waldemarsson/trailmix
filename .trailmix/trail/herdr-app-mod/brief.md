---
slug: herdr-app-mod
title: Herdr app mod showing trail status
kind: feature
created: 2026-11-25
updated: 2026-11-25
waypoint: discuss
status: approved
branch: feature/NO-JIRA_herdr-app-mod
tasks: T1:done T2:done T3:done T4:done T5:done
---

# Herdr app mod showing trail status — brief

**Goal:** Ship a Herdr desktop app (`herdr-app`, on herdr-core) mod that shows every space's
trailmix trails in a side panel, lets the human read a trail's brief/report, and notifies when a
trail is waiting on the human — so trails are visible without asking an agent. Must work when the
app runs on a host and the spaces live on a remote machine (e.g. a VM reached by `hc --on`).

**Decisions:**
- Target is the Herdr **desktop app** mod system (`~/.config/herdr-app/mods/<name>/`), not Herdr
  TUI `herdr-plugin.toml` plugins.
- Lives in this repo: source `src/herdr-app/`, generated to `dist/herdr-app/` (package root with
  `RECIPE.md` + `mods/trailmix/`). Gallery path would be `waldemarsson/trailmix--dist--herdr-app`.
- `trail.mjs` is the only status logic. The generator emits `mods/trailmix/trail-source.js`
  (`export default <JSON string of trail.mjs source>`); no `trail.mjs` file ships in the mod.
- The mod runs trail.mjs **inline on the space's machine**: `exec(node, ["--input-type=module",
  "-e", LOADER, "status", "--json"], { on: space.machine, cwd: space.folder, timeout: 10000 })`,
  where LOADER = `const a=process.argv.slice(1);process.argv=[process.argv[0],process.execPath];
  const m=await import("data:text/javascript,"+<encodeURIComponent(source)>);process.exitCode=m.run(a);`.
  The argv shim keeps trail.mjs's direct-run guard (`:419`) from firing. Same path for local
  (`machine: null`) and remote spaces. Verified on this VM via `hc exec` with an absolute node
  path: exit 0, correct output; command ≈32 KB.
- `node` setting (mod prop `node`): a string, or a map keyed by machine name with `"local"` for
  local spaces; default `"node"`. "Not found" error names the setting. RECIPE documents it and the
  quick fix `ln -s "$(command -v node)" ~/.local/bin/node` (hc's PATH lacks nvm/volta dirs —
  observed: `hc exec -- node` → `cannot start node`).
- New additive flag `trail.mjs status --json` (ships to the agent plugins too): prints one JSON
  object `{"trails":[{slug,title,state,next}, …]}` listing **every** trail (no done/dropped hiding;
  consumer filters); `title` read from the brief in the JSON path only (not added to `deriveTrail`),
  omitted when absent or the `<title>` placeholder; combinable with explicit dirs; `--all`
  accepted and redundant. Any other flag → existing usage error, exit 2; usage strings and header
  comment list `--json`. Text output and exit codes unchanged.
- v1 features: (a) side panel, trails grouped by space (local and remote), open trails listed,
  done/dropped collapsed to a count per space; (b) clicking a trail opens an overlay rendering its
  markdown with frontmatter stripped — `report.md` if present, else `brief.md`, with a switch when
  both exist (read via `readTextFile(path, { on: space.machine })`); (c) checkpoint notification.
- Checkpoint = `next` starts with `discuss (awaiting sign-off)` or `handoff (awaiting review`.
  Notify when a trail is at a checkpoint **and** no agent in that space (`agents()` `.space ===
  space.id`) has status `working`; once per checkpoint entry, keyed by machine+folder+slug (dedupes
  spaces sharing a folder); never on initial load (seed first); re-arms after the trail leaves the
  checkpoint. Toast `action: { name: "space.select", args: { id } }`.
- A cross-test feeds real `trail.mjs` `status --json` output (fixture trails at each phase)
  through the mod's checkpoint matcher, so renaming the `next` strings fails `npm run verify`.
- No Resume/new-trail buttons in v1 (human skipped them).
- Refresh: every 15 s `cx.timer` poll for all spaces; local spaces additionally
  `watchFolder(<folder>/.trailmix/trail)` once it exists. Each tick reconciles against current
  `spaces()`: start watchers for new/now-existing dirs, cancel for removed spaces/changed folders;
  no overlapping refresh per space. Watchers cancelled on view drop where the API allows.
- Read-only: the mod never writes trail files.
- `mod.json`: `{ "place": "right", "size": 280, "title": "Trails" }`.
- Logic (exec command builder, JSON → view model, grouping, checkpoint/notify state machine,
  error mapping, frontmatter strip, node-setting lookup) lives in plain `.js` modules in the mod
  with no herdr imports; their tests live in `build/herdr-app.test.mjs` (not shipped), run by
  `npm run verify`.
- No `preview.png`, no `herdr-mod` repo topic in this trail (human adds after trying it).
- Version 0.14.0 → **0.15.0** in `package.json` and `src/meta/plugin.meta.json`.
- Implementation preferences: none — follow existing conventions.

**Design:** A separate Herdr emitter in `build/generate.mjs`, after the Claude/GHCP loop (not added
to `PLATFORMS` — no agent/skill transforms apply): copy `src/herdr-app/` verbatim to
`dist/herdr-app/`, then write `mods/trailmix/trail-source.js` from
`src/skills/trailmix-trailhead/refs/trail.mjs`. Inline execution (vs. vendoring a file) is what
makes remote spaces work: the source travels in argv, `node` and the files are both on the space's
machine, and nothing is installed there. Structured status via `--json` instead of parsing the `·`
text: the text is for humans, and the mod can't import trail.mjs (no Node APIs in mods).
Trade-off accepted: ~32 KB argv per space per refresh, and dependence on `node` ≥16 on each
machine.

**In scope:**
- `trail.mjs status --json` + tests in `build/trail.test.mjs`.
- `src/herdr-app/` (RECIPE.md, `mods/trailmix/{main.js, mod.json, pure-logic .js}`), tests in
  `build/herdr-app.test.mjs`.
- Generator emitter (+ `trail-source.js`); `scripts/verify.sh`: run the new test file, check
  `dist/herdr-app` files exist, `mod.json` parses, `trail-source.js` default export equals the
  trail.mjs source, every mod `.js` (excl. `trail-source.js`) imports only `gpui-kit`,
  `gpui-base`, `herdr`, or relative paths and uses no `setTimeout`/`setInterval`/`node:`/`require(`.
- Docs: README (intro, Install: Herdr app, Develop), `docs/architecture.md` (§3 tree, §9
  generator, lines saying "two plugins"/`dist/{claude,ghcp}` incl. ~:87, :245), repo `AGENTS.md`
  (:9-10, :25 "two installable plugins"), `build/generate.mjs` header (:2-11), `verify.sh` header
  (:4-6), trailhead `refs/trail-metadata.md` (one line on `--json`).
- Version bump.

**Out of scope:**
- Herdr TUI plugin; Resume / new-trail actions; editing or approving trails from the UI;
  `preview.png`; gallery topic / any remote GitHub change; keybindings; auto-detecting node via
  shells.

**Constraints:**
- Mod runtime: no Node APIs, no `setTimeout`/`setInterval` (use `cx.timer`), no top-level
  `await` (use `cx.spawn` in `init`), never retain `cx`, per-copy state in `init`, `theme()`
  colors, guard side effects (exec, watch, notify) with `checking()` for `herdr-app check`.
- `exec` resolves on nonzero exit; rejects when the program can't start / cwd missing / machine
  unreachable / timeout.
- `trail.mjs` stays zero-dep, Node ≥16; its behavior when run as a file is unchanged.
- Edit `src/`, `build/`, `docs/`, `scripts/`, `README.md`, `AGENTS.md` only; regenerate `dist/`.
- Skill prose stays terse; `trail-metadata.md` addition is one or two lines.

**Acceptance criteria:**
- [ ] AC1: `trail.mjs status --json` prints valid JSON `{"trails":[…]}` with `slug,state,next`
  (+`title` when real) for every trail incl. done/dropped; `{"trails":[]}` with none; explicit dirs
  restrict; `--json --all` same as `--json`; unknown flag → exit 2; text output unchanged —
  `node --test build/trail.test.mjs`.
- [ ] AC2: the mod's LOADER, built from `trail-source.js`, run as `node --input-type=module -e
  LOADER status --json` in a fixture dir, yields the same JSON as running trail.mjs directly —
  test in `build/herdr-app.test.mjs`.
- [ ] AC3: pure-logic tests cover grouping + done/dropped counts; notify fires once on checkpoint
  entry with no `working` agent, not on initial load, not while an agent is working (fires when it
  stops), not repeatedly, again after leave/re-enter, once for two spaces on one folder; error
  mapping (exec reject "cannot start" → node-setting hint, other reject, nonzero exit, bad JSON);
  node-setting lookup (string, map hit, map miss → `"node"`); frontmatter strip; cross-test with
  real trail.mjs fixtures at each phase.
- [ ] AC4: `npm run build` emits `dist/herdr-app/RECIPE.md`,
  `dist/herdr-app/mods/trailmix/{main.js,mod.json,trail-source.js,…}`; `npm run verify` passes and
  enforces the checks listed in scope.
- [ ] AC5: docs updated as listed; versions 0.15.0 in both files.
- [ ] AC6 (human, at handoff): `herdr-app check` passes and the panel works in the app against
  the VM — this VM has no `herdr-app`.

**Edge cases:**
- Space with no `.trailmix/trail`: trail.mjs returns `{"trails":[]}` → space shows nothing/"no
  trails"; no watcher until the dir appears.
- `node` missing on that machine → "node not found on <machine> — set the `node` setting".
- Machine unreachable / folder missing / timeout → inline error for that space; others unaffected.
- Nonzero exit or unparsable stdout → inline error with first stderr line.
- Malformed frontmatter: `deriveTrail` already degrades; show what it returns.
- Overlay: file vanished (`null`) → "file not found"; >1 MiB / read error → error text.
- Space removed or folder changed mid-refresh → result discarded; watcher cancelled.
- Unicode titles/slugs render as-is (encodeURIComponent round-trips the source).

**Context:**
- `build/generate.mjs:26-36,334-390` — single `generate()` wipes `dist/`, loops `PLATFORMS`;
  add Herdr emitter after the loop, before marketplace stubs. Only `src/skills` is validated and
  only per-platform `skills/` trees are transformed, so `src/herdr-app/` isn't picked up elsewhere.
  `meta.version` from `src/meta/plugin.meta.json`.
- `scripts/verify.sh:14-23` freshness covers all `dist/`; `:27-63,93` structure checks to extend.
  `package.json:8-10` scripts `build`, `verify`.
- `.github/workflows/build-dist.yml:7-13` triggers on `src/**`, `build/**`, `package.json`;
  stages all `dist/` — no change needed.
- `src/skills/trailmix-trailhead/refs/trail.mjs:267-323` `deriveTrail`/`summarize`; `:396-406`
  status dispatch (any flag currently sets `all`); `:419` direct-run guard via
  `realpathSync(argv[1])`; `:221` `newTrail` writes a `<title>` placeholder; `frontmatter()` does
  not strip quotes. `build/trail.test.mjs:412,504,520` deepEqual on `deriveTrail` (don't add
  fields there); `:556-615` status tests to extend.
- herdr-app v0.1.18 (`defaults/herdr.d.ts`, `defaults/AGENTS.md`, `src/mods.rs:871-950`):
  `exec(cmd,args,{cwd,on,timeout}) → {code,stdout,stderr}`; remote exec = `hc exec --json --on
  <machine> --cwd <cwd> -- cmd args…` (argv as given, no shell); `readTextFile(path,{on})` →
  string|null (≤1 MiB); `watchFolder(dir)` local only, recursive, rejects on missing dir,
  `.cancel()`; `notify({title,body,level,action:{name,args}})`; `openOverlay({mod,props,kind,
  width,height})`, overlay gets `props().overlay`, `closeOverlay(id)`; markdown via
  `TextView.markdown(id,text)` from `gpui-base`; `spaces()` → `{id,name,folder,machine,…}`
  (`machine:null` = local); `agents()` → `{space,status,…}`, status
  `working|blocked|done|idle`; `checking()`; `cx.timer.every`, `cx.spawn`, `cx.notify`; mod
  relative imports (`./x.js`) supported.
- Patterns: herdr-app `defaults/mods/files/main.js` (readTextFile preview, loading/missing
  states); cybertron288/herdr-mods `session-bar` (exec per space with `on`, watchFolder + timer),
  `ci-dash` (transition-based `notify`, error mapping); runkids/skillshare `herdr/` (subdir
  package, `node --test` on app-independent modules).
- Gallery: subdir packages supported (`herdr.dev/mods/<owner>/<repo>--path--segments`);
  `RECIPE.md` at package root (name+summary, what you see, how it behaves, built from, watch out,
  done when).
- Repo: on clean `main`; branch convention `feature/NO-JIRA_<slug>`; `hc` 0.1.21 on this VM, no
  `herdr-app`.

<!-- Everything above is agreed at the discuss checkpoint. Build appends below; no re-approval. -->

**Amendments:**
- 2026-11-25 · Loader escapes only `[%#?\r\n\t]` (not full encodeURIComponent): ~22 KB command line, under Windows' cap; Node ≥16 contract unchanged (verified on 20, 22, 24). Supersedes the encodeURIComponent/≈32 KB notes above.
- 2026-11-25 · Handoff: herdr didn't auto-dock on the human's host (folder likely seen empty mid-install). Added a palette entry "Trails" (`mod.open`) and an overlay size (360×520) to mod.json so a plain folder copy is enough; README says to move the folder in whole.
- 2026-11-25 · Handoff: the human wants no host config and no sudo on the VM. With no `node` setting and `node` off exec's PATH, the mod retries via `sh -c` with a finder (command -v, volta, mise, asdf, fnm default, highest nvm). A set path gets no fallback; no `sh` (Windows) → the node hint.
- 2026-11-25 · Handoff: list redesign at the human's request: a card per space (bold name, machine chip, done/dropped count), a status pill per trail (`statusPill` in logic.js; blocked/working/muted tones), finished-only spaces collapsed into one bottom line, sidebar order kept.
- 2026-11-25 · Handoff: sort toggle in the header (space order ↔ priority), persisted in `shared("trailmix.sort")`; priority ranks waiting → building → rest, errors last.
- 2026-11-25 · Handoff: auto-dock needs a personal layout (shipped `main` is replaced on start). Docs: clone `main` as `trailmix` first, then copy the mod; no shipped layout file (human chose to document the clone).
- 2026-11-25 · Handoff: `✕` in the docked header hides the column (`layout.hide`); the palette overlay shows "Show panel" while it's hidden. The block is found by mod in `layout()` (Herdr gives an auto-docked block a random id). Not a tab-bar button: the shipped `tabs` mod hardcodes Files/Changes.
- 2026-11-25 · Handoff: `✕` replaced by `»`, which folds the column to a 44 px rail (icon + waiting/building counts); click expands to the remembered width. Rail when the copy's own measured width < 160 (Herdr sidebar pattern). Not a floating peek drawer: that needs a hand-edited layout.
- 2026-11-25 · Handoff: `⇤`/`⇥` header buttons move the block between `sidebar-lists` (under Agents) and a right column via `layout.set` on the shown personal layout (`relocate`, pure). Human asked for no hand edits; the click is the consent. In the sidebar there's no `»`; the rail click opens the overlay.
- 2026-11-25 · Handoff: sidebar only. `mod.json` `place: none` (no right column); the palette overlay's "Pin to sidebar" adds it under Agents via `layout.set`; on shipped layouts it says "Clone the layout to pin". In the sidebar: "▾/▸ Trails" collapses to the header (px 36, shows counts) and expands (weight 1); `✕` removes it; folded sidebar → rail, click opens the overlay. Supersedes the right-column rail/fold and `⇥`. An old right column offers `⇤`.

## Build notes
**Files:**
- `src/skills/trailmix-trailhead/refs/trail.mjs` — modify — `status --json`
- `src/skills/trailmix-trailhead/refs/trail-metadata.md` — modify — one line on `--json`
- `build/trail.test.mjs` — modify — `--json` tests
- `src/herdr-app/RECIPE.md` — create — gallery recipe + `node` setting docs
- `src/herdr-app/mods/trailmix/mod.json` — create — dock right, 280
- `src/herdr-app/mods/trailmix/logic.js` — create — pure logic (loader, node lookup, parse, errors, grouping, notifier, frontmatter strip)
- `src/herdr-app/mods/trailmix/main.js` — create — panel view + doc overlay view (same mod, `props().doc`)
- `build/herdr-app.test.mjs` — create — logic tests, loader-vs-direct test, cross-test
- `build/generate.mjs` — modify — Herdr emitter + `trail-source.js`
- `scripts/verify.sh` — modify — herdr-app tests + structure/API checks
- `README.md`, `docs/architecture.md`, `AGENTS.md` — modify — third output
- `package.json`, `src/meta/plugin.meta.json` — modify — 0.15.0

**Tasks:**
- T1: `trail.mjs status --json` · `{"trails":[{slug,title?,state,next}]}` · all trails, dirs restrict, `--all` redundant, bad flag exit 2, `<title>` placeholder omitted, text unchanged · `node --test build/trail.test.mjs`
- T2: `logic.js` · pure exports · node lookup, exec args/loader, result parse, error mapping, grouping/counts, checkpoint matcher, notifier state machine, frontmatter strip, cross-test vs real trail.mjs fixtures · `node --test build/herdr-app.test.mjs`
- T3: generator emitter + verify wiring · `dist/herdr-app/{RECIPE.md,mods/trailmix/*}` + `trail-source.js` · loader from dist `trail-source.js` matches direct run (AC2); verify checks files, JSON, source equality, import/API bans · `npm run verify`
- T4: `main.js` + `mod.json` + `RECIPE.md` · panel, overlay, notify, refresh/watch lifecycle, `checking()` guards · `node --check` + `npm run verify`
- T5: docs + version 0.15.0 · `npm run verify`

AC map: AC1→T1 · AC2→T3 · AC3→T2 · AC4→T3/T4 · AC5→T5 · AC6→handoff (human)

**Evidence:**
- T1 · `node --test build/trail.test.mjs` 64/64 pass (4 new --json tests, red first) · AC1 → met
- T2 · `node --test build/herdr-app.test.mjs` 20/20 (19 red-free logic + AC2 loader test red until T3 emitter, then green) · AC3 → met
- T3 · emitter `writeHerdrApp()` + verify section · `npm run verify` OK after signed commit a588ba7 · mutation-checked verify guard: disallowed import, `setTimeout`, stale trail-source each fail · AC2 → met (loader from dist trail-source.js == direct run) · AC4 → met
- T4 · `node --check main.js` ok · smoke-ran dist main.js under Node with stubbed `herdr`/gpui modules (ad hoc, not committed): panel lists this repo's trails, remote "cannot start" → node-setting hint, row click → overlay props, overlay renders brief markdown · UI against real herdr-app unverified (no herdr-app on VM) → AC6
- T5 · README (intro, Install → Herdr app, Develop), architecture §3/§9, repo AGENTS.md, generate.mjs + verify.sh headers, trail-metadata.md · 0.15.0 both files · AC5 → met
- Deviation · `working` check spans every space sharing the folder (not just one space), since status is fetched once per machine+folder · ~~notifier at module scope~~ superseded by review L1: one notifier per copy, so two docked copies each toast
- Deviation · spaces with no trails are hidden (not "no trails" per space); panel shows "No trails in any space" when all empty — less clutter with many spaces
- Deviation · verify import check scans static imports only: logic.js's loader string contains a dynamic `import(` (data: URL) for node, not the mod
- Unverified · `TextView.markdown` inside scroll container, docked `size`/`title` honored, `props()` null for docked copy — needs herdr-app (AC6)
- Review r1 · H1 · clear · logic.js execError · hint matched "not found", real hc message is "cannot start node: No such file…" → fixed (match `cannot start ${node}:`; folder case excluded; tests use real messages)
- Review r1 · M1 · clear · logic.js loaderFor · thrown error escaped as 68 KB stderr → fixed (catch → `error: <msg>`, exit 1; test == direct run)
- Review r1 · M2 · judgment · logic.js loaderFor · 34 KB argv > Windows 32,767 cap → fixed (escape only data:-URL-unsafe chars, ~22 KB; test caps < 28,000)
- Review r1 · L1 · judgment · main.js · module-scope notifier → per-copy (herdr "state in init" rule); two docked copies each toast
- Review r1 · L2 · clear · trail.mjs statusJson · explicit `{slug,state,next}` → fixed
- Review r1 · L3 · judgment · RECIPE · spaces without a folder skipped → documented
- Review r1 · L4 · judgment · main.js · poll pauses while window hidden → fixed
- Review r1 · L5 · judgment · main.js · `raw_html(false)` on doc markdown → fixed
- Review r1 · L6 · clear · AGENTS.md/README.md wraps → fixed
- Review r2 · H1 · clear · stop · logic.js:22 · raw `?` truncated the source on Node ≤20 (pathname-only) → fixed (escape `?`; test: URL has no search/hash and pathname decodes to source, red before fix) · verified real loader under `npx node@20`: exit 0, correct JSON
- Review r2 · L1 · judgment · main.js render · catch-up refresh ran while hidden → fixed (also requires `window()?.visible !== false`)
- Review r2 · L2 · clear · brief · stale loader notes → fixed via Amendments
- Gate · `node --test build/trail.test.mjs build/herdr-app.test.mjs` 89/89 · real `hc exec` on VM with r1 loader (unicode titles) ok
- Review r3 · H1, L1, L2 held · no new findings · verdict ready
- Docs · RECIPE.md loader note now lists `?` (r2 fix made it stale) · README / architecture / AGENTS.md / trail-metadata.md already current from T5 · no agent-retro line (the hc exec PATH and base64 quirks are user-side and already in RECIPE)
- Follow-up · mod.json palette + overlay size · README/RECIPE notes · `node --test build/herdr-app.test.mjs` 25/25 · palette/overlay sizing unverified until the human tries it
- Follow-up · sh node fallback · `node --test build/herdr-app.test.mjs` 29/29 (finder run under real sh with a fake HOME and PATH isolated to ls/sort; removing `sort -V` → red) · real `hc exec -- sh …` on the VM → exit 0, this repo's trails · RECIPE + README updated
- Follow-up review · M1 · clear · main.js · palette overlay toasted/watched a second time → fixed (overlay copy skips both)
- Follow-up review · L1 · clear · logic.js FIND_NODE · HOME with spaces split the nvm list → fixed (list version names only, paths quoted; test)
- Follow-up review · L2 · judgment · logic.js · `sort -V` not portable → fixed (POSIX numeric sort; lexical-sort mutation → red)
- Follow-up review · L3 · judgment · nvm default alias / NVM_DIR / fnm macOS / stale shim not handled → documented in RECIPE, for the human
- Follow-up review · L4 · judgment · main.js · two execs per refresh on sh machines → fixed (per-machine memo after a successful sh run)
- Follow-up review · L5 · clear · tests · 127 without marker + order → added
- Gate · `node --test build/herdr-app.test.mjs` 32/32 · real `hc exec -- sh …` on the VM → exit 0
- Follow-up re-review · M1, L1, L2, L4, L5 held · L6 · clear · main.js · sh memo ignored a node setting added later → fixed (memo only when node is the default)
- Follow-up · list redesign · `node --test build/herdr-app.test.mjs` 34/34 (statusPill cases + cross-test: every open phase of real trail.mjs output gets a label, blocked exactly at checkpoints) · stub smoke render: cards, pills, error card, `1 space · 2 done` · real look unverified until the human tries it
- Follow-up · sort toggle · `node --test build/herdr-app.test.mjs` 37/37 (trailRank, spaceRank) · stub smoke: the click flips the order; priority gives cards C,A,B and trails c2,c1 · real look unverified
- Follow-up · dock · human verified on host: after `layout.clone main→trailmix` the mod docked on the right and rendered (cards, pills, priority toggle) · AC6 docked render met
- Follow-up · hide/show · `node --test build/herdr-app.test.mjs` 39/39 (findDock) · stub smoke: docked+shown → ✕ runs layout.hide; overlay+hidden → Show panel runs layout.show and closes the overlay; other two states show no button · real app unverified
- Follow-up · rail · `node --test build/herdr-app.test.mjs` 40/40 (tally) · stub smoke: width 320 → `»` runs layout.resize 44 and stores 320; width 44 → rail with icon and badges 1/2, click runs layout.resize 320 · real app unverified
- Follow-up · sidebar · `node --test build/herdr-app.test.mjs` 43/43 (relocate ×3, findDock inSidebar) · stub smoke: right → ⇤ gives lists spaces,agents,trailmix and drops the right column; sidebar → ⇥ restores; `»` only on the right · real app unverified, incl. layout.set accepting layout()'s tree
- Follow-up · sidebar-only · `node --test build/herdr-app.test.mjs` 43/43 (relocate null removes) · stub smoke, 7 states: old right column ⇤ → sidebar; expanded ▾ → resize px 36; collapsed ▸ (badges 1/1) → resize weight 1; folded rail; ✕ → removed; overlay Pin → layout.set + close; shipped layout → hint, no button · real app unverified
