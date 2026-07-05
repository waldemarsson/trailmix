# trailmix — architecture & structure

A portable, token-efficient agentic coding framework. One workflow — **Discuss → Plan →
Implement → Review → Document** — that runs on both **GitHub Copilot CLI (GHCP)** and
**Claude Code (CC)** from a single source.

Status: **structure only, no implementation.** This document is the agreed blueprint.

Locked decisions: single neutral source + generator · soft rigidity (auto-trigger skills,
human checkpoint per phase, no gate engine) · single adaptive flow · always-on terse prose +
lean code + GORP handoffs · skills-first now, plugin later · light theming (functional agent
names, themed suite concepts).

---

## 1. Why skills-first is portable

Both CLIs share enough primitives that the methodology can be authored once:

| Primitive | CC | GHCP | Strategy |
|---|---|---|---|
| **Skills** (`SKILL.md`, open standard) | `.claude/skills/` | `.github/skills/` **and reads `.claude/skills/`** | author once, ship to both |
| **AGENTS.md** | **not read** — reads `CLAUDE.md`; ship `CLAUDE.md`→`@AGENTS.md` | read natively at repo root | one shared instruction file, imported on CC |
| Custom agents | `.claude/agents/*.md` | `.github/agents/*.agent.md` | generate per platform |
| Per-agent model | `sonnet/opus/haiku` | full model names, per-subagent settings | map from neutral tier |
| Tool names | `Read/Edit/Grep/Bash…` | `read/edit/search/shell…` (aliases) | map from neutral alias |
| JIT skill loading | yes | yes | core of the token strategy |
| Hooks | `settings.json` | `.github/hooks/*.json` | optional add-on, per platform |
| Plugins + marketplace | `.claude-plugin/plugin.json` | `plugin.json`, claude-compatible markets | later |

Portable by construction: **skills** (methodology) and **AGENTS.md** (instructions). Only
mechanical differences (agent file shape, model/tool vocab, hook schema, manifest) get hidden
behind the generator.

---

## 2. Naming / theme glossary (light)

Agents keep **functional** names (clear descriptions drive dispatch). Suite concepts carry the
trail-mix flavor:

| Term | Meaning |
|---|---|
| **trailmix** | the framework |
| **trailhead** | bootstrap/router skill — activates the system, points to the right waypoint |
| **waypoint** | one phase (discuss/plan/implement/review/document) |
| **trail crew** | the subagents collectively |
| **GORP** | the compact agent→agent handoff convention (internal name; keep it while it amuses) |
| artifact | a phase output file on disk (`spec.md`, `plan.md`, `review.md`) — plain term, no theme |
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
│   │   ├── trailhead/SKILL.md
│   │   ├── discuss/SKILL.md
│   │   │   └── refs/spec-template.md
│   │   ├── plan/SKILL.md
│   │   │   └── refs/plan-template.md
│   │   ├── implement/SKILL.md
│   │   │   └── refs/verification.md
│   │   ├── review/SKILL.md
│   │   │   └── refs/review-checklist.md
│   │   ├── document/SKILL.md
│   │   │   └── refs/{weight-heuristics.md,doc-conventions.md}
│   │   ├── terse/SKILL.md             # always-on prose compression
│   │   ├── lean-code/SKILL.md         # always-on minimal code
│   │   └── gorp/SKILL.md              # agent→agent dense handoff
│   ├── agents/                        # neutral agent specs (one file each)
│   │   ├── explorer.agent.md
│   │   ├── implementer.agent.md
│   │   ├── reviewer.agent.md
│   │   └── documenter.agent.md
│   ├── instructions/
│   │   └── AGENTS.md                  # always-loaded: bootstrap + style + tool + security
│   └── meta/
│       └── plugin.meta.json           # name/version/author/component map (for later plugin pkg)
├── build/
│   ├── generate.mjs                   # neutral src → dist/{claude,ghcp}
│   └── maps/                          # JSON (Node-native, zero-dep generator)
│       ├── models.json                # tier → platform model name
│       └── tools.json                 # neutral alias → platform tool name(s)
├── dist/                              # GENERATED (commit or gitignore — team choice)
│   ├── claude/{skills/,agents/*.md,.claude-plugin/plugin.json}
│   └── ghcp/{skills/,agents/*.agent.md,plugin.json}
├── install.sh / install.ps1           # detects installed CLI(s), copies dist into target
└── evals/                             # skill-behavior tests (later)
```

Install into a target project (skills-first phase): copy `dist/claude/*` → project `.claude/`,
`dist/ghcp/*` → project `.github/`, and `AGENTS.md` → project root. Later: `copilot plugin
install` / `/plugin install` from a marketplace.

---

## 4. The trail — five waypoints (soft, adaptive)

Each waypoint is a skill that **auto-triggers on intent**, does its work (often via a subagent),
writes an **artifact to disk**, and **pauses for a human checkpoint**. No state machine. Adaptive:
for trivial work `trailmix-discuss`+`trailmix-plan` collapse into one `spec-plan.md`;
`trailmix-document` may legitimately produce nothing.

Artifacts live in the target project at: `.trailmix/trail/<feature-slug>/`.

| # | Waypoint (skill) | Does | Subagent / model tier | Artifact |
|---|---|---|---|---|
| 0 | **trailmix-trailhead** | Detect "we're building something", route to the right waypoint, name the feature slug | main | — |
| 1 | **trailmix-discuss** | Socratic spec refinement; research codebase + web; present in digestible chunks; smooth edge cases | **trailmix-explorer** (cheap) for research | `spec.md` |
| 2 | **trailmix-plan** | High-level design — interfaces, services, flows, endpoints, file map, contracts, tasks. **Not code blocks.** | main (may consult trailmix-explorer) | `plan.md` |
| 3 | **trailmix-implement** | Build + test, TDD, honor contracts; verify per `verification.md`; return capped evidence summary | **trailmix-implementer** (reasoning) | code + tests (git diff) |
| 4 | **trailmix-review** | Read-only review vs spec+plan; `review-checklist.md`; HIGH/MED/LOW + verdict; human picks fixes | **trailmix-reviewer** (strong, read-only) | `review.md` |
| 5 | **trailmix-document** | Weight-based doc updates (`weight-heuristics.md`); zero-doc is valid | **trailmix-documenter** (standard) | repo docs |

Fix loop: human selects findings (e.g. `H1, M2`) → `trailmix-implementer` applies exactly those →
re-review if needed. All handoffs use **GORP** (§6).

---

## 5. The trail crew — agents (generated per platform)

Authored once as neutral `<name>.agent.md` (frontmatter + body); generator emits
`.claude/agents/<n>.md` and `.github/agents/<n>.agent.md`, mapping `tier`→model and neutral
tools→platform tools; the markdown body carries over verbatim.

| Agent | Role | Tier | Tools (neutral) | Isolation |
|---|---|---|---|---|
| **trailmix-explorer** | Read codebase + web research, summarize | `cheap` | read, search, web | read-only |
| **trailmix-implementer** | Code + tests + verification | `reasoning` | read, edit, search, shell | read/write |
| **trailmix-reviewer** | Senior review, verdict | `strong` | read, search, shell | **read-only (discipline)** |
| **trailmix-documenter** | Update repo docs by weight | `standard` | read, edit, search, shell | read/write |

Neutral agent spec (example shape):

```yaml
name: trailmix-reviewer
description: Senior read-only reviewer. Reviews uncommitted work vs spec+plan; returns
  HIGH/MED/LOW findings with a verdict. Never edits.
tier: strong
tools: [read, search, shell]
returns: gorp        # handoff convention
```

---

## 6. GORP — the token-efficient handoff convention

Purpose: shrink **agent→agent** handoffs (never user-facing prose) losslessly. Phase 1 is a
**convention**, not a new parser — adopt a dense encoding later if measured worth it.

Rules (enforced by the `trailmix-gorp` skill + each agent's return contract):
- **Artifacts on disk, not in chat.** Return a pointer + a distilled summary; the human/orchestrator reads diffs and artifacts from the terminal.
- **Evidence = counts + exact commands**, never pasted logs or diffs. (`npm test → 46/46`, not the log.)
- **Findings one line each**: `id · file:line · what → why → fix` (stable ids `H1/M2/L3`).
- **Hard word caps** per return (trailmix-implementer ≤ ~400 words, trailmix-documenter ≤ ~300).
- **No preamble, no sign-off, no gratitude.**

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

## 8. Instructions — `AGENTS.md` (the always-on core, keep < 200 lines)

The single source for the always-on core. **Copilot CLI** reads it at repo root natively.
**Claude Code reads `CLAUDE.md`, not `AGENTS.md`** — so the generator emits a `CLAUDE.md` that
`@AGENTS.md`-imports it, and the installer places both. Keep tiny; push detail into skills (JIT).

Contents:
1. **Bootstrap** — trailmix is active; at session start consult **trailhead**; before any build
   task pull the matching **waypoint** skill; artifacts live in `.trailmix/trail/<slug>/`.
2. **Style defaults** — terse prose + lean code with the §7 carve-outs.
3. **Tool conventions** — prefer `rg`/`fd`/`bat`/`jq`/`sg` with silent fallbacks (from refs).
4. **Security constraints** — never read `.env`; no bulk env-var reads; no HTTP POST without
   explicit per-request permission (from refs). These override everything.

Portable bootstrap = AGENTS.md (+ generated CLAUDE.md import for CC). A
`SessionStart`/`sessionStart` hook that re-injects trailhead after compaction is an **optional
per-platform enhancement**, not core.

---

## 9. The generator — hiding the differences

`build/generate.mjs` reads `src/` and writes `dist/claude/` + `dist/ghcp/`.

**Skills:** copy `SKILL.md` near-verbatim to both; neutral frontmatter uses only the common
subset (`name`, `description`, `allowed-tools`). Platform-only extras (CC `model`/`paths`/`hooks`)
are emitted **only** into the CC copy from optional neutral hints. `refs/` copied as-is (JIT).

**Agents:** neutral yaml → CC `<n>.md` and GHCP `<n>.agent.md`, mapping `tier`→model and
neutral tools→platform tools.

**Model tiers** (`build/maps/models.json`, indicative — pin exact names at build time):

| tier | CC | GHCP |
|---|---|---|
| cheap | `haiku` | `claude-haiku-4.5` / `gpt-5-mini` |
| standard | `sonnet` | `claude-sonnet-4.6` |
| reasoning | `sonnet` (or `opus`) | `gpt-5.3-codex` / `claude-sonnet` |
| strong | `opus` | `claude-opus-4.x` / `gpt-5.5` |

**Tool aliases** (`build/maps/tools.json`): neutral set mirrors GHCP aliases; map to CC caps.

| neutral | CC | GHCP |
|---|---|---|
| read | `Read` | `read` |
| edit | `Edit, Write` | `edit` |
| search | `Grep, Glob` | `search` |
| shell | `Bash` | `shell` |
| web | `WebSearch, WebFetch` | `web` |
| task | `Task` | `agent` |
| todo | `TodoWrite` | `todo` |

**Instructions:** `AGENTS.md` is copied to the target root for GHCP (read natively). For CC the
generator also emits `CLAUDE.md` (`@AGENTS.md` import) — **required**, since CC ignores
`AGENTS.md`. `--global` routes the core to `~/.claude/CLAUDE.md` and
`~/.copilot/copilot-instructions.md` (a managed block), and skills/agents to the CLIs' global
dirs (`~/.claude/{skills,agents}`, `~/.copilot/{skills,agents}`).

---

## 10. Token efficiency — where each lever lives

| Lever | Mechanism |
|---|---|
| JIT loading | tiny `SKILL.md`; detail in `refs/*.md` loaded only when the skill needs it |
| Context isolation | phase work runs in subagents; parent context stays clean |
| Disk over chat | artifacts (`spec/plan/review.md`) written to `.trailmix/…`; human reads them, not the context |
| Cheap-model routing | explorer/read/summarize/websearch on `cheap`; implement on `reasoning`; review on `strong` |
| Evidence not logs | GORP: counts + exact commands + one-line findings, hard word caps |
| Terse + lean defaults | always-on style skills with safety carve-outs |
| Tool-def deferral | rely on each CLI's native deferred tool loading when >~30 tools |

---

## 11. Build order (skills-first, plugin later)

1. ✅ `AGENTS.md` + `trailmix-trailhead` + the three style skills (`trailmix-terse`,
   `trailmix-lean-code`, `trailmix-gorp`) — instant value, fully portable.
2. ✅ Waypoint skills `trailmix-discuss` → `trailmix-plan` → `trailmix-implement` →
   `trailmix-review` → `trailmix-document` with their `refs/`.
3. ✅ Neutral agent specs + `generate.mjs` + maps → `dist/`.
4. ✅ `install.sh`/`install.ps1` (detect CLI, copy into target).
5. `evals/` skill-behavior tests.
6. ✅ Package `dist/*` as plugins (`plugin.json` + `marketplace.json` per platform); publish to CC + GHCP marketplaces (publishing pending).

---

## Open questions
- None blocking. To pin at build time: exact model names per tier, and whether `dist/` is
  committed or generated on install.
