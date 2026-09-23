# trailmix — architecture & structure

A portable, token-efficient agentic coding framework. One workflow — **Discuss → Build →
Handoff** — that runs on both **GitHub Copilot CLI (GHCP)** and
**Claude Code (CC)** from a single source.

Status: **implemented.** This document is the design source of truth; §11 tracks build progress.

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
| 1 | **trailmix-discuss** | Parallel research first, then batched numbered clarify rounds (each question with a recommended default) until nothing that changes behavior, scope, or a contract is open | **trailmix-explorer** (cheap), in parallel | answers rounds; signs off on a ≤5-bullet digest in chat | `brief.md` |
| 2 | **trailmix-build** | Autonomous: plan tasks into the brief's `## Build notes`, implement TDD, self-review, fix, update docs | **trailmix-implementer**, **trailmix-reviewer** (read-only), **trailmix-documenter** | none, unless blocked | code + tests + docs (git diff) |
| 3 | **trailmix-handoff** | Write the report, surface it in chat, run the follow-up loop until accepted | **trailmix-implementer** + **trailmix-reviewer** for follow-ups | reviews the diff, picks follow-ups, accepts | `report.md` |

**Discuss** is the waypoint that matters most: build is autonomous, so anything left open
becomes a guess, and nothing is briefed or built until nothing is left to clarify. Clarify ends
with a deliberate edge-case sweep (inputs, failure, state, compatibility, access). Never ask what
research can answer. The human answers a round in one line
(`defaults, except 2: yes`). The brief records decisions, scope, constraints, acceptance
criteria, edge cases, and research **Context** so build doesn't re-explore — no open questions,
no TBDs. The checkpoint is a digest, not a document read: defaults taken, key assumptions, out of
scope, riskiest part. If the human pre-authorized ("go ahead once it's clear") and nothing is
open, discuss shows the digest and proceeds without pausing; pre-authorization skips the pause,
never the questions. The signed-off brief is the
recommended point to clear/restart the session — it's the distilled context and resume lands
exactly there. Host plan mode, when active, absorbs the discuss checkpoint (one ceremony).

**Build.** Starting build approves the brief. The file map and tasks (T1, T2…, each with
contract, behaviors, gate command; every AC mapped to a task) are appended to the brief — no
separate plan artifact, no re-approval. The reviewer returns findings to the orchestrator; there
is no review artifact. Every `clear` finding with an in-scope fix is auto-fixed regardless of
severity, followed by a **delta re-review** of only those ids + regression risk; **at most 2 fix
rounds**. `judgment` findings — judgment calls, scope changes, contradictions of a brief
decision, disputed fixes — plus anything still open go to the human via the report. The
documenter updates docs by weight (zero edits is valid) and runs the **agent retro** (one-line
conventions/gotchas into the repo's own `CLAUDE.md`/`AGENTS.md`; zero additions is the norm).
The only pause is **stop-and-ask** for a real blocker (behavior-changing ambiguity, a brief
decision the code proves wrong, a destructive step, missing access): one question with a
recommended answer, resolution recorded as a dated line under the brief's `**Amendments:**`. If
the approach no longer holds, `supersede` the brief and return to discuss. Calls build makes on
its own go under **Deviations** in the report.

**Handoff.** `report.md` holds result + verdict (`ready` / `ready, N need your call` /
`blocked`), needs your call, try it, AC → proof, changes, deviations, self-review, docs, and
verification. Chat shows the verdict line, needs-your-call items, try-it steps, and deviations;
the rest stays in the report. Follow-up loop: the human names findings (`H1, M2`) or new
changes → implementer applies exactly those → delta re-review → each finding stamped via named
op (`open | fixed | wont-fix | disputed`, lifecycle on the report's `findings:`; `fixed` only
after the re-review confirms it) → a dated `## Follow-up` block appended. A request that changes
the brief's goal or scope becomes a new trail. Acceptance approves the report; the trail is
done. The human commits and opens the PR. All handoffs use **GORP** (§6).

**Trail metadata & resume.** At most two artifacts, each with minimal YAML frontmatter.
`brief.md` is the **anchor** (trail identity, `kind: feature | bug`, plus build's `tasks:`);
`report.md` carries `findings:`. The non-derivable fields are `status: draft | approved |
superseded` (brief approved when build starts, report approved on acceptance, so an abandoned
trail shows its last artifact `draft`), `tasks:` (which task gates went green; resume lands on
the first open task, e.g. `build (1/3 done, next T2)`), and `findings:` (the follow-up lifecycle
above). Both mechanical operations — reading **frontmatter only** (never bodies) to *resume* or
*survey status*, and *transitioning* a status — run through a bundled zero-dep Node helper
(`trailmix-trailhead/refs/trail.mjs`), so the LLM never hand-parses or hand-edits YAML and never
types a status value it could misspell — it names an intent and the helper owns the vocabulary
(the correctness + token win). Commands: `new` (scaffold `brief | bug | report` frontmatter —
dates and initial status correct by construction), the named transitions `approve`/`supersede`,
`tasks`/`task-done` (register the brief's task ids, flip one gate green), `findings`/`finding`
(register the report's finding ids, flip one state), `read`, `check` (lint all frontmatter
against the schema; also run in CI via `verify.sh`), and `status` (derive the resume line per
trail). The helper is a **pure data tool** — it owns the closed vocabulary (statuses, waypoints,
templates) but no workflow rules: no gates, no enforced ordering, no state machine; even `status`
only reports. The skill decides when to call it. It ships inside the plugin and is invoked by
its path inside the installed plugin — resolved from the loaded skill's stated base directory,
since the plugin-root env vars (`$CLAUDE_PLUGIN_ROOT` / `$PLUGIN_ROOT`) are set for hook commands
but not for the shell the model runs tools in — **not** installed on PATH, so it's not the
rejected `trailmix` CLI. Where the path can't be resolved or `node` is absent, it falls back to
an awk read pass / hand-edit. Schema + invocation live in
`trailmix-trailhead/refs/trail-metadata.md`. No sidecar `trail.json`, no state machine, no CLI.
Trails from the old five-waypoint layout are not supported.

---

## 5. The trail crew — agents (generated per platform)

Authored once as neutral `<name>.agent.md` (frontmatter + body); generator emits
`dist/claude/agents/<n>.md` and `dist/ghcp/agents/<n>.agent.md`, mapping agent name→model
(`build/maps/models.json`) and neutral tools→platform tools; the markdown body carries over
verbatim.

| Agent | Role | Model (default map) | Tools (neutral) | Isolation |
|---|---|---|---|---|
| **trailmix-explorer** | Read codebase + web research, summarize | cheap (haiku), effort high | read, search, web | read-only |
| **trailmix-implementer** | Code + tests (TDD) + verification; applies fixes | sonnet / gpt-5.6-terra, effort high | read, edit, search, shell | read/write |
| **trailmix-reviewer** | Senior self-review vs the brief; findings + verdict to the orchestrator | sonnet / claude-sonnet-5, effort high | read, search, shell | **read-only (discipline)** |
| **trailmix-documenter** | Update repo docs by weight + agent retro | sonnet / gpt-5.6-terra, effort high | read, edit, search, shell | read/write |

Every agent preloads `trailmix-gorp` (`skills:`), so the return contract is in context from the
first turn. The reviewer's read-only stays prompt discipline: CC documents no command-level
allowlist for an agent's `tools` (a specifier in `disallowedTools` removes the whole tool), and
GHCP agent `tools` take no patterns.

Tier words in waypoint prose ("cheap", "reasoning-tier", "strong-tier") describe *intent*;
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
This mirrors how Superpowers' `SessionStart` hook injects its full `using-superpowers` meta-skill
rather than a short pointer (verified against the real repo) — trailmix initially shipped a
one-line reminder here, then expanded to the full body once that comparison surfaced that the
one-liner was the more conservative, unvalidated choice, not the pattern that's actually shown
to work. Because `AGENTS.md` is kept intentionally small (§8 title), this stays cheap per
session-boundary event; it is not resent on every turn.

Subagents don't inherit that context. A `SubagentStart` hook (matched to trailmix's own agents)
injects the core's `## Security` section, verbatim, so the non-negotiable rules reach the agents
that actually read files and run commands. Every hook context stays under CC's 10,000-char cap
(beyond it Claude only gets a file path + preview); `verify.sh` checks it.

Contents:
1. **Bootstrap** — trailmix is active; consult **trailhead** for any build/change/fix/ship
   request; pull each **waypoint** skill only on reaching it; artifacts (`brief.md`,
   `report.md`) live in `.trailmix/trail/<slug>/`; two human checkpoints (brief sign-off,
   handoff review), build runs between them.
2. **Style defaults** — terse prose + lean code with the §7 carve-outs.
3. **Tool conventions** — prefer `rg`/`fd`/`bat`/`jq`/`sg` with silent fallbacks (from refs).
4. **Security constraints** — never read `.env`; no bulk env-var reads; no HTTP POST without
   explicit per-request permission (from refs). These override everything.

---

## 9. The generator — hiding the differences

`build/generate.mjs` reads `src/` and writes `dist/claude/` + `dist/ghcp/`.

**Skills:** copy `SKILL.md` near-verbatim to both; neutral frontmatter uses only the common
subset (`name`, `description`, `allowed-tools`). Platform-only extras (CC `model`/`paths`/`hooks`)
are emitted **only** into the CC copy from optional neutral hints. `refs/` copied as-is (JIT).

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

## 11. Build order (skills-first, plugin later)

1. ✅ `AGENTS.md` + `trailmix-trailhead` + the three style skills (`trailmix-terse`,
   `trailmix-lean-code`, `trailmix-gorp`) — instant value, fully portable.
2. ✅ Waypoint skills with their `refs/` — now `trailmix-discuss` → `trailmix-build` →
   `trailmix-handoff` (step 10).
3. ✅ Neutral agent specs + `generate.mjs` + maps → `dist/`.
4. ✅ `install.sh`/`install.ps1` (detect CLI, copy into target) — **removed**; marketplace-only
   install now, no standalone installer maintained.
5. ✅ `evals/` manual scenario checklists — **removed** in 0.7.0; they were never run.
6. ✅ Package `dist/*` as plugins (`plugin.json` + `marketplace.json` per platform, plus root
   marketplace stubs so `owner/repo` marketplace-add resolves); publish to CC + GHCP
   marketplaces (publishing pending live verification).
7. ✅ `SessionStart` hook — the always-on core, replacing the root `AGENTS.md`/`CLAUDE.md`
   delivery `install.sh` used to provide.
8. ✅ Resumable trails — artifact frontmatter (anchor `brief.md`) + `trailhead` resume/status
   behavior, reading frontmatter only. Read + named status transitions go through a bundled
   zero-dep helper (`trail.mjs`, resolved from the loaded skill's base dir, awk/hand-edit
   fallback) so YAML is never
   hand-edited and statuses are never typed by hand (can't be misspelled); it's a pure data tool
   that owns the status vocabulary but no transition rules — not a state machine or a PATH CLI.
   No `trail.json` (see §4).
9. ✅ Agent-behavior features: task-level resume inside build (`tasks:`/`task-done`),
   clear-after-sign-off as the recommended flow, finding lifecycle + delta re-review,
   amendments, the bug brief, and the agent retro.
10. ✅ Three-waypoint restructure (0.7.0): five waypoints with a checkpoint each became Discuss →
   Build → Handoff. The human wasn't reading spec/plan, so checkpoints moved to where attention
   goes: clearing uncertainty up front and reviewing the result. Old-layout trails are not
   supported.
11. ✅ Harness refresh (also 0.7.0): SubagentStart security injection, per-agent effort, GHCP model
   fallback lists, GORP preload in agents, CC `${CLAUDE_PLUGIN_ROOT}` helper path, platform-only
   prose blocks, `fork` matcher, GHCP `execute` alias, hook size guard.

---

## Open questions
- None. (Model names: pinned per agent in `build/maps/models.json`. `dist/`: committed, kept
  fresh by CI.)
