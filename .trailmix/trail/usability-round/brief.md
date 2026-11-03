---
slug: usability-round
title: Usability round — git setup, build progress, commit offer, drop, lighter discuss
kind: feature
created: 2026-11-03
updated: 2026-11-03
waypoint: discuss
status: approved
tasks: T1:done T2:done T3:done T4:done T5:done T6:done
---

# Usability round — brief

**Goal:** Remove five frictions in using trailmix: build runs on whatever branch and dirty tree
it finds, build is silent until handoff, acceptance stops short of commit/PR, trails can't be
dropped and `status` fills with finished ones, and discuss always pays for research.

**Decisions:**
- Lands on `feature/repo-review-fixes` (one PR). Version 0.12.0 (MINOR) in both version files.
- Git, at the discuss digest: propose a branch name (repo instructions → recent branch-name
  convention → `trail/<slug>`); sign-off creates it. Already on a non-default branch → stay.
- Dirty tree at sign-off: the digest flags it and recommends commit or stash first. If the human
  proceeds, the pre-existing changed files are recorded in the brief; reviewer and documenter
  treat them as out of scope. trailmix never stashes or commits on its own.
- Sign-off may decline the branch ("no branch") and build on the current branch, even the
  default one; the commit offer then warns before committing to the default branch.
- Default branch = `origin/HEAD`, else `main`/`master` if present, else the current branch.
- `.trailmix/` never counts as a pre-existing change. A file build edits that already had
  uncommitted changes becomes wholly in scope; the report flags it as mixed.
- Brief frontmatter gains optional `branch:`, written by a new named op
  `trail.mjs branch <brief> <name>` at sign-off (re-runnable after `reopen`). Resume reads it via
  `read` and warns when the current branch differs; the status line is unchanged. Old briefs
  without it stay valid.
- Not a git repo: skip every git step; the digest says so.
- Implementer split: one implementer by default. Plan time: when the plan has more than ~5
  tasks, or tasks span areas with little shared context, the orchestrator splits the task list
  into sequential chunks, one implementer each. Run time: an implementer may stop early at a
  task boundary when its context is getting heavy — stamp done tasks, return with a
  `Notes for next:` line; the orchestrator dispatches a fresh implementer for the remaining
  tasks with those notes. Never parallel (shared working tree); GHCP's `/fleet` note stays.
  Thresholds are first guesses, to tune.
- Build progress: one chat line each for plan done (N tasks, chunks), each implementer return
  (`T1–T3 green`), each review round's result, docs done. Never pauses.
- Acceptance: after `approve`, ask one line — "Commit, push, and open a draft PR? (default:
  no)". The commit covers only files the trail changed (the report's Changes + docs), never
  recorded pre-existing ones; `.trailmix/` only when the repo doesn't gitignore it. Commit
  message from the report's Result; PR body from the report. The user's own commit/PR rules
  (signing, templates, attribution) win. No remote, no `gh`, or `gh` unauthenticated → offer
  the commit only.
- `trail.mjs drop <brief>` → `status: dropped`, valid on the brief only (`check` flags a dropped
  report). Marks only; deletes nothing. Undo with `approve` (keeps `tasks`) or `reopen`. A dropped
  brief wins over any report: derives `dropped · next: —`.
- `trail.mjs status` with no args hides done and dropped trails and adds a count line only when
  something is hidden (`3 done, 1 dropped hidden — status --all`; alone if all are hidden);
  `--all` shows everything; a named trail always shows. An unknown flag or a named dir that
  doesn't exist → usage error, non-zero exit.
- Discuss may skip research only when the agent already has the affected code in context and
  can cite `file:line` for everything its questions depend on; Context still lists the files.
- Implementation preferences: none — follow existing conventions.

**Design:** All prose changes ride existing checkpoints — no new pauses. The branch and
dirty-tree handling attach to the digest/sign-off; the commit/PR offer attaches to acceptance.
The helper stays a pure data tool: `drop` is a named op like `approve`, `dropped` joins the
closed status vocabulary, `branch` is a free-form recorded value (like `title`), and `status`
only filters what it prints.

**In scope:**
- `src/skills/trailmix-discuss/SKILL.md` (research skip, digest git lines, sign-off branch)
- `src/skills/trailmix-build/SKILL.md` (progress lines, out-of-scope baseline for reviewer/documenter)
- `src/skills/trailmix-handoff/SKILL.md` (commit/PR offer)
- `src/skills/trailmix-trailhead/SKILL.md` + `refs/trail-metadata.md` (resume branch warning, drop, status filtering, schema)
- `src/skills/trailmix-trailhead/refs/trail.mjs` + `build/trail.test.mjs` (`drop`, `dropped`, `branch` field, status filtering, `--all`)
- `src/skills/trailmix-discuss/refs/brief-template.md` (pre-existing changes line)
- `src/agents/trailmix-implementer.agent.md` (early stop at a task boundary, `Notes for next:`)
- Reviewer/documenter agent bodies only if the baseline can't be passed via dispatch alone
- `src/skills/trailmix-discuss/refs/bug-template.md` (pre-existing changes line); discuss
  description if the research skip makes it stale
- Stale references: trail-metadata.md lifecycle text, schema comments, op table; trail.mjs
  header + usage string; README (waypoint table, resume section); architecture.md

**Out of scope:**
- Per-project model/cost overrides (item 6 — separate discussion).
- Auto-stash, auto-commit, or any git write besides creating the branch at sign-off.
- Deleting or archiving trail directories.

**Constraints:**
- Edit `src/`, `build/`, `docs/`; regenerate `dist/` with `npm run build`; `npm run verify` green.
- `trail.mjs` stays zero-dependency and keeps its public op names; existing trails must pass `check`.
- Shipped prose stays terse — every added line is a token every user pays for.

**Acceptance criteria:**
- [ ] AC1: `drop` sets `status: dropped` and bumps `updated`; `check` accepts `dropped` on a brief and flags it on a report; `branch` writes `branch:` and bumps `updated`; a mistyped op still exits non-zero.
- [ ] AC2: `status` (no args) hides done and dropped trails and prints the hidden-count line (none when nothing is hidden); `--all` lists them; `status <dir>` shows a done/dropped trail; trails dropped mid-build and after an approved report both derive `dropped · next: —`; an unknown flag and a missing named dir exit non-zero.
- [ ] AC3: `branch:` is accepted by `check` when present and not required when absent; existing trails in `.trailmix/trail/` still pass.
- [ ] AC4 (reviewer-checked): prose covers each of — branch proposal, creation and decline at sign-off; default-branch detection; dirty-tree flag, `.trailmix/` exclusion, recorded baseline, mixed-file rule; non-git skip; resume branch warning; implementer split (plan-time + early stop + notes); progress lines; opt-in commit/push/PR with its fallbacks; research skip rule.
- [ ] AC5: version 0.12.0 in `package.json` and `src/meta/plugin.meta.json`; `npm run verify` passes.

**Edge cases:**
- Detached HEAD at sign-off: propose a branch, as on the default branch (detached work is easy to lose).
- Branch name already exists: propose `<name>-2`-style alternative in the digest rather than reusing it silently.
- Pre-authorized sign-off ("go ahead once it's clear"): the proposed branch is created without a pause; a dirty tree still stops for an answer (it's a real blocker).
- Reopened brief: `branch:` is kept (same work, same branch).
- `drop` on a done trail: allowed (helper enforces no rules); it then derives as dropped.
- `status --all` with zero trails: `no trails yet`, as today.
- Commit offer when the tree has pre-existing changes recorded in the brief: commit only the trail's files, never the recorded ones.

**Context:**
- `src/skills/trailmix-trailhead/refs/trail.mjs` — `OPS`, `STATUS`, `checkFile`, `deriveTrail`, `summarize`, `run`; ops are named, vocabulary closed.
- `build/trail.test.mjs` — 41 tests driving `run()` and helpers; one spawns the CLI.
- `src/skills/trailmix-discuss/SKILL.md` — digest + sign-off section is where branch/dirty-tree lines go.
- `src/skills/trailmix-build/SKILL.md` — steps 1–4 are the progress milestones.
- `src/skills/trailmix-handoff/SKILL.md` — "Acceptance" bullet ends with "The human commits and opens the PR".
- `src/agents/trailmix-reviewer.agent.md` — reviews all uncommitted changes; needs the baseline.
- `AGENTS.md` (repo) — versioning: frontmatter schema / new op → MINOR.

<!-- Everything above is agreed at the discuss checkpoint. Build appends below; no re-approval. -->

## Build notes
**Files:**
- `src/skills/trailmix-trailhead/refs/trail.mjs` — modify — `drop`, `branch` ops; `dropped` status (brief only); derive; status filtering, `--all`, errors; header + usage
- `build/trail.test.mjs` — modify — tests for the above
- `src/skills/trailmix-trailhead/refs/trail-metadata.md`, `src/skills/trailmix-trailhead/SKILL.md` — modify — schema, lifecycle, op table, resume branch warning, status view
- `src/skills/trailmix-discuss/SKILL.md`, `refs/brief-template.md`, `refs/bug-template.md` — modify — research skip, digest git lines, sign-off branch, pre-existing-changes line
- `src/skills/trailmix-build/SKILL.md`, `src/agents/trailmix-implementer.agent.md` (+ reviewer/documenter only if needed) — modify — implementer split, progress lines, baseline
- `src/skills/trailmix-handoff/SKILL.md` — modify — commit/push/PR offer
- `package.json`, `src/meta/plugin.meta.json` — modify — 0.12.0
- README.md, docs/architecture.md — left to the docs step

**Tasks:** (chunk A = T1–T2, chunk B = T3–T6; one implementer each, sequential)
- T1: helper — `drop`/`branch` ops, `dropped` (brief only, wins in derive), status hide + count line + `--all`, unknown flag / missing dir → exit 2, header + usage · contract: CLI ops above · tests: AC1, AC2, AC3 incl. dropped mid-build and after approved report · gate: `node --test build/trail.test.mjs && node src/skills/trailmix-trailhead/refs/trail.mjs check`
- T2: trailhead skill + trail-metadata.md reflect T1 and the resume branch warning (via `read`) · gate: `npm run build`
- T3: discuss — research-skip rule; digest/sign-off git lines (branch proposal, default-branch detection, decline, dirty tree + `.trailmix/` exclusion + recorded baseline, non-git skip, `trail.mjs branch`); brief/bug template pre-existing-changes line · gate: `npm run build`
- T4: build + implementer — plan-time split (>~5 tasks or unrelated areas), early stop + `Notes for next:`, progress lines, baseline + mixed-file rule passed to reviewer/documenter · gate: `npm run build`
- T5: handoff — opt-in "Commit, push, and open a draft PR?" with scope and fallbacks · gate: `npm run build`
- T6: version 0.12.0 in both files; regenerate dist · gate: `npm run build && node --test build/trail.test.mjs`

**Amendments:**
