---
slug: fold-subagents
title: Fold implementer and documenter into the main build loop
kind: feature
created: 2026-11-17
updated: 2026-11-17
waypoint: discuss
status: approved
branch: feature/NO-JIRA_fold-subagents
tasks: T1:done T2:done T3:done
---

# Fold implementer and documenter into the main build loop — brief

**Goal:** Per Anthropic's "when to fold subagents into your main agent loop", make build's
orchestrator do the implementation, fixes, and docs itself, so the model that writes the plan
carries it out and no context is lost in plan→executor and reviewer→orchestrator→implementer
handoffs. Keep subagents only where they're split by context: parallel research (explorer) and
fresh-context verification (reviewer).

**Decisions:**
- Implementer stays as a **fallback**: build implements inline by default and dispatches
  `trailmix-implementer` for the remaining tasks only when its own context gets heavy (judgment,
  no fixed task count). `Notes for next:` handoff applies only on that path.
- Documenter agent is **deleted**. Its procedure (steps, weight test, write-lean, rules, agent
  retro) moves into the existing build refs `doc-conventions.md` / `weight-heuristics.md`; no new
  ref file. Build runs the docs step itself.
- Fix loop: the main agent applies fixes itself, in build self-review and in handoff follow-ups.
  Reviewer delta re-review rules unchanged (HIGH/MED need re-review; LOW-only rounds skip it;
  `stop` findings always re-reviewed).
- Limits kept: 4-round fix ceiling; "3 failed attempts → stop and name the assumption".
- Prompt trim, only in files this change touches: drop "Iron Law" framing (keep the
  fresh-verification requirement), drop the prescribed milestone chat-line list, drop the
  "~5 tasks" chunk threshold. Discuss, trailhead, and the always-on core
  (`src/instructions/AGENTS.md`) are untouched.
- Implementation now runs on the user's session model instead of the pinned implementer model;
  documented in `docs/architecture.md`. `models.json` keeps the implementer entry (fallback),
  drops the documenter entry.
- Version 0.12.0 → **0.13.0** in `package.json` and `src/meta/plugin.meta.json`.
- Implementer craft rules move into build's implement step, tersely: surgical changes, comments
  explain why, never silently change a contract or brief decision (stop-and-ask), 3-attempt
  stop, and in fix rounds verify each finding against the code before applying it.
- A finding the main agent disputes with a technical reason always goes to the human ("needs
  your call"); handoff's `disputed` stamp is used only alongside that. Replaces "the implementer
  disputed".
- Build §4 explicitly loads both `doc-conventions.md` and `weight-heuristics.md` at the docs
  step; their "Loaded when…" headers change to say so.
- Build records evidence the subagent returns used to carry as terse lines under the brief's
  `## Build notes` → new **Evidence:** entry: gate results (counts + command), AC → met | gap,
  docs files + reason, `TBD` flags, unverified claims, mixed files. Handoff fills the report
  from it. Body-only change; no frontmatter/schema change; discuss's brief template untouched.
- Pre-existing-changes / mixed-file rule applies to the inline implement and docs steps; mixed =
  a listed pre-existing file that build also changed, recorded in **Evidence**.
- Fallback scope: the implementer subagent only finishes implementation tasks. Review, fixes,
  and docs stay inline. Handoff follow-ups are inline by default and may use the same fallback
  when context is heavy. Trigger wording: context heavy, or a compaction happened mid-build.
- Milestone progress: keep one sentence ("post a one-line progress note per milestone, never
  pause"); drop only the enumerated example list. README's "one progress line per milestone"
  stays accurate.
- Compaction risk documented in `docs/architecture.md`: GHCP fires no hook after compaction, so
  a long inline build can lose the always-on core; mitigation is the fallback trigger plus
  resume via `task-done`.
- Branch `feature/NO-JIRA_fold-subagents`. No implementation preferences beyond existing
  conventions.

**Design:** Build becomes a single loop: plan (into `## Build notes`), implement task by task
with `task-done` stamps, verify per `refs/verification.md`, dispatch the reviewer (unchanged),
fix findings inline, write docs inline, then handoff. The implementer agent body is reframed as
a continuation worker for a context-heavy build, not the default path. Trade-off accepted: the
orchestrator's context grows with the diff and test output; mitigated by the implementer
fallback and the existing resume-from-`task-done` mechanism. Rejected: removing the implementer
entirely (no escape hatch for very large briefs), and keeping the documenter (its input is just
brief + diff, little isolation benefit).

**In scope:**
- `src/skills/trailmix-build/SKILL.md` + refs (`verification.md`, `doc-conventions.md`,
  `weight-heuristics.md`, `review-checklist.md` only if it references removed agents).
- `src/skills/trailmix-handoff/SKILL.md` (follow-up loop fixes inline).
- `src/agents/trailmix-implementer.agent.md` (fallback framing, Iron Law trim);
  delete `src/agents/trailmix-documenter.agent.md`.
- `build/maps/models.json` (drop documenter).
- `docs/architecture.md` (repo tree ~line 80, waypoint table, build rationale incl. chunk
  wording ~145–150, crew table, §10 levers: replace "context isolation" with criteria for when
  to dispatch a subagent; compaction-risk note).
- `README.md` only where it names the crew or describes build's subagent use (milestone line
  stays).
- Version bump; `npm run build` to regenerate `dist/` and marketplace stubs.

**Out of scope:**
- Evals (human will try it in the wild).
- Changes to explorer, reviewer, discuss, trailhead, gorp, terse, lean-code, always-on core.
- Changing `trail.mjs` ops or artifact frontmatter schema.
- Any 1.0 release.

**Constraints:**
- Edit `src/`, `build/`, `docs/` only; never hand-edit `dist/` or root `marketplace.json`.
- Agent `description` stays single-line; skill descriptions must not contain `: ` or ` #`
  unquoted.
- Source names keep the `trailmix-` prefix; generator strips it for Claude.
- Platform-only prose in balanced `<!-- only:… -->` blocks.
- Terse prose; every line is a token users pay for.
- Commit subjects imperative, no conventional prefix; signed commits; body mentions
  `Bump to 0.13.0.`

**Acceptance criteria:**
- [ ] AC1: `npm run verify` passes (fresh dist, trail.mjs tests, frontmatter lint, structure,
  hook-size checks).
- [ ] AC2: `rg -n "documenter" src build README.md dist` returns nothing; in `docs/` only the
  architecture rationale line explaining why it was folded may mention it.
- [ ] AC3: Build skill instructs the main agent to implement, fix findings, and write docs
  itself; implementer dispatch appears only as the context-heavy fallback
  (`rg -n "implementer" src/skills` hits only fallback wording). Implementer craft rules
  (surgical, why-comments, no silent contract change, 3 attempts, verify findings) present in
  build SKILL.md.
- [ ] AC3b: Build SKILL.md defines the **Evidence** entry; handoff SKILL.md reads it to fill the
  report; disputed findings route to the human.
- [ ] AC4: Handoff follow-up loop fixes inline; delta re-review by `trailmix-reviewer` retained
  with unchanged rules.
- [ ] AC5: Former documenter guidance (weight test, write-lean, no invented rationale /
  `TBD — author to fill in`, verify commands against code, agent retro, docs-only) lives in
  `doc-conventions.md` / `weight-heuristics.md`.
- [ ] AC6: `rg -n "Iron Law|~5 tasks|T1–T3 green" src` returns nothing; fresh-verification
  requirement still present in `verification.md`.
- [ ] AC7: `package.json` and `src/meta/plugin.meta.json` both at 0.13.0; generated manifests
  match.
- [ ] AC8: `docs/architecture.md` reflects the new crew (3 agents), build/handoff flow, model
  routing note, and subagent-dispatch criteria.

**Edge cases:**
- Trail resumed mid-build from 0.12.x: `task-done` stamps still drive resume; the new build
  skill just continues inline. No schema change, so nothing breaks.
- Build loaded but implementer agent not installed / unavailable: inline is now the default, so
  only the fallback path needs "a general subagent if not installed" wording.
- Docs step finding nothing of weight: zero edits remains a valid outcome.
- Reviewer reviewing code the orchestrator wrote: reviewer is already a fresh-context read-only
  agent; no change needed.
- Claude namespace stripping: `NAMESPACED_NAMES` derives from `src/agents/`; deleting the
  documenter file must leave no `trailmix-documenter` string in prose (else it wouldn't be
  stripped and would dangle).

**Amendments:**
- 2026-11-17 — Human review vs the article: (1) GHCP compaction drops the core for the whole
  loop, not just implementation — build and handoff re-read the bundled `AGENTS.md` after a
  compaction; (2) delete `trailmix-implementer` (unmeasurable "heavy" trigger; on-disk Evidence
  + `task-done` stamps already make the loop resumable) — reverses the "fallback" decision;
  (3) report summarizes **Evidence** instead of copying it (drop the report's Verification
  section and per-finding lines); (4) prompt-audit build §3 and `verification.md` for
  old-model scaffolding, same rules in fewer words. Version stays 0.13.0 (unreleased).

**Context:**
- `build/generate.mjs:124-131` — namespaced names derived from `src/skills` + `src/agents`.
- `build/generate.mjs:336` — `dist/` wiped on every build; deleted agents disappear.
- `build/generate.mjs:88` — model lookup by agent name in `models.json`.
- `src/skills/trailmix-build/SKILL.md` — §2 Implement, §3 Self-review and fix, §4 Docs dispatch
  agents; header says "subagents do the work".
- `src/skills/trailmix-handoff/SKILL.md` — follow-up loop dispatches implementer + reviewer.
- `src/skills/trailmix-build/refs/verification.md:3` — "Iron Law" framing.
- `src/agents/trailmix-implementer.agent.md` — "Iron Law", chunk/`Notes for next:` logic.
- `src/agents/trailmix-documenter.agent.md` — procedure to migrate.
- `docs/architecture.md:126-150, 170-200, 299-310` — waypoint table, crew table, §10 levers.
- No references in `README.md`, `scripts/verify.sh`, `build/maps/tools.json`.

## Build notes
**Files:**
- `src/skills/trailmix-build/SKILL.md` — modify — inline implement/fix/docs, GHCP compaction re-read, Evidence, craft rules, trims
- `src/skills/trailmix-build/refs/verification.md` — modify — drop Iron Law framing; record to Evidence
- `src/skills/trailmix-build/refs/doc-conventions.md`, `refs/weight-heuristics.md` — modify — absorb documenter procedure; headers say loaded at every docs step
- `src/skills/trailmix-build/refs/review-checklist.md` — modify only if it names removed agents
- `src/skills/trailmix-handoff/SKILL.md` — modify — inline follow-ups, Evidence → report, disputed → human
- `src/agents/trailmix-implementer.agent.md`, `src/agents/trailmix-documenter.agent.md` — delete (implementer: amendment 2026-11-17)
- `build/maps/models.json` — modify — drop documenter and implementer
- `src/skills/trailmix-handoff/refs/report-template.md` — modify — summarize Evidence (amendment)
- `docs/architecture.md`, `README.md` — modify — crew, flow, §10, compaction risk, model routing
- `package.json`, `src/meta/plugin.meta.json` — modify — 0.13.0; regenerate `dist/`

**Tasks:**
- T1: build skill + its refs rewritten per Decisions · AC3, AC3b (build part), AC5, AC6 · gate: `npm run build && rg -n "Iron Law|~5 tasks|T1–T3 green|documenter" src/skills` (expect no hits)
- T2: handoff skill, implementer + documenter deleted, models.json · AC2, AC3b (handoff part), AC4 · gate: `npm run build && rg -n "documenter" src build dist` (expect no hits)
- T3: architecture.md + README + version 0.13.0 + regenerated dist · AC1, AC7, AC8 · gate: `npm run verify`

**Evidence:**
- T1: `npm run build && rg -n "Iron Law|~5 tasks|T1–T3 green|documenter" src/skills` → build exit 0; 0 matches (expected rg exit 1). Stamped done.
- T2: `npm run build && rg -n "documenter" src build dist` → build exit 0; 0 matches (expected rg exit 1). Stamped done.
- `node --test build/trail.test.mjs` → 57/57 passed, 0 failures.
- `node src/skills/trailmix-trailhead/refs/trail.mjs check` → 7/7 artifacts valid, exit 0.
- `git diff --check` → exit 0.
- T3 gate: `npm run verify` → exit 1 only at freshness check (expects generated output committed; satisfied at commit). Same script with freshness block removed → exit 0 ("OK — dist/claude and dist/ghcp are structurally sound plugins…"). Versions bumped; `npm run build` exit 0. Stamped done.
- AC1 → met (pending commit) — all non-freshness checks green; freshness passes once dist/ is committed.
- AC2 → met — `rg -n documenter src build README.md dist` 0 matches; docs/ only the architecture rationale line.
- AC3 → met (amended) — inline implementation/fixes/docs, craft rules; no implementer anywhere.
- AC3b → met — Evidence defined and consumed; disputes route to the human.
- AC4 → met — inline follow-ups; delta re-review retained.
- AC5 → met — documenter procedure absorbed into doc-conventions.md / weight-heuristics.md.
- AC6 → met — `rg -n "Iron Law|~5 tasks|T1–T3 green" src` 0 matches; fresh verification retained.
- AC7 → met — package.json, plugin.meta.json, dist/ghcp/plugin.json, dist/claude plugin.json, .github marketplace at 0.13.0.
- AC8 → met (amended) — architecture.md: tree, waypoint table, build/handoff rationale, Compaction paragraph, crew table (2 agents), dispatch criteria, §8 note, §10 lever.
- Docs files changed: `docs/architecture.md` — architectural decision (subagent folding, model routing, compaction risk). README unchanged — no crew/subagent claims made stale. Agent retro: none.
- TBD flags: none. Unverified claims: none. Mixed files: none.
- Review round 1 (verdict With fixes): M1 · handoff/SKILL.md fallback · contradicted itself + architecture.md → fixed (held). M2 · build/SKILL.md Evidence · lacked review results/deviations → fixed (held). L1 · handoff restated build §3 → fixed. L2 · handoff 4-round ceiling on human loop → fixed (removed). L3 · build §3 scope rule invisible to reviewer → fixed. L4 · mixed-file rule duplicated 3× → fixed. L5 · implementer wrap → fixed.
- Review round 2 (delta, With fixes): M3 · build/SKILL.md:31 · Evidence held ids only → fixed (held). L6 · build "Deviations in the report" → fixed. L7 · implementer description/crew row missing handoff change requests → fixed.
- Round 3 delta re-review: M3, L6, L7 held; no new findings; verdict Yes.
- Post-fix gates: `npm run build` exit 0; verify minus freshness block → exit 0 (OK line).
- Deviations: T3 done inline by the orchestrator (implementer stopped after T2); freshness check of `npm run verify` can't pass pre-commit — verified the rest with the block removed. Resolved M1/L2 (tagged judgment) per brief Decisions rather than escalating.
- Amendment 2026-11-17 (inline, follow-up loop): GHCP-only core re-read after compaction in build + handoff; implementer agent + models entry + all fallback prose removed; report template drops Verification and per-finding Self-review lines; build §3 and verification.md rewritten tersely, same rules.
- Amendment gates: `npm run build` exit 0; verify.sh minus freshness block → exit 0 (OK line); `git diff --check` exit 0; `node --test build/trail.test.mjs` → 57/57 (reviewer).
- Review round 4 (delta, With fixes): M4 · clear · brief.md Build notes · stale vs amendment → fixed. L8 · clear · build/SKILL.md:37 · Evidence finding format dropped stop/judgment tags → fixed. L9 · clear · architecture.md:151 · line >100 chars → fixed.
- Review round 5 (delta): L8, L9 held; M4 held after one more stale Files row (`:165` "fallback") fixed. No new findings.
