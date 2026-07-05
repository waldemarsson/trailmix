# trailmix

A lightweight, portable, token-efficient agentic coding workflow that runs the same on
**GitHub Copilot CLI** and **Claude Code**.

One source of truth → generated assets for both CLIs. Author once, ship to both.

## The trail

trailmix guides a coding agent through five waypoints. The flow is *soft* — it scales detail
to the work, collapses phases for trivial changes, and pauses for a human checkpoint at each
waypoint. No rigid gates.

| Waypoint | What happens |
|---|---|
| **Discuss** | Explore the feature, smooth edge cases, research code + web. → `spec.md` |
| **Plan** | Interfaces, services, flows, endpoints — high level, no code blocks. → `plan.md` |
| **Implement** | Build and test the feature. |
| **Review** | Findings ranked HIGH / MEDIUM / LOW + recommendations. → `review.md` |
| **Document** | Document changes *of weight* only. |

Phase outputs (**artifacts**) are written to `.trailmix/trail/<feature-slug>/` — the human
reads them on disk, they don't get pasted back into the chat context.

## Install into a project

```bash
git clone <repo> trailmix && cd trailmix
npm run build            # generate dist/{claude,ghcp}
./install.sh --target /path/to/your/project
```

`install.sh` (and `install.ps1` on Windows) auto-detects which CLIs you have (`claude`,
`copilot`) and copies the right assets:

- **Claude Code** → `.claude/skills/`, `.claude/agents/`, root `AGENTS.md` **+ root `CLAUDE.md`**
- **Copilot CLI** → `.github/skills/`, `.github/agents/`, root `AGENTS.md`

Claude Code reads `CLAUDE.md`, **not** `AGENTS.md`, so the installer also writes a one-line
`CLAUDE.md` that imports `@AGENTS.md` — that's how the always-on core loads on Claude Code.
Copilot CLI reads root `AGENTS.md` natively.

Flags: `--target DIR`, `--global`, `--claude`, `--ghcp`. With no platform flag it installs for
every CLI found (both, if neither is detected). Installs are non-destructive: only trailmix's
own skills/agents are replaced, and existing `CLAUDE.md` / instruction files are merged, not
overwritten.

### Global install (all projects)

`--global` installs into each CLI's home config instead of one project:

```bash
./install.sh --global
```

- **Claude Code** → `~/.claude/skills/`, `~/.claude/agents/`, `~/.claude/AGENTS.md` +
  `~/.claude/CLAUDE.md` (import)
- **Copilot CLI** → `~/.copilot/skills/`, `~/.copilot/agents/`, and a trailmix-managed block in
  `~/.copilot/copilot-instructions.md`

> Global instruction files differ per CLI — there is **no** global `AGENTS.md` either tool
> loads by that name, so the core goes to `~/.claude/CLAUDE.md` and
> `~/.copilot/copilot-instructions.md` respectively.

## Install as a plugin

`npm run build` also emits plugin manifests and marketplace catalogs, so trailmix can be
installed through each CLI's plugin system.

**Claude Code** — `dist/claude/` is a plugin (`.claude-plugin/plugin.json` +
`marketplace.json`):

```
/plugin marketplace add ./dist/claude
/plugin install trailmix@trailmix
```

**Copilot CLI** — `dist/ghcp/` is a plugin (root `plugin.json` +
`.github/plugin/marketplace.json`):

```
copilot plugin install ./dist/ghcp
# or via marketplace:
copilot plugin marketplace add ./dist/ghcp
copilot plugin install trailmix@trailmix
```

> Note: plugins ship the skills and agents. The always-on `AGENTS.md` core (style + tool
> conventions + security) is a repo-root instruction file — use `install.sh` if you want that
> layer too.

## How it stays portable

Both CLIs implement the same Agent Skills open standard (`SKILL.md`). Copilot CLI reads a root
`AGENTS.md` natively; Claude Code reads `CLAUDE.md`, so the installer ships a `CLAUDE.md` that
imports `@AGENTS.md`. Only the mechanical bits differ — agent file shape, model/tool
vocabulary, instruction-file name, plugin manifest location. The generator hides those
differences.

| Asset | Source | Claude Code | Copilot CLI |
|---|---|---|---|
| Instructions | `src/instructions/AGENTS.md` | root `CLAUDE.md` → `@AGENTS.md` | root `AGENTS.md` |
| Skills | `src/skills/**/SKILL.md` | `.claude/skills/` | `.github/skills/` |
| Agents | `src/agents/*.agent.md` | `.claude/agents/*.md` | `.github/agents/*.agent.md` |
| Plugin manifest | `src/meta/plugin.meta.json` | `.claude-plugin/plugin.json` | root `plugin.json` |

Agent frontmatter is transformed per platform: neutral `tier` → model name
(`build/maps/models.json`), neutral tool aliases → platform tool names
(`build/maps/tools.json`), and the tool-list format (comma string vs JSON array).

## Repo layout

```
src/
  instructions/AGENTS.md      always-on core: bootstrap, style, tools, security
  skills/                     trailhead router + style skills + 5 waypoint skills
    <skill>/SKILL.md          tiny; detail lives in refs/ (loaded JIT)
  agents/*.agent.md           neutral agent specs (trailmix-explorer/implementer/reviewer/documenter)
  meta/plugin.meta.json       name/version/author → plugin manifests
build/
  generate.mjs                zero-dep generator: src/ → dist/{claude,ghcp}/
  maps/{models,tools}.json    neutral → platform mapping tables
dist/                         generated AND committed (published plugin; marketplace source)
docs/architecture.md          the full blueprint / design source of truth
install.sh / install.ps1      copy assets into a target project
```

## Develop

```bash
npm run build     # regenerate dist/ after editing anything in src/ or build/maps/
npm run verify    # build + install into throwaway temp dirs and assert layout (never this repo)
```

Editing rules:

- Change behavior in `src/` (never hand-edit `dist/` or an installed `.claude`/`.github`) —
  `dist/` is generated output, committed as the published plugin.
- Run `npm run build` after any `src/` or `build/maps/` change and commit the resulting `dist/`
  diff in the same commit; `npm run verify` fails if `dist/` is stale.
- Neutral agent `description` fields must stay single-line (the generator's frontmatter
  parser expects it).
- Pin exact model names in `build/maps/models.json` for your account.
- `npm run verify` installs only into `mktemp` dirs — it never writes anything else into this repo.
- Requires Node ≥ 16.7 (uses `fs.cpSync`).

## Token efficiency

Baked in at every layer:

- **JIT loading** — `SKILL.md` files are tiny; detail sits in `refs/*.md`, loaded only when a
  skill needs it.
- **Compact always-on core** — full style guidance lives in the `trailmix-terse` /
  `trailmix-lean-code` / `trailmix-gorp` skills; `AGENTS.md` carries only the compact version so
  it isn't re-sent every turn.
- **Disk over chat** — artifacts go to `.trailmix/…`; the human reads them, the context stays
  clean.
- **Context isolation** — phase work runs in subagents; the parent context stays lean.
- **Cheap-model routing** — read/explore/summarize/websearch on cheap models; implement on a
  reasoning model; review on a strong one.
- **GORP handoffs** — agent-to-agent messages are counts + exact commands + one-line findings
  with hard word caps, never pasted logs.

## License

MIT
