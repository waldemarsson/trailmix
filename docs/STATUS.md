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
- ✅ Installers `install.sh` / `install.ps1`: auto-detect CLIs, `--target`, `--claude`,
  `--ghcp`, **`--global`**. Item-scoped (non-destructive) copy; idempotent.
- ✅ README.md (install both paths, portability matrix, layout, dev, token levers).
- ✅ Removed `.github/copilot-instructions.md` (redundant — AGENTS.md covers it; staged as `D`).
- ✅ `scripts/verify.sh` (`npm run verify`) — builds + installs into throwaway `mktemp` dirs
  (never this repo), asserts project + global layout, checks import + managed block +
  idempotency, cleans up. This repo is NOT self-installed; no generated files at its root.

### CRITICAL correction made this session (affects design)
**Claude Code reads `CLAUDE.md`, NOT `AGENTS.md`** (verified at code.claude.com/docs/en/memory).
Earlier assumption "both read AGENTS.md" was WRONG. Fixes applied:
- Generator emits `dist/claude/CLAUDE.md` = `@AGENTS.md` (import).
- Installer writes root `CLAUDE.md` (project) / `~/.claude/CLAUDE.md` (global) importing AGENTS.md.
- GHCP CLI reads root `AGENTS.md` natively; its **global** instruction file is
  `~/.copilot/copilot-instructions.md` (installer writes a trailmix-managed block there).
- Global skills/agents dirs: CC `~/.claude/{skills,agents}`; GHCP `~/.copilot/{skills,agents}`
  (personal skills confirmed at `~/.copilot/skills`; agents mirror).
- Docs (README + architecture §matrix/§8/§10 install) corrected to match.

### Verified working
`npm run verify` (build + project & global installs into temp dirs, both CLIs, import +
managed block + idempotency + non-destructiveness). Also `bash -n` + `pwsh` parse. Verification
uses `mktemp` dirs only — the repo is never installed into and stays pure source.

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
2. **This repo has no root instruction file yet.** Open policy question (see chat): hand-author
   a committed root `AGENTS.md` (+ `CLAUDE.md` → `@AGENTS.md`) as contributor guidance that
   also dogfoods trailmix, vs. keep source-only and activate via a local (gitignored) install.
   If self-installing locally, consider a `--no-root` installer flag so it won't clobber an
   authored root file.
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

## Next steps (pick up here)
- [x] **Decide commit-vs-gitignore for `dist/`** — committed to `main` (decision #1).
- [x] **First real commit** of the trailmix work (`dd28d5f`, includes the `trailmix-` rename).
- [ ] **Verify the real round-trip**: `/plugin marketplace add waldemarsson/trailmix` +
  `copilot plugin marketplace add waldemarsson/trailmix` once this is pushed (decision #5) — not
  yet confirmed end-to-end against the live repo. This is the "publish to CC + GHCP
  marketplaces" step — repo + generated catalogs are ready, just needs the live test.
- [ ] `evals/` — skill-behavior tests (architecture §11 step 5, still unbuilt).
- [ ] Optional: pin exact model names; fill `author`/`homepage`/`repository` in
  `src/meta/plugin.meta.json`.
- [ ] Optional: nest `install_claude()`'s copy as `.claude/skills/trailmix/` (see decision #4) for
  the `/trailmix:discuss`-style colon namespacing on Claude Code.

## Constraints (never violate)
- Every decision must work on BOTH GHCP and CC.
- Token efficiency baked in (JIT skills, disk-over-chat handoffs, cheap-model routing, GORP).
- Edit `src/` only — never `dist/` or installed `.claude`/`.github` copies. `npm run build`
  after any `src/` or `build/maps/` change. Neutral agent `description` must stay single-line
  (generator's frontmatter parser). Node ≥ 16.7.
