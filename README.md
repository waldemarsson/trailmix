# trailmix

A lightweight, portable, token-efficient agentic coding workflow that runs the same on
**GitHub Copilot CLI** and **Claude Code**.

One source of truth → generated assets for both CLIs. Author once, ship to both.

## The trail

trailmix guides a coding agent through three waypoints. Your attention goes to two places:
clearing up uncertainty before build, and reviewing the result after it. Everything in between
runs on its own. No rigid gates.

| Waypoint | What happens | You |
|---|---|---|
| **Discuss** | Researches the code (and web) in parallel, then asks batched, numbered clarify questions — each with a recommended default — until nothing is open. → `brief.md` | answer rounds (`defaults, except 2: yes`); sign off on a ≤5-bullet digest |
| **Build** | Plans tasks, implements TDD-style, self-reviews, auto-fixes clear in-scope findings (max 2 rounds), updates docs. Stops only for real blockers. | nothing, unless asked a blocker question |
| **Handoff** | Verdict, what needs your call, how to try it, AC → proof, deviations. Fixes follow-ups until you accept. → `report.md` | review the diff, pick follow-ups, accept; then commit / open the PR yourself |

No trail is the default. Small, localized work with unambiguous intent (a clear fix, a rename,
config, docs, tests) and read-only questions skip it entirely; when it's unclear, the agent asks.
A trail is for work with something to clarify, or that spans modules, contracts, or data. Its
brief scales to the work; a defect gets a bug brief, and build writes a failing test that
reproduces it before any fix.

Discuss is the waypoint that matters most. Build runs without you, so every question and edge
case is settled before the brief is written.

Artifacts are written to `.trailmix/trail/<feature-slug>/`. Chat gets the digest and the handoff
summary; the full brief and report stay on disk.

## Resume & status

Each artifact carries small YAML frontmatter: the anchor `brief.md` holds the trail's identity
and build progress (`tasks:`), `report.md` holds the findings left for you (`findings:`), and
both have a `status:` (`draft` → `approved` — the brief when you sign off on the digest, the
report when you accept). Because that state lives on disk, a fresh session can pick up where you left off — just
ask:

```
resume the <feature-slug> trail
```

trailhead reads the **frontmatter only** (not the full artifacts), reports where the trail stands,
and continues from the right waypoint. Ask for trail *status* the same way to survey every trail.
No `trail.json`, no CLI — just the frontmatter on disk.

This isn't just crash recovery — it's the recommended flow. The signed-off brief is the
distilled version of everything discussed, so clearing (or starting a fresh session) after the
discuss checkpoint sheds the dead-weight context and costs nothing. Mid-build the brief's
`tasks:` marks do the same at task granularity.

Trails from before 0.7.0 (spec/plan/review layout) are not supported.

`.trailmix/` is working state: **gitignore it by default** (resume still works on your machine —
the files are just untracked). Commit it instead if you want trails resumable across machines or
by teammates.

## Install

trailmix is installed only as a plugin, through each CLI's own marketplace/plugin system —
there's no standalone installer script. `npm run build` emits the real per-platform plugins
(`dist/claude/`, `dist/ghcp/`) plus two tiny root-level marketplace catalogs
(`.claude-plugin/marketplace.json`, `.github/plugin/marketplace.json`) that each point at the
matching `dist/` subdirectory via a relative `source`. `owner/repo`-style marketplace-add clones
the whole repo, so those relative paths resolve — no branch or subdirectory support needed from
either CLI:

**Claude Code**:

```
/plugin marketplace add waldemarsson/trailmix
/plugin install trailmix@trailmix-marketplace
```

Skills and agents auto-namespace under the plugin name (`trailmix:discuss`,
`trailmix:explorer`), and a `SessionStart` hook ships with it.

**Copilot CLI**:

```
copilot plugin marketplace add waldemarsson/trailmix
copilot plugin install trailmix@trailmix-marketplace
# or, skipping the marketplace, install the dist/ghcp subdirectory directly:
copilot plugin install waldemarsson/trailmix:dist/ghcp
```

GHCP never auto-namespaces, so skills/agents keep the manual `trailmix-` prefix as their only
collision guard against built-ins.

Both also work from a local clone, pointing straight at the platform subdirectory:

```
/plugin marketplace add ./dist/claude
copilot plugin marketplace add ./dist/ghcp
```

Both platforms' plugins ship a `SessionStart` hook that injects the full `AGENTS.md` always-on
core (bootstrap, style, tool conventions, security) as context when a session starts or resumes
(CC also on clear/compact/fork). This is the **only** always-on mechanism: neither CLI
automatically reads a file named `AGENTS.md`/`CLAUDE.md` from inside an installed plugin, so the
hook — not the bundled file — is what actually reaches a live session. Subagents don't see that
context, so a `SubagentStart` hook gives trailmix's own agents the core's Security section.

## How it stays portable

Both CLIs implement the same Agent Skills open standard (`SKILL.md`) and the same plugin system
shape (`.claude-plugin/`/root `plugin.json`, `skills/`, `agents/`, `hooks/hooks.json`). Only the
mechanical bits differ — agent file shape, model/tool vocabulary, hook JSON schema, plugin
manifest location. The generator hides those differences.

| Asset | Source | Claude Code | Copilot CLI |
|---|---|---|---|
| SessionStart hook (always-on core) | `src/instructions/AGENTS.md` | `hooks/hooks.json` (`SessionStart`) | `hooks/hooks.json` (`sessionStart`) |
| SubagentStart hook (Security section) | `src/instructions/AGENTS.md` | `hooks/hooks.json` (`SubagentStart`) | `hooks/hooks.json` (`subagentStart`) |
| Skills | `src/skills/**/SKILL.md` (`trailmix-*`) | `skills/*` (bare name, auto-namespaced) | `skills/trailmix-*` |
| Agents | `src/agents/*.agent.md` (`trailmix-*`) | `agents/*.md` (bare name, auto-namespaced) | `agents/trailmix-*.agent.md` |
| Plugin manifest | `src/meta/plugin.meta.json` | `.claude-plugin/plugin.json` | root `plugin.json` |
| Bundled copy (same content, not auto-loaded) | `src/instructions/AGENTS.md` | `AGENTS.md` | `AGENTS.md` |

Agent frontmatter is transformed per platform: each agent's neutral name → model and reasoning
effort (`build/maps/models.json`; GHCP gets an ordered model fallback list), neutral tool
aliases → platform tool names (`build/maps/tools.json`), the tool-list format (comma string vs
JSON array), and preloaded skills (`trailmix:gorp` on CC, `trailmix-gorp` on GHCP). Prose that
only one CLI should see sits in `<!-- only:claude -->` / `<!-- only:ghcp -->` … `<!-- /only -->`
blocks — e.g. CC skills name the helper path via `${CLAUDE_PLUGIN_ROOT}`, which CC fills in. CC's build also
strips the manual `trailmix-` prefix from every skill/agent name (folder, frontmatter `name`, and
cross-references in prose): CC auto-namespaces plugin components by the plugin's own name, so
`discuss` ships as `discuss` and is invoked as `trailmix:discuss`.

## Repo layout

```
src/
  instructions/AGENTS.md      always-on core: bootstrap, style, tools, security
  skills/                     trailhead router + style skills + 3 waypoint skills
    <skill>/SKILL.md          tiny; detail lives in refs/ (loaded JIT)
  agents/*.agent.md           neutral agent specs (trailmix-explorer/implementer/reviewer/documenter)
  meta/plugin.meta.json       name/version/author → plugin manifests
build/
  generate.mjs                zero-dep generator: src/ → dist/{claude,ghcp}/
  maps/{models,tools}.json    neutral → platform mapping tables
  trail.test.mjs              trail.mjs unit tests
dist/                         generated AND committed (published plugin; marketplace source)
.claude-plugin/marketplace.json  generated: root catalog, source → ./dist/claude
.github/plugin/marketplace.json  generated: root catalog, source → ./dist/ghcp
docs/architecture.md          the full blueprint / design source of truth
```

## Develop

```bash
npm run build     # regenerate dist/ after editing anything in src/ or build/maps/
npm run verify    # build + freshness check + trail.mjs tests + frontmatter lint + structure checks
```

Editing rules:

- Change behavior in `src/` (never hand-edit `dist/`) — `dist/` is generated output, committed
  as the published plugin.
- You don't need to run `npm run build` and commit `dist/` yourself before pushing to `main`:
  `.github/workflows/build-dist.yml` regenerates it and pushes a follow-up commit if it drifted.
  Running `npm run build` locally is still useful to preview output; `npm run verify` fails if
  `dist/` is stale, as a local safety net.
- Neutral agent `description` fields must stay single-line (the generator's frontmatter
  parser expects it).
- Pin exact model names in `build/maps/models.json` for your account.
- `npm run verify` only reads/regenerates files in this repo (`dist/`, the root marketplace
  stubs) — it doesn't install anything anywhere.
- Requires Node ≥ 18 (`npm run verify` uses `node --test`; the generator alone needs ≥ 16.7 for `fs.cpSync`).

## Token efficiency

Baked in at every layer:

- **JIT loading** — `SKILL.md` files are tiny; detail sits in `refs/*.md`, loaded only when a
  skill needs it.
- **Loaded once per session, not per turn** — the `SessionStart` hook injects the full
  always-on core at session boundaries, not on every message; the fuller
  worked examples in `trailmix-terse` / `trailmix-lean-code` / `trailmix-gorp` stay JIT-pulled
  skills rather than part of the hook payload.
- **Disk over chat** — artifacts go to `.trailmix/…`; the human reads them, the context stays
  clean.
- **Context isolation** — research, implementation, review, and docs run in subagents; the
  orchestrator's context stays lean.
- **Cheap-model routing** — the explorer (read/summarize/websearch) runs on a cheap model;
  every other agent's model is pinned per agent in `build/maps/models.json` — adjust to taste.
- **GORP handoffs** — agent-to-agent messages are counts + exact commands + one-line findings
  with hard word caps, never pasted logs.

## License

MIT
