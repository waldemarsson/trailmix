# trailmix — build status & resume notes

Portable agentic coding framework: **Discuss → Plan → Implement → Review → Document**, runs on
both **GitHub Copilot CLI (GHCP)** and **Claude Code (CC)**. Token efficiency is first-class.
Design phase is done; implementation is well underway. Source of truth for design =
`docs/architecture.md`.

## Where things stand (2026-07-04, end of session)

Repo: `/Users/marwal/code/private/trailmix`, branch `main`, only one commit so far (`6f175dc
Init`). **Everything below is staged/untracked — NOT committed yet.** `refs/` (user's old
workflow) is untracked source material, adapted (not copied verbatim).

### Done
- ✅ Research CC + GHCP capabilities (authoritative, re-verified this session against live docs).
- ✅ Design blueprint + naming locked → `docs/architecture.md`.
- ✅ `src/instructions/AGENTS.md` — always-on core (bootstrap, style, tools, security).
- ✅ Skills: `trailmix-trailhead` router + style (`trailmix-terse`, `trailmix-lean-code`,
  `trailmix-gorp`) + 5 waypoints (`trailmix-discuss`, `trailmix-plan`, `trailmix-implement`,
  `trailmix-review`, `trailmix-document`) each with JIT `refs/`.
- ✅ Neutral agents `src/agents/*.agent.md`
  (trailmix-explorer/trailmix-implementer/trailmix-reviewer/trailmix-documenter).
- ✅ Generator `build/generate.mjs` (zero-dep) + maps (`build/maps/{models,tools}.json`) →
  `dist/{claude,ghcp}/`.
- ✅ Plugin packaging: generator emits per-platform manifests + marketplace catalogs:
  - CC: `dist/claude/.claude-plugin/{plugin.json,marketplace.json}`
  - GHCP: `dist/ghcp/plugin.json` + `dist/ghcp/.github/plugin/marketplace.json`
- ✅ ~~Installers `install.sh` / `install.ps1`~~ — **built, then removed** (decision #7):
  marketplace-only install now, no standalone installer maintained.
- ✅ README.md (marketplace-only install, portability matrix, layout, dev, token levers).
- ✅ Removed `.github/copilot-instructions.md` (redundant — AGENTS.md covers it; staged as `D`).
- ✅ `scripts/verify.sh` (`npm run verify`) — regenerates `dist/` + root marketplace stubs,
  asserts the plugin structure is sound (manifests present, valid JSON, hook commands actually
  run and emit valid output). No installer left to test; never installs anything anywhere.
- ✅ `SessionStart` hook, sourced from `src/instructions/AGENTS.md` — the always-on core, now the
  **only** always-on mechanism (decision #7).

### CRITICAL correction made an earlier session (superseded by decision #7)
**Claude Code reads `CLAUDE.md`, NOT `AGENTS.md`.** This originally drove `install.sh` writing a
`CLAUDE.md`→`@AGENTS.md` import at the target root. That whole delivery mechanism (installer +
root `CLAUDE.md`/`AGENTS.md`) no longer exists — decision #7 replaced it with the `SessionStart`
hook, since a marketplace-installed plugin never gets a root `CLAUDE.md`/`AGENTS.md` written for
it in the first place. The underlying fact (CC reads `CLAUDE.md`, not `AGENTS.md`, for *project*
context) is still true and still why `dist/claude/AGENTS.md` is bundled-reference-only rather
than something either CLI will pick up on its own.

### Verified working
`npm run verify` (regenerates `dist/` + root marketplace stubs, asserts plugin structure is
sound, actually runs the hook commands and checks their output is valid). Also `bash -n` +
`pwsh` parse for syntax. No installer left; nothing is installed anywhere by verification.

## Decisions made (flag if you want to revisit)
1. **`dist/` is now committed to `main`** (decided/actioned this session). Canonical *source* is
   still `src/` — never hand-edit `dist/` — but the generated plugin output is checked in because
   this repo has a real GitHub remote (`waldemarsson/trailmix`) and marketplace installs need to
   read `.claude-plugin/marketplace.json` / `.github/plugin/marketplace.json` straight from the
   repo. Installed copies (`.claude|.github/{skills,agents}` from self-testing an install into
   this repo) stay gitignored/absent. Guard against drift two ways: (a) locally,
   `scripts/verify.sh` regenerates `dist/` and fails (`git status --porcelain -- dist/`) if that
   differs from what's committed; (b) in CI, `.github/workflows/build-dist.yml` runs on every
   push to `main` that touches `src/**`/`build/**`/`package.json`, rebuilds, and auto-commits +
   pushes `dist/` if it drifted — so you never have to remember to build-then-commit-then-push
   yourself. Checked against three real published CC plugins (caveman, ponytail, honey-for-devs):
   all commit generated output directly to their repo the same way; none use GitHub Release
   assets for plugin install (marketplace `source` only supports git/npm sources, never a
   downloaded artifact) — the closest real analog any of them uses is publishing to npm
   separately, which trailmix isn't doing.
2. **This repo has no root instruction file yet — now moot.** Previously an open question about
   whether self-installing locally might clobber a hand-authored root file; there's no installer
   left to do that (decision #7), so the question no longer applies. This repo stays source-only;
   nothing writes to its own root.
3. **Model names** in `build/maps/models.json` are indicative — pin exact names for the account.
4. **All skill/agent names are prefixed `trailmix-`** (`trailmix-discuss`, `trailmix-explorer`,
   etc.), renamed from bare names this session. Why: `install.sh` copies skills/agents flat into
   `.claude/skills`, `.claude/agents` — CC's "standalone" path, which does **not** auto-namespace
   (that only happens for real plugin installs or a nested `<name>@skills-dir` folder, neither of
   which `install.sh` does today). GHCP has **no** namespacing mechanism at all, ever — even
   inside a proper plugin, colliding names silently shadow one another (confirmed against GHCP's
   plugin reference). Bare names like `review`/`plan` would've collided with CC built-ins. Prefix
   is now the only cross-platform-safe guarantee.
   ⚠️ Open follow-up: `install.sh`'s CC path could additionally nest `dist/claude/` as a single
   `.claude/skills/trailmix/` folder (with its `.claude-plugin/plugin.json` intact) to pick up
   CC's automatic `trailmix:` colon-namespacing UX on top of the prefix — not done yet, purely a
   nicer invocation UX, not required for correctness since the prefix already prevents collisions.
5. **Remote GitHub install needed a fix, discovered by actually testing it.** The user tried
   `copilot plugin marketplace add <blob URL to marketplace.json>` and it failed — a GitHub blob
   URL isn't git-clonable. Digging in surfaced a deeper issue: both CLIs' `marketplace add
   owner/repo` require the marketplace manifest at the cloned repo's *root* and neither documents
   a subdirectory form for that command, so `dist/claude/` and `dist/ghcp/` living side by side
   under one root were never going to resolve via plain `owner/repo`.
   First fix attempt (reverted): a CI workflow mirroring `dist/claude/` onto the root of a
   dedicated `claude` branch. Works, but the user flagged it as unnecessary complexity — right
   call, because there's a simpler option: `marketplace.json` plugin entries support a relative
   `source` path, and `owner/repo` marketplace-add clones the *whole* repo (not just one file), so
   relative sources resolve fine. `build/generate.mjs`'s new `writeRootMarketplaces()` now emits
   two tiny catalogs straight at the actual repo root — `.claude-plugin/marketplace.json` with
   `source: "./dist/claude"`, `.github/plugin/marketplace.json` with `source: "./dist/ghcp"` —
   so plain `/plugin marketplace add waldemarsson/trailmix` and `copilot plugin marketplace add
   waldemarsson/trailmix` both resolve with no branch, no CI, and no root restructuring. GHCP
   separately also supports a direct `copilot plugin install owner/repo:dist/ghcp` (no marketplace
   step at all), documented as an alternative. `scripts/verify.sh`'s staleness check now also
   covers the two root marketplace files, not just `dist/`. README's "Install as a plugin" has
   the current commands for both.
6. **CC's dist output is unprefixed; GHCP's stays `trailmix-*`.** Static review (structure/schema
   check, no live install) surfaced that a real CC plugin install would show
   `/trailmix:trailmix-discuss` — redundant, because CC auto-namespaces every plugin component by
   the plugin's own name (`trailmix`), so the manual `trailmix-` prefix (added for the *standalone*
   `install.sh` path, which never auto-namespaces) doubled up once real plugin install also
   started working (decision #5). Fix: `build/generate.mjs` now strips the `trailmix-` prefix —
   folder names, frontmatter `name`, descriptions, body cross-references, and `AGENTS.md` — for
   the `claude` platform only; `dist/ghcp/` is untouched (GHCP never auto-namespaces, plugin or
   not, so it still needs the manual prefix as its only collision guard). This meant
   `install.sh`'s CC path could no longer flatten `dist/claude/skills/*` into `.claude/skills/`
   (bare names like `discuss`/`review` would collide with CC built-ins again, same failure mode as
   decision #4) — it now copies the whole `dist/claude/` tree as one nested
   `.claude/skills/trailmix/` folder instead, which CC loads as the `trailmix@skills-dir` plugin
   and auto-namespaces exactly like a marketplace install. Verified locally: `install.sh --claude`
   into a scratch dir produces `.claude/skills/trailmix/.claude-plugin/plugin.json` +
   `skills/discuss/`, `agents/explorer.md`, etc. Declined for now: automated `verify.sh` coverage
   of the actual `claude plugin marketplace add`/`install` flow (currently only structural/schema
   checks and the `install.sh` copy path are verified, not a live plugin install).
   ⚠️ Superseded by decision #7: `install.sh` (and the nested-skills-dir-plugin trick it used)
   was removed entirely a few turns later.
7. **Added a `SessionStart` hook, then removed `install.sh`/`install.ps1` entirely — marketplace
   is now the only install path.** Prompted by an external review recommending a
   SessionStart-hook + meta-skill pattern (verified against real examples: accurate for
   Superpowers, confirmed GHCP's `sessionStart` hook exists and supports `additionalContext`
   injection, but GHCP's per-prompt-firing bug — github/copilot-cli#991 — was closed as fixed
   2026-04-08, and the "Caveman uses hooks" claim in that review turned out to be false when
   checked against the actual repo).
   - **First iteration:** built a short, one-line reminder ("consult `trailhead` before writing
     code") — deliberately scoped down from the review's full meta-skill rearchitecture. CC's
     hook matches `startup|resume|clear|compact`; GHCP's only matches `sessionStart` (no
     clear/compact equivalent found). GHCP's `plugin.json` needs an explicit
     `"hooks": "hooks/hooks.json"` field (no default-folder auto-discovery there, unlike
     `skills/`/`agents/`); CC's doesn't.
   - Initially wired the hook into `install.sh` too (including fixing a **real bug**: `install.ps1`
     had never been updated for the decision #6 nested-skills-dir-plugin change, and GHCP's
     standalone hook path — confirmed to exist at `.github/hooks/*.json` / `~/.copilot/hooks/*.json`
     — had never been wired into `install_ghcp()` at all).
   - Then the user decided to **remove `install.sh`/`install.ps1` entirely**: marketplace-only
     install, no second path to maintain. Consequence flagged and accepted: a plugin's bundled
     `AGENTS.md`/`CLAUDE.md` was never auto-loaded from inside a plugin anyway (confirmed
     earlier — decision #5's research), so `install.sh` was the *only* thing that had ever
     delivered the full always-on core (style/tools/security) to a live session. First accepted
     that the one-line reminder was all that would survive; the user initially chose "keep it
     short" when asked directly.
   - **Second iteration, prompted by "how do other plugins handle this?":** checked what
     Superpowers' and Ponytail's hooks actually inject, not just that they have hooks. Found
     Superpowers injects its **entire** ~500-word `using-superpowers` meta-skill verbatim at every
     `SessionStart` (not a pointer), and Ponytail ships a whole stateful runtime
     (`ponytail-runtime.js`, `ponytail-mode-tracker.js`, etc.), not a static string. Neither
     validates a short-reminder approach — if anything they show the opposite pattern. Re-raised
     the question; **the user chose to expand the hook to the full `AGENTS.md` body**, matching
     Superpowers' actual approach rather than the more conservative, unvalidated one-liner.
     `src/hooks/session-start-message.txt` removed; `AGENTS.md`'s content is now both the bundled
     copy and the hook payload directly (same string, no separate source file).
   - **Real bug found and fixed during this expansion:** the GHCP `bash` hook field used `echo`
     to emit its `{"additionalContext": ...}` JSON. `echo` is not portable for this — POSIX
     `sh`/`dash` interpret backslash escapes (like the `\n` JSON uses for embedded newlines) in
     `echo`'s argument by default, while `bash`'s `echo` doesn't; the resulting real newline
     characters broke the receiver's JSON parse (confirmed: worked under `bash`, silently
     corrupted the JSON under `dash`, since `/bin/sh` is `dash` on this and most Linux systems).
     Fixed by switching both platforms' hook commands from `echo` to `printf '%s'`, which never
     interprets escapes in either shell — verified identical, valid output under both `bash` and
     `dash`. `scripts/verify.sh` now runs the GHCP hook under both shells as a regression guard.
   - `generate.mjs` no longer emits `dist/claude/CLAUDE.md` (pure dead weight without an
     installer to place it). `AGENTS.md` is still copied into each `dist/<platform>/` as a bundled
     copy of the same content the hook injects.
   - `scripts/verify.sh` rewritten from "install into mktemp dirs and assert layout" to
     "regenerate and assert `dist/claude`+`dist/ghcp`+root marketplace stubs are structurally
     sound plugins" (manifests present, valid JSON, hook commands actually execute under both
     `bash` and `dash` and produce valid output) — no CLI plugin install is run, per explicit
     user instruction not to.

## Next steps (pick up here)
- [x] **Decide commit-vs-gitignore for `dist/`** — committed to `main` (decision #1).
- [x] **First real commit** of the trailmix work (`dd28d5f`, includes the `trailmix-` rename).
- [ ] **Verify the real round-trip**: `/plugin marketplace add waldemarsson/trailmix` +
  `copilot plugin marketplace add waldemarsson/trailmix` once this is pushed (decision #5) — not
  yet confirmed end-to-end against the live repo. This is the "publish to CC + GHCP
  marketplaces" step — repo + generated catalogs are ready, just needs the live test.
- [ ] `evals/` — skill-behavior tests (architecture §11 step 5, still unbuilt), including
  whether `trailhead` actually gets invoked reliably — the empirical question the SessionStart
  hook (decision #7) is a backstop for, still unvalidated either way.
- [ ] Optional: pin exact model names; fill `author`/`homepage`/`repository` in
  `src/meta/plugin.meta.json`.
- [ ] Watch token cost in practice (decision #7): the hook now injects the full `AGENTS.md` body
  every session start/resume/clear/compact, not a one-liner. Keep `AGENTS.md` deliberately small
  (§8 title in `architecture.md`) so this stays cheap; revisit if it grows.

## Constraints (never violate)
- Every decision must work on BOTH GHCP and CC.
- Token efficiency baked in (JIT skills, disk-over-chat handoffs, cheap-model routing, GORP).
- Edit `src/` only — never `dist/`. `npm run build` after any `src/` or `build/maps/` change.
  Neutral agent `description` must stay single-line (generator's frontmatter parser). Node ≥ 16.7.
- No standalone installer — marketplace/plugin install (`dist/claude/`, `dist/ghcp/`, and the
  root `.claude-plugin/`/`.github/plugin/` marketplace stubs) is the only supported install path.
