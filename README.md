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
| **Discuss** | Researches the code (and web) in parallel, then asks batched, numbered clarify questions — each with a recommended default — until nothing is open. → `brief.md` | answer rounds (`defaults, except 2: yes`); sign off on a short digest that lists every consequential decision, plus the branch to work on (and a dirty-tree flag) |
| **Build** | Plans tasks, implements TDD-style, self-reviews, auto-fixes clear in-scope findings while fixes converge (≤4 rounds), updates docs. Posts one progress line per milestone; stops only for real blockers. | nothing, unless asked a blocker question |
| **Handoff** | Verdict, what needs your call, how to try it, AC → proof, deviations. Fixes follow-ups until you accept. → `report.md` | review the diff, pick follow-ups, accept; then opt in (default no) to commit, push, and a draft PR |

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

Each artifact carries small YAML frontmatter: the anchor `brief.md` holds the trail's identity,
build progress (`tasks:`), and the git `branch:` recorded at sign-off, `report.md` holds the
findings left for you (`findings:`), and both have a `status:` (`draft` → `approved` — the brief
when you sign off on the digest, the report when you accept; a brief can also be `dropped`).
Because that state lives on disk, a fresh session can pick up where you left off — just
ask:

```
resume the <feature-slug> trail
```

trailhead reads the **frontmatter only** (not the full artifacts), reports where the trail stands,
and continues from the right waypoint, warning when the current git branch isn't the one the
brief recorded. Ask for trail *status* the same way to survey trails: done and dropped ones collapse into a count line
(`status --all` lists them). To abandon a trail, ask to drop it — it's marked `dropped`, nothing
is deleted, and `approve` or `reopen` undoes it. No `trail.json`, no CLI — just the frontmatter
on disk.

This isn't just crash recovery — it's the recommended flow. The signed-off brief is the
distilled version of everything discussed, so clearing (or starting a fresh session) after the
discuss checkpoint sheds the dead-weight context and costs nothing. Mid-build the brief's
`tasks:` marks do the same at task granularity.

Trails from before 0.7.0 (spec/plan/review layout) are not supported.

`.trailmix/` is working state: **gitignore it by default** (resume still works on your machine —
the files are just untracked). Commit it instead if you want trails resumable across machines or
by teammates.

## Install

Install as a plugin through each CLI's marketplace:

**Claude Code**:

```
/plugin marketplace add waldemarsson/trailmix
/plugin install trailmix@trailmix-marketplace
```

Skills and agents auto-namespace under the plugin name (`trailmix:discuss`,
`trailmix:explorer`).

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

A `SessionStart` hook injects trailmix's always-on core (bootstrap, style, tool conventions,
security) into each session; trailmix's own subagents get its Security section.

## Develop

`src/` is the single source; a zero-dep generator emits both plugins into `dist/`. Contributor
rules and commands: [`AGENTS.md`](AGENTS.md). Design, portability, and token strategy:
[`docs/architecture.md`](docs/architecture.md).

## License

MIT
