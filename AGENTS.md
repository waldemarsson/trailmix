# AGENTS.md — working on trailmix itself

This file is for agents *developing this repo*. Don't confuse it with
`src/instructions/AGENTS.md`, which is trailmix's shipped always-on core (generated into
`dist/*/AGENTS.md` and injected by the `SessionStart` hook). Editing one never implies editing
the other.

## What this repo is

A single neutral source (`src/`) plus a zero-dep generator (`build/generate.mjs`) that emits two
installable plugins: `dist/claude/` (Claude Code) and `dist/ghcp/` (GitHub Copilot CLI). The
product is markdown — skills, agents, instructions — not application code. `docs/architecture.md`
is the design source of truth; read it before changing structure.

## The one hard rule

**Edit `src/`, `build/`, `docs/` — never `dist/` or the two root
`marketplace.json` stubs.** Those are generated *and* committed. A hand-edit there is silently
overwritten by the next `npm run build`, and `.github/workflows/build-dist.yml` re-generates and
commits on every push to `main`.

## Commands

```bash
npm run build     # src/ → dist/{claude,ghcp} + root marketplace stubs
npm run verify    # build + freshness check + trail.mjs unit tests + frontmatter lint + structure checks
```

`npm run verify` is the full test suite — run it before handing work back. It **fails when
`dist/` is stale**; that's the freshness gate, not a bug. Fix it with `npm run build` and commit
the result. CI runs Node 24; `verify` needs Node ≥18 (`node --test`).

Nothing here installs to your machine or writes outside the repo.

## Generator constraints

- Neutral agent `description` fields must stay **single-line** — the generator's frontmatter
  parser doesn't handle folded values.
- Skill frontmatter uses only the common subset (`name`, `description`, `allowed-tools`).
  Platform-only keys come from optional neutral hints, not raw frontmatter.
- The Claude build **strips the `trailmix-` prefix** from skill/agent names, folders, and
  cross-references in prose (CC auto-namespaces; GHCP does not). Write source names with the
  prefix and let the generator drop it.
- Model pins and reasoning effort live in `build/maps/models.json` (GHCP: ordered fallback
  list), tool aliases in `build/maps/tools.json` — keyed by agent name, deliberately
  cross-vendor.
- Platform-only prose goes in `<!-- only:claude -->` / `<!-- only:ghcp -->` … `<!-- /only -->`
  blocks (skills, agent bodies, instructions); the other build drops them. Unbalanced markers
  fail the build.
- `src/instructions/AGENTS.md` must keep a `## Security` section: the generator injects it into
  trailmix's subagents via `SubagentStart`. Every hook context must stay under 10,000 chars (CC's
  cap); `verify.sh` checks both.
- Hook payloads shell-quote via `printf '%s'`, never `echo` — POSIX `sh`/`dash` expand
  backslash escapes and corrupt the embedded JSON. `verify.sh` guards this under `dash`.

## Versioning (semver)

Two files carry the version and **must always match**:

- `package.json` → `version`
- `src/meta/plugin.meta.json` → `version` (the generator's only source for plugin manifests and
  marketplace catalogs)

Nothing enforces the parity — bump both in the same commit, then `npm run build` so the
generated manifests follow.

**Bump only when generated plugin output changes.** Changes confined to `README.md`, `docs/`,
CI workflows, `.devcontainer/`, or `scripts/verify.sh` ship nothing to users — leave
the version alone.

Currently pre-1.0, so breaking changes land as **MINOR**, not MAJOR. Until 1.0:

| Bump | When |
|---|---|
| **MAJOR** | Reserved. Don't cut 1.0 without asking the human. |
| **MINOR** | Anything a user would notice or that breaks an existing trail: adding/removing/renaming a skill or agent, changing waypoint behavior or the checkpoint contract, changing artifact frontmatter schema or `.trailmix/trail/` paths, adding/removing/renaming a `trail.mjs` op, changing the always-on core in `src/instructions/AGENTS.md`, repointing a model in `models.json`. |
| **PATCH** | Same behavior, better execution: prose tightening in a skill or ref, typo and wording fixes, generator bugfixes that leave output semantics intact, tool-alias corrections. |

Post-1.0 the split shifts to: MAJOR = removals/renames/schema breaks (the MINOR row above),
MINOR = additive skills, agents, refs, and `trail.mjs` ops, PATCH = unchanged.

The bump goes in the commit that makes the change, mentioned in the body (`Bump to 0.4.0.`) —
a standalone "Bump version to X" commit is also fine. This repo uses **no git tags and no
changelog**; don't start either without being asked.

## Conventions

- Commit subjects: imperative, no conventional-commit prefix (the `chore:` commits are the
  dist bot's, not yours). Body explains *why*.
- Prose in `src/` follows trailmix's own style — terse, answer-first, no filler. The skills are
  the product; every extra line is a token every user pays for.
- `.trailmix/trail/` **is committed here** (unlike the gitignore-by-default advice trailmix gives
  target projects) — this repo's own trails are part of its history.
- trailmix is installed while working here: the trailhead → waypoint flow applies to work on
  this repo too.
