# trailmix — architecture & structure

A portable, token-efficient agentic coding framework. One workflow — **Discuss → Build →
Handoff** — that runs on both **GitHub Copilot CLI (GHCP)** and
**Claude Code (CC)** from a single source.

Status: **implemented.** This document is the design source of truth; history lives in git.

Locked decisions: single neutral source + generator · soft rigidity (auto-trigger skills,
two human checkpoints — before build and after it — no gate engine) · single adaptive flow · always-on SessionStart
hook (injects the full AGENTS.md instruction file — the only always-on delivery mechanism) +
terse prose + lean code + GORP handoffs · marketplace-only install, no standalone installer ·
light theming (functional agent names, themed suite concepts).

---

## 1. Why skills-first is portable

Both CLIs share enough primitives that the methodology can be authored once:

| Primitive | CC | GHCP | Strategy |
|---|---|---|---|
| **Skills** (`SKILL.md`, open standard) | `skills/` (plugin root, auto-namespaced) | `skills/` (plugin root, flat) | author once, ship to both |
| Custom agents | `agents/*.md` | `agents/*.agent.md` | generate per platform |
| Per-agent model + effort | alias (`sonnet/haiku…`) + `effort` | ordered model fallback list + `reasoning-effort` | map per agent name |
| Tool names | `Read/Edit/Grep/Bash…` | `read/edit/search/execute…` (aliases) | map from neutral alias |
| Skill preload in agents | `skills:` (plugin-scoped `trailmix:gorp`) | `skills:` (`trailmix-gorp`) | from neutral agent `skills` |
| JIT skill loading | yes | yes | core of the token strategy |
| **SessionStart hook** | `hooks/hooks.json`, matcher `startup\|resume\|clear\|compact\|fork` | `hooks/hooks.json`, `sessionStart` (startup/resume/new; nothing fires after compaction) | the **only** always-on mechanism (see §8) |
| **SubagentStart hook** | `SubagentStart`, matcher `^trailmix:`, `hookSpecificOutput.additionalContext` | `subagentStart`, matcher `trailmix-`, `additionalContext` | Security section into trailmix's own subagents (see §8) |
| Skill-text path substitution | `${CLAUDE_PLUGIN_ROOT}` filled in when a skill loads | none (skills resolve from their base dir) | `<!-- only:claude -->` block names the helper path |
| **AGENTS.md** | bundled reference only — **not auto-loaded from inside a plugin** | same — GHCP's native root-`AGENTS.md` read doesn't apply to plugin-bundled files | authored once, informs the hook message; not itself delivered |
| Plugins + marketplace | `.claude-plugin/plugin.json` + root `.claude-plugin/marketplace.json` (source → `./dist/claude`) | root `plugin.json` + root `.github/plugin/marketplace.json` (source → `./dist/ghcp`) | the only supported install path — no standalone installer |

Portable by construction: **skills** (methodology) and the **SessionStart hook** (the one
always-on instruction, kept deliberately short). Only mechanical differences (agent file shape,
model/tool vocab, hook JSON schema, manifest location) get hidden behind the generator.

---

## 2. Naming / theme glossary (light)

Agents keep **functional** names (clear descriptions drive dispatch). Suite concepts carry the
trail-mix flavor:

| Term | Meaning |
|---|---|
| **trailmix** | the framework |
| **trailhead** | bootstrap/router skill — activates the system, points to the right waypoint |
| **waypoint** | one phase (discuss/build/handoff) |
| **trail crew** | the subagents collectively |
| **GORP** | the compact agent→agent handoff convention (internal name; keep it while it amuses) |
| artifact | a phase output file on disk (`brief.md`, `report.md`) — plain term, no theme |
| skills / skill library | the collection of trailmix skills — plain term, no theme |

---

## 3. Source repo layout (single source of truth)

```
trailmix/                              # framework SOURCE repo (produces installable assets)
├── README.md
├── docs/
│   └── architecture.md                # this file
├── src/                               # neutral, platform-agnostic
│   ├── skills/                        # skill library — open-standard SKILL.md (small bodies + JIT refs)
│   │   ├── trailmix-trailhead/SKILL.md
│   │   │   └── refs/{trail-metadata.md,trail.mjs}
│   │   ├── trailmix-discuss/SKILL.md
│   │   │   └── refs/{brief-template.md,bug-template.md}
│   │   ├── trailmix-build/SKILL.md
│   │   │   └── refs/{verification.md,review-checklist.md,weight-heuristics.md,doc-conventions.md}
│   │   ├── trailmix-handoff/SKILL.md
│   │   │   └── refs/report-template.md
│   │   ├── trailmix-terse/SKILL.md      # always-on prose compression
│   │   ├── trailmix-lean-code/SKILL.md  # always-on minimal code
│   │   └── trailmix-gorp/SKILL.md       # agent→agent dense handoff
│   ├── agents/                        # neutral agent specs (one file each)
│   │   ├── trailmix-explorer.agent.md
│   │   ├── trailmix-implementer.agent.md
│   │   ├── trailmix-reviewer.agent.md
│   │   └── trailmix-documenter.agent.md
│   ├── instructions/
│   │   └── AGENTS.md                  # source of the SessionStart hook's injected content;
│   │                                   # bundled as-is too, but NOT auto-loaded from a plugin
│   └── meta/
│       └── plugin.meta.json           # name/version/author/component map (for later plugin pkg)
├── build/
│   ├── generate.mjs                   # neutral src → dist/{claude,ghcp}
│   ├── trail.test.mjs                 # trail.mjs unit tests (node --test)
│   └── maps/                          # JSON (Node-native, zero-dep generator)
│       ├── models.json                # agent name → platform model name
│       └── tools.json                 # neutral alias → platform tool name(s)
├── dist/                              # GENERATED, committed (published plugin; marketplace source)
│   ├── claude/{skills/,agents/*.md,hooks/hooks.json,.claude-plugin/plugin.json}
│   └── ghcp/{skills/,agents/*.agent.md,hooks/hooks.json,plugin.json}
├── .claude-plugin/marketplace.json    # GENERATED, root catalog: source → ./dist/claude
└── .github/plugin/marketplace.json    # GENERATED, root catalog: source → ./dist/ghcp
```

Install is marketplace-only, no standalone installer: `/plugin marketplace add owner/repo` (CC)
/ `copilot plugin marketplace add owner/repo` (GHCP) read the root marketplace stubs above, which
point at `dist/claude/` and `dist/ghcp/` respectively. GHCP also supports installing
`dist/ghcp/` directly via `copilot plugin install owner/repo:dist/ghcp`, no marketplace step.

---

## 4. The trail — three waypoints (soft, adaptive)

Each waypoint is a skill that **auto-triggers on intent**, pulled only on reaching it. No state
machine. Human attention goes to two places: clearing uncertainty **before** build, and
reviewing the result **after** it (plus the PR review downstream). Build runs on its own in
between.

Sizing is binary and defaults to **no trail**: read-only work, and localized changes with
unambiguous intent (a clear fix, a rename, config, docs, tests), just get done. **Trail** is for
open questions or edge cases, design choices, multi-module or public-contract changes,
migrations, or security-sensitive code; the brief scales to the work. Unsure → ask the human in
one line with a recommendation.
A defect in existing behavior is a **bug** brief (`kind: bug`, repro steps, expected vs actual —
`trailmix-discuss/refs/bug-template.md`); build's first task is the red test, failing before
any fix exists.

Artifacts live in the target project at: `.trailmix/trail/<feature-slug>/`.

| # | Waypoint (skill) | Does | Subagent / model tier | Human | Artifact |
|---|---|---|---|---|---|
| 0 | **trailmix-trailhead** | Detect "we're building something", size it, name the slug, route; resume/status | main | — | — |
| 1 | **trailmix-discuss** | Parallel research first, then batched numbered clarify rounds (each question with a recommended default) until nothing that changes behavior, scope, or a contract is open | **trailmix-explorer** (cheap), in parallel | answers rounds; signs off on a short digest in chat that lists every consequential decision | `brief.md` |
| 2 | **trailmix-build** | Autonomous: plan tasks into the brief's `## Build notes`, implement TDD, self-review, fix, update docs | **trailmix-implementer**, **trailmix-reviewer** (read-only), **trailmix-documenter** | none, unless blocked | code + tests + docs (git diff) |
| 3 | **trailmix-handoff** | Write the report, surface it in chat, run the follow-up loop until accepted | **trailmix-implementer** + **trailmix-reviewer** for follow-ups | reviews the diff, picks follow-ups, accepts | `report.md` |

The skills are the spec; this section records why they're shaped this way. Read the skill for
the rules.

**Discuss** carries the most weight because build is autonomous: anything left open becomes a
guess, and a wrong guess costs a rebuild. So research runs first (never ask what code can
answer), clarify rounds batch questions with recommended defaults so the human can answer in one
line, and the reviewer challenges the brief in read-only brief mode before sign-off. The
checkpoint is a short chat digest, not a document read, so it must surface every consequential
decision. Git setup (branch, dirty tree) is settled at the same checkpoint so build never has to
pause for it; trailmix never stashes or commits on its own.

**Build** runs without the human. Planning appends to the brief (no separate plan artifact, no
re-approval). Implementers run sequentially in chunks (one working tree), each in a fresh
context. Self-review findings are auto-fixed while fixes converge, with a hard round ceiling; what
needs judgment goes to the human via the report. A default **decision-rights** contract (decide
reversible, internal things; escalate contracts, dependencies, data, security, deploy) replaces
per-decision pauses; a brief's **Autonomy** line overrides it. The only pause is stop-and-ask
for a real blocker. Thresholds (chunk size, round ceiling) are first guesses, to tune.

**Handoff** shows the human the result, not documents about it: verdict, what needs their call,
how to try it. The follow-up loop reuses build's implementer and delta re-review. Acceptance
optionally ends in commit/push/draft PR, opt-in and scoped to the trail's own files.

**Trail metadata & resume.** At most two artifacts with minimal frontmatter; only the fields
that can't be derived (`status`, `tasks`, `findings`, `branch`) are stored. Every read and
transition goes through `trailmix-trailhead/refs/trail.mjs`, a zero-dep Node helper, so the LLM
never hand-edits YAML or types a status it could misspell: it names an intent and the helper owns
the vocabulary. The helper is a **pure data tool** — no gates, no enforced ordering, no state
machine — and it's invoked by path inside the installed plugin, not put on PATH, so it isn't a
`trailmix` CLI. On CC the skills name it via `${CLAUDE_PLUGIN_ROOT}`; elsewhere it resolves from
the skill's base directory, since plugin-root env vars aren't set for the model's tool shell.
Without `node` it falls back to an awk read and hand-edits. Schema, ops, and the resume
derivation: `trailmix-trailhead/refs/trail-metadata.md`. Trails from the old five-waypoint
layout are not supported.

---

## 5. The trail crew — agents (generated per platform)

Authored once as neutral `<name>.agent.md` (frontmatter + body); generator emits
`dist/claude/agents/<n>.md` and `dist/ghcp/agents/<n>.agent.md`, mapping agent name→model
(`build/maps/models.json`) and neutral tools→platform tools; the markdown body carries over
verbatim.

| Agent | Role | Tools (neutral) | Isolation |
|---|---|---|---|
| **trailmix-explorer** | Read codebase + web research, summarize | read, search, web | read-only |
| **trailmix-implementer** | Code + tests (TDD) + verification; applies fixes | read, edit, search, shell | read/write |
| **trailmix-reviewer** | Senior self-review vs the brief; findings + verdict to the orchestrator. Brief mode: challenges the brief for gaps before the digest | read, search, shell | **read-only (discipline)** |
| **trailmix-documenter** | Update repo docs by weight + agent retro | read, edit, search, shell | read/write |

Models and effort per agent: `build/maps/models.json`.

Every agent preloads `trailmix-gorp` (`skills:`), so the return contract is in context from the
first turn. The reviewer's read-only stays prompt discipline: CC documents no command-level
allowlist for an agent's `tools` (a specifier in `disallowedTools` removes the whole tool), and
GHCP agent `tools` take no patterns.

Tier words in waypoint prose ("cheap") describe *intent*;
`models.json` pins what each agent actually gets, keyed by agent name — adjust per account.

Neutral agent spec (example shape — model comes from `models.json`, not frontmatter):

```yaml
name: trailmix-reviewer
description: Senior read-only code reviewer — reviews the uncommitted implementation against the brief and returns HIGH/MED/LOW findings with a clear verdict. Never edits anything.
tools: [read, search, shell]
```

---

## 6. GORP — the token-efficient handoff convention

Purpose: shrink **agent→agent** handoffs (never user-facing prose) losslessly. Phase 1 is a
**convention**, not a new parser — adopt a dense encoding later if measured worth it.

Rules live in the `trailmix-gorp` skill; each agent sets its own word cap.

Optional later: a real columnar/keyed encoding (à la honey/ESON) for large structured returns,
plus a lossy-but-recoverable sampler for huge uniform tool output.

---

## 7. Style skills — always-on seasoning (with hard safety carve-outs)

| Skill | From | Effect | Never compresses (carve-outs) |
|---|---|---|---|
| **terse** | caveman | Answer-first prose, drop filler/hedging/narration | code, commands, errors, file paths — **verbatim** |
| **lean-code** | ponytail | YAGNI ladder: needs to exist? → stdlib → native → existing dep → one line → min block | input validation, error handling, auth, secrets, migrations, deletes, anything the user explicitly asked for |
| **gorp** | honey | Dense agent→agent handoffs (§6) | fires only agent-facing, never user answers |

These are the *default writing style*; they must be always-on to pay off. Carve-outs are
non-negotiable — **lazy ≠ broken.**

---

## 8. Instructions — `AGENTS.md` (bundled reference) + the SessionStart hook (the always-on core)

`src/instructions/AGENTS.md` is the single source for trailmix's always-on conventions —
bootstrap, style, tool conventions, security — kept tiny, detail pushed into skills (JIT). It is
copied verbatim into `dist/{claude,ghcp}/AGENTS.md` for humans browsing the installed plugin,
but **neither CLI auto-loads a file by this name (or `CLAUDE.md`) from inside an installed
plugin.** There is no standalone installer that would place it at a project/global root either
(marketplace-only install, decided after weighing it against a standalone installer). So
the bundled `AGENTS.md` file itself never reaches a live session.

The **only** always-on mechanism is the `SessionStart` hook: the *same* `AGENTS.md` content is
injected as `additionalContext` (CC: plain stdout; GHCP: `{"additionalContext": ...}` JSON) at
session start/resume (CC also covers `clear`/`compact`/`fork`; GHCP fires on startup/resume/new
and has nothing after compaction).
It injects the full core rather than a one-line pointer, the pattern Superpowers' `SessionStart`
hook uses; a pointer depends on the agent choosing to load more. The core is kept small, and it's
sent per session boundary, not per turn.

Subagents don't inherit that context. A `SubagentStart` hook (matched to trailmix's own agents)
injects the core's `## Security` section, verbatim, so the non-negotiable rules reach the agents
that actually read files and run commands. Every hook context stays under CC's 10,000-char cap
(beyond it Claude only gets a file path + preview); `verify.sh` checks it.

Contents: bootstrap, style defaults, tool conventions, security (which overrides everything).

---

## 9. The generator — hiding the differences

`build/generate.mjs` reads `src/` and writes `dist/claude/` + `dist/ghcp/`.

**Skills:** copy `SKILL.md` near-verbatim to both; neutral frontmatter uses only the common
subset (`name`, `description`, `allowed-tools`); there are no per-platform frontmatter keys.
`refs/` copied as-is (JIT).

**Agents:** neutral yaml → CC `<n>.md` and GHCP `<n>.agent.md`, mapping agent name→model +
effort (`build/maps/models.json` — CC alias + `effort`; GHCP ordered fallback list +
`reasoning-effort`; see the §5 table), neutral tools→platform tools, and neutral `skills`
→ preloaded skills (CC plugin-scoped `trailmix:<skill>`).

**Platform-only prose:** `<!-- only:claude -->` / `<!-- only:ghcp -->` … `<!-- /only -->`
blocks in skills, agent bodies, and `AGENTS.md` are kept (markers dropped) for that platform and
removed for the other; unbalanced markers fail the build. Used for CC's `${CLAUDE_PLUGIN_ROOT}`
helper path and GHCP's autopilot note in `trailmix-build`.

**Tool aliases** (`build/maps/tools.json`): neutral set mirrors GHCP aliases; map to CC caps.

| neutral | CC | GHCP |
|---|---|---|
| read | `Read` | `read` |
| edit | `Edit, Write` | `edit` |
| search | `Grep, Glob` | `search` |
| shell | `Bash` | `execute` |
| web | `WebSearch, WebFetch` | `web` |

**Instructions:** `AGENTS.md` is copied into each `dist/<platform>/AGENTS.md` as a bundled copy
(see §8) — not installed anywhere else, since there's no standalone installer. The same content
also becomes the `SessionStart` hook's payload (below).

**Hooks:** `AGENTS.md`'s content (SessionStart) and its Security section (SubagentStart) render
into each platform's `hooks/hooks.json` with a
different JSON shape per §1's table (shell-quoted for CC's plain-stdout `command`; JSON-wrapped
and shell-quoted again for GHCP's `bash`/`powershell` fields — always via `printf '%s'`, never
`echo`, since POSIX `sh`/`dash` interpret backslash escapes in `echo`'s argument by default while
`bash` doesn't, which silently corrupted the embedded JSON under `dash` until caught by testing).
CC's manifest doesn't need a `hooks` field (auto-discovered from the default `hooks/` folder like
`skills/`/`agents/`), GHCP's `plugin.json` must declare `"hooks": "hooks/hooks.json"` explicitly
(no default-folder convention there).

---

## 10. Token efficiency — where each lever lives

| Lever | Mechanism |
|---|---|
| JIT loading | tiny `SKILL.md`; detail in `refs/*.md` loaded only when the skill needs it |
| Context isolation | research, implementation, review, and docs run in subagents; the orchestrator's context stays clean |
| Disk over chat | artifacts (`brief.md`, `report.md`) written to `.trailmix/…`; chat gets only the digest and the handoff summary |
| Cheap-model routing | explorer (read/summarize/websearch) on a cheap model; the rest pinned per agent in `build/maps/models.json` |
| Evidence not logs | GORP: counts + exact commands + one-line findings, hard word caps |
| Terse + lean defaults | always-on style skills with safety carve-outs |
| Tool-def deferral | rely on each CLI's native deferred tool loading when >~30 tools |

---

## Open questions
- None.
