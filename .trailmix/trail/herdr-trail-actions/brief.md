---
slug: herdr-trail-actions
title: Trail actions and open/closed view in the Herdr mod
kind: feature
created: 2026-11-27
updated: 2026-11-27
waypoint: discuss
status: approved
branch: feature/NO-JIRA_herdr-trail-actions
tasks: T1:done T2:done T3:done T4:done
---
# Trail actions and open/closed view in the Herdr mod — brief

**Goal:** Let the human manage trails from the Herdr Trails panel — approve, drop, reopen, delete —
and browse closed (done/dropped) trails, not just open ones. Today the mod is read-only and closed
trails collapse to a count line.

**Decisions:**
- Close = `trail.mjs drop` (abandon; reversible, deletes nothing). No "mark done" action beyond Approve report.
- Reopen = `trail.mjs reopen`, offered on **dropped** trails only. Done trails can't be reopened.
- Delete = new `trail.mjs delete <slug>` op: removes `.trailmix/trail/<slug>/` with node's `rmSync`
  (works on remote and Windows machines). Allowed on any trail state.
- Approve: both — "Approve brief" when awaiting sign-off, "Approve report" when awaiting review
  (→ done). Approving a report with open/disputed findings is allowed; the button reads
  `Approve report · N pending`.
- Approving from the panel creates no branch and starts no build; the agent picks up on resume. Accepted.
- Confirm: only Delete gets a two-click confirm (first click arms "Confirm delete?", second deletes).
  Drop/reopen/approve run on one click.
- No guard on a `working` agent in the space: actions are always available.
- Action buttons live in the reader dialog header (beside Brief/Report tabs), not on rows.
- Listing: header toggle `Open | Closed`, persisted in `shared("trailmix.view")` like the sort.
  Closed lists done + dropped trails per space with `Done` / `Dropped` pills (theme `muted`/`dim`).
- Delete is a hard delete (`rmSync`, `recursive`, `maxRetries` for Windows EBUSY) behind the two-click
  confirm; no trash folder. Accepted: unrecoverable when `.trailmix/` is gitignored.
- Reopen of a dropped trail = back to discuss (draft, `tasks` cleared → "Needs sign-off"); prior state isn't restored.
- Folders under `.trailmix/trail` whose name isn't a valid slug get no Delete button; `delete`
  refuses non-slugs and symlinks (`lstatSync`, must be a real directory).
- Agents never run `delete`: one line in `trail-metadata.md` (and trailhead SKILL.md if it lists ops) says it's the human's panel action.
- Implementation preferences: none — follow existing conventions (pure parts in `logic.js` with
  tests in `build/herdr-app.test.mjs`; trail.mjs tests in `build/trail.test.mjs`).

**Design:** Every write goes through `trail.mjs` run on the space's machine via the same
`exec` + `data:` loader as `status` (node lookup, `sh` fallback, `node` setting all reused), so
the mod never touches files directly and the vocabulary stays in trail.mjs. The dialog needs the
panel's `node` setting, so it travels in the dialog's props. Buttons shown per state:

| Trail state (`next`) | Buttons |
|---|---|
| discuss (awaiting sign-off) | Approve brief · Drop · Delete |
| discuss (no brief / empty) | Delete |
| build … | Drop · Delete |
| handoff (awaiting review…) | Approve report[ · N pending] · Drop · Delete |
| dropped | Reopen · Delete |
| done | Delete |

The dialog runs `status --json .trailmix/trail/<slug>` on open and after each action to learn the
trail's `next`/`state`; buttons derive from that. **Before each op it re-runs that status and
refuses (shows "Trail changed — refresh") if the button no longer applies** — e.g. Approve brief
on a trail dropped elsewhere, Reopen on one no longer dropped. Write ops print text, so a pure
`parseAction` maps exec results (exit 0 → ok; 127 + node-not-found → missing-node message; else
first-line error) alongside `parseStatus`.

Dialog props carry the panel's `node` setting and whether that machine needed the `sh` fallback
(the `viaSh` memo), so actions don't pay a failed exec first. The palette overlay copy passes its
own (no `node` prop → default lookup).

After an action the dialog reloads its files (closes after Delete) and the panel refreshes that
folder immediately — local and remote — rather than waiting for the 15 s poll (e.g. the dialog
signals through `setShared("trailmix.changed", { machine, folder, nonce })`; the panel reloads
the matching folder when the nonce changes and ignores whatever value it finds at start, since
`shared` persists). A failed action shows its error in the dialog
(same first-line error shapes as status) and changes nothing else.

`trail.mjs delete <slug>`: validates `slug` against the existing `SLUG` regex and that
`.trailmix/trail/<slug>` is an existing directory; refuses otherwise (usage/error, exit ≠ 0). Takes a
slug, not a path, so it can never delete outside `.trailmix/trail/`.

**In scope:**
- `trail.mjs delete` op + usage line + header comment + tests.
- Mod: action buttons in the dialog, Open/Closed toggle, immediate panel refresh, error display.
- Docs: `src/herdr-app/RECIPE.md` (drop the "Read-only: it never changes a trail" claim, describe
  actions/toggle/delete), mod header comment, `trail-metadata.md` op list, and any README /
  skill mention that lists trail.mjs ops or says "deletes nothing" where it now misleads.
- Version bump MINOR in `package.json` + `src/meta/plugin.meta.json` (new trail.mjs op, mod
  behavior), then `npm run build`.

**Out of scope:**
- Reopening done trails; reopening approved-in-progress briefs from the panel.
- Branch creation or starting a build on approve.
- Row-level hover buttons, context menus, bulk actions.
- Any change to toasts, sort, rail, pin/collapse behavior.
- Undo for delete (git history is the only recovery).

**Constraints:**
- trail.mjs stays zero-dep, Node ≥ 16; its embedded copy must stay under the Windows
  32,767-char command-line cap (existing test).
- Never hand-edit `dist/` or `trail-source.js`; regenerate with `npm run build`.
- Skills' "drop deletes nothing" stays true: `drop` is unchanged; `delete` is a separate op.

**Acceptance criteria:**
- [ ] AC1: `trail.mjs delete <slug>` removes the trail folder; bad slug (`../x`, `a/b`, empty) and
  missing trail exit ≠ 0 and remove nothing — `build/trail.test.mjs`.
- [ ] AC2: the per-state button set matches the table — pure function in `logic.js`, tested
  against real trail.mjs output for every fixture phase in `build/herdr-app.test.mjs`.
- [ ] AC3: action argv for each op is built by a pure helper and tested (op name + file path /
  slug; loader reused); `parseAction` tested for ok, node-not-found (127), and first-line error.
- [ ] AC3b: pure "does this action still apply to this status" check tested (stale approve /
  reopen / drop refused); delete-confirm arm/reset and refresh-signal matching (nonce, startup
  value ignored) are pure and tested.
- [ ] AC4: Open/Closed grouping — Closed shows done+dropped per space with correct pills; Open
  view unchanged — tested in `logic.js`.
- [ ] AC5: `npm run verify` passes (fresh dist, size cap, lint).
- [ ] AC6: `herdr-app check` on the mod passes if `herdr-app` is available; otherwise noted as
  manual in the report, along with click-through of each action.

**Edge cases:**
- Trail changed between dialog open and click: pre-op status recheck refuses with "Trail changed — refresh" and re-renders the buttons.
- Delete of the trail whose dialog is open → dialog closes; another open dialog for it shows "not found".
- Delete while an agent writes into the folder: allowed (no guard); the agent may recreate files.
- Remote machine unreachable / node missing: action error shown in the dialog, nothing changes.
- Space folder shared by several spaces: one action, all their cards refresh.
- Closed view with no closed trails anywhere: "No closed trails". Closed view keeps error cards
  and follows the same sort toggle (priority has no effect there: all closed trails rank equal → space order).
- Delete confirm disarms when the dialog's trail state changes or another button is clicked.
- Unicode/odd titles: unchanged rendering; slugs are already `[a-z0-9-]`.

**Context:**
- `src/herdr-app/mods/trailmix/main.js` — panel + reader dialog (`initDoc`/`renderDoc`); `load()`
  shows the exec/node/sh-fallback pattern to reuse; `openDoc()` builds dialog props.
- `src/herdr-app/mods/trailmix/logic.js` — `loaderFor`, `statusArgs`, `parseStatus`,
  `viaShell`, `groupTrails`, `statusPill`; add pure helpers here.
- `src/skills/trailmix-trailhead/refs/trail.mjs` — `OPS` (approve/drop), `reopen()`, `run()`
  dispatch, `SLUG`, `TRAILS`, `usage()`; `statusJson` already returns all trails incl. closed.
- `build/herdr-app.test.mjs` — fixture trails per phase incl. `i-dropped`; cross-tests vs real trail.mjs.
- `src/herdr-app/RECIPE.md` — user-facing spec of the mod; currently says read-only.
- Ops listed in `src/skills/trailmix-trailhead/refs/trail-metadata.md`, `.../SKILL.md`, `README.md`.

<!-- Everything above is agreed at the discuss checkpoint. Build appends below; no re-approval. -->

## Build notes
**Files:**
- `src/skills/trailmix-trailhead/refs/trail.mjs` — modify — `delete <slug>` op (`deleteTrail`)
- `build/trail.test.mjs` — modify — delete tests
- `src/herdr-app/mods/trailmix/logic.js` — modify — `actionsFor`, `actionArgs`, `parseAction`, `stillApplies`, `closedPill`, `groupTrails` closed list, `changedFolder`
- `build/herdr-app.test.mjs` — modify — tests for the above, cross-checked against real trail.mjs
- `src/herdr-app/mods/trailmix/main.js` — modify — dialog actions + status, Open/Closed toggle, refresh signal
- `src/herdr-app/RECIPE.md`, `src/skills/trailmix-trailhead/refs/trail-metadata.md`, trailhead `SKILL.md`, `README.md` — docs
- `package.json`, `src/meta/plugin.meta.json` — MINOR bump; `dist/` regenerated

**Tasks:**
- T1: `trail.mjs delete <slug>` · removes `.trailmix/trail/<slug>`; refuses bad slug, missing, symlink, non-dir · AC1 · gate `node --test build/trail.test.mjs`
- T2: pure mod helpers (actions per state, argv, parseAction, stale check, delete-confirm, refresh signal, closed grouping) · AC2 AC3 AC3b AC4 · gate `node --test build/herdr-app.test.mjs`
- T3: wire main.js (dialog actions, toggle, refresh) · AC6 (manual) · gate `npm run build && node --test build/herdr-app.test.mjs`
- T4: docs + MINOR bump + build · AC5 · gate `npm run verify`

**Evidence:**
- T1 gate: `node --test build/trail.test.mjs` 69/69 pass (5 new delete tests, red before impl) · AC1 → met
- T2 gate: `node --test build/herdr-app.test.mjs` 55/55 pass (12 new; action ops cross-run through the loader against real trail.mjs) · AC2 AC3 AC3b AC4(grouping) → met
- T3 gate: `npm run build` ok; `node --test build/herdr-app.test.mjs` 55/55. Throwaway smoke harness (stubbed gpui-kit/gpui-base/herdr, real exec of dist main.js): open/closed views, stale nonce ignored, reader buttons, reopen → panel reload via shared key, stale approve refused, delete arm+confirm+close — 10/10 checks true. `herdr-app` not installed → AC6 (herdr-app check + live click-through) unverified, manual.
- Deviation: stale-click message reads "Trail changed meanwhile — buttons updated" (brief: "Trail changed — refresh") — the buttons re-render from the fresh status, so there's nothing to refresh.
- Deviation: panel's status exec now goes through a shared `runTrail` helper (reader reuses it); the sh memo is set on any non-error result (was: on trails), same outcome for status.
- T4 gate: `npm run build` ok; `scripts/verify.sh` with only the git-freshness check removed → OK (all tests, lint, structure, hook checks). The freshness check itself needs dist committed — passes once committed. Version 0.15.0 → 0.16.0 (MINOR: new trail.mjs op, mod behavior) · AC5 → met (pending commit for freshness)
- Docs: `src/herdr-app/RECIPE.md` (actions, toggle, delete, no longer read-only — user-facing spec), `trail-metadata.md` (`delete` op + agents-never-run rule, per brief), `README.md` Herdr blurb (new capabilities), `docs/architecture.md` (actions run via the same exec path). Trailhead SKILL.md's "drop … deletes nothing" stays true — left unchanged.
- Review r1 (trailmix-reviewer): verdict "with fixes", 0 HIGH.
  - M1 · clear · main.js reloadDoc · status error on open was silent → fixed (returned + shown)
  - M2 · clear · main.js act · trail deleted elsewhere showed raw usage text, stale files → fixed (reload files; "Trail not found — deleted?", buttons cleared)
  - M3 · judgment · main.js act · `props()` read after awaits → fixed (overlay id saved in initDoc)
  - L1 L2 · clear · RECIPE/README/architecture formatting → fixed (actions sentence moved into "Built from")
  - L3 · judgment · tab click left delete armed → fixed (tabs disarm)
  - L4 · clear · rail copy skipped change signal → fixed (observe before rail return)
  - L5 · clear · closed-view card logic untested → fixed (`cardFor`, `pillFor` in logic.js + 4 tests)
  - Own find: a transient status error cleared all buttons (no retry) → status errors keep last trail; cleared only when files are gone
- Gates after r1: `node --test build/herdr-app.test.mjs build/trail.test.mjs` 128/128; smoke harness (session files/smoke) 12/12 incl. exec error, deleted-elsewhere, wrong props() later.
- Review r2 (delta): M1 M2 M3 resolved, no regressions, dist matches src.
  - L6 · clear · main.js act · status failure re-ran status inside reloadDoc (2× exec timeout) → fixed (`reloadDoc(fresh)` reuses it)
  - L7 · judgment · main.js reloadDoc · "deleted?" wrong when the machine is unreachable → fixed (note now "Trail not found or unreachable")
- Gates after r2: tests 128/128; smoke 12/12 on fresh dist.
- Docs: RECIPE.md (actions, toggle, delete), trail-metadata.md (`delete` op; agents never run it), README.md (Herdr blurb), architecture.md (actions via exec). Version 0.16.0 (MINOR: new trail.mjs op + mod behavior).
- Unverified: AC6, `herdr-app check` + live click-through (herdr-app not installed here).
- AC6 → met: human installed the mod in Herdr and confirmed it works (2026-11-27).
