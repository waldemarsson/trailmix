---
slug: resume-and-status
waypoint: plan
status: approved
updated: 2026-07-05
---

# Plan: resume and status via artifact frontmatter

> Guide/contract, not a code dump. trailmix is a prompt/skills framework: "code" here is
> skill + template + ref markdown, "tests" are the manual `evals/` scenarios plus
> `npm run verify` (dist soundness). No generator change — artifacts live in the target
> project, not the plugin build.

**Goal:** give trailmix resumable, surveyable trails using minimal artifact frontmatter with a
`spec.md` anchor, without adding a state machine, sidecar file, or CLI.

**Architecture:** each artifact carries a small YAML frontmatter block. `spec.md` /
`spec-plan.md` is the anchor holding trail-level identity + the Document outcome. Resume and
status are `trailmix-trailhead` behaviors that read *only* frontmatter via a shell extraction
pass, then load a body only for the waypoint being resumed into. Advancing a waypoint stamps the
previous artifact `approved`.

## Global constraints
Copied from `spec.md`:
- No `trail.json`, no status CLI/binary, no gate engine, no `document.md` artifact.
- Token saving comes from the extraction command, not `Read`. Frontmatter first; bodies JIT.
- No generator change. Preserve existing template conventions (incl. current `&lt;…&gt;`
  placeholder escaping) — match exact strings when editing.
- Keep `AGENTS.md` / hook payload tiny (it's injected every session boundary).

## Public contracts (the frontmatter schema — stable, every task depends on it)

**Anchor** (`spec.md` or trivial-track `spec-plan.md`):
```yaml
slug: <kebab>        # trail identity
title: <human title>
created: <date>
updated: <date>
waypoint: discuss    # or spec-plan for the trivial track
status: draft | approved | superseded
document: pending | done | skipped   # Document waypoint has no artifact of its own
```

**Non-anchor** (`plan.md`, `review.md`):
```yaml
slug: <kebab>
waypoint: plan | review
status: draft | approved | superseded
updated: <date>
```
- `status` is the only non-derivable field (did the human checkpoint pass). Waypoint name,
  artifact presence, and review counts/verdict stay derivable / in bodies — never duplicated.
- Current trail position = furthest artifact whose `status: approved`, else the furthest
  `draft` (that's where resume lands).

## File structure
- `src/skills/trailmix-trailhead/refs/trail-metadata.md` — Create — the frontmatter schema,
  status lifecycle, and the exact extraction commands (single definition; other skills point here).
- `src/skills/trailmix-discuss/refs/spec-template.md` — Modify — prepend anchor frontmatter.
- `src/skills/trailmix-plan/refs/spec-plan-template.md` — Modify — prepend anchor frontmatter.
- `src/skills/trailmix-plan/refs/plan-template.md` — Modify — prepend non-anchor frontmatter.
- `src/skills/trailmix-review/SKILL.md` + `refs/review-checklist.md` — Modify — review.md
  frontmatter in the output/report shape.
- `src/skills/trailmix-{plan,implement,review,document}/SKILL.md` — Modify — opening step:
  flip previous artifact `draft → approved`. document SKILL also sets anchor `document:` at close.
- `src/skills/trailmix-trailhead/SKILL.md` — Modify — add Resume branch + Status behavior.
- `src/instructions/AGENTS.md` — Modify — one line: resume/status entry points exist.
- `evals/resume-continues.md`, `evals/status-surveys.md` — Create — scenario checklists.
- `README.md` — deferred (personal-use goal); optional "Resuming a trail" / "Trail status" later.

## Tasks

### T1: Frontmatter schema ref
**Files:** Create — `src/skills/trailmix-trailhead/refs/trail-metadata.md`
**Deliverable:** one JIT-loaded ref defining anchor vs non-anchor fields, the
`draft→approved→superseded` lifecycle, position-derivation rule, and the exact
frontmatter-extraction command(s) used by resume + status.
**Contract:** the schema block above.
**Behaviors to cover:** an agent reading only this ref can write correct frontmatter and run
the extraction pass without loading artifact bodies.
**Gate:** `npm run verify` green.

### T2: Frontmatter on templates + review output
**Files:** Modify — spec-template.md, spec-plan-template.md, plan-template.md,
trailmix-review SKILL.md + review-checklist.md
**Deliverable:** every artifact template emits correct frontmatter (anchor set on
spec/spec-plan; non-anchor on plan; review.md documented to carry non-anchor frontmatter).
**Contract:** matches T1 schema exactly.
**Behaviors to cover:** a fresh discuss/plan/review run produces artifacts whose frontmatter
parses and carries `status: draft` on creation.
**Gate:** `npm run build && npm run verify` green; grep templates for the frontmatter block.

### T3: Flip-on-advance + Document outcome
**Files:** Modify — trailmix-plan/implement/review/document SKILL.md
**Deliverable:** each waypoint's opening step flips the previous artifact `draft → approved`
(plan→spec, implement→plan, document→review; trivial track: implement→spec-plan). document's
closing step sets the anchor `document: done | skipped`.
**Behaviors to cover:** advancing stamps the prior artifact approved; an abandoned trail leaves
its last artifact `draft`; skipping docs records `document: skipped` with the anchor.
**Gate:** manual eval (T7); `npm run verify` green.

### T4: Resume branch in trailhead
**Files:** Modify — trailmix-trailhead/SKILL.md (uses T1 ref)
**Deliverable:** trailhead detects an existing trail (slug match or explicit "resume <slug>"),
extracts frontmatter across the trail, states current position + next waypoint, and continues —
loading a body only for the resumed waypoint.
**Behaviors to cover:** resume lands on the right waypoint; does not reload approved bodies;
re-derives from body if frontmatter looks stale.
**Gate:** `evals/resume-continues.md` PASS in a fresh session.

### T5: Status behavior
**Files:** Modify — trailmix-trailhead/SKILL.md (+ command in T1 ref)
**Deliverable:** a documented prompt that runs one `awk`/`rg` pass over
`.trailmix/trail/*/*.md` and prints a per-trail line (slug · status · next waypoint). No CLI.
**Behaviors to cover:** surveys all trails from frontmatter only; correct next-waypoint per trail.
**Gate:** `evals/status-surveys.md` PASS.

### T6: AGENTS.md entry-point mention
**Files:** Modify — src/instructions/AGENTS.md
**Deliverable:** one tiny line noting resume/status exist and route through trailhead.
**Gate:** `npm run build && npm run verify`; hook payload stays small (eyeball diff size).

### T7: Evals
**Files:** Create — evals/resume-continues.md, evals/status-surveys.md
**Deliverable:** paste-the-prompt / PASS-if / FAIL-if scenarios covering AC3 and AC4.
**Gate:** scenarios written and self-consistent; referenced from evals/README if it lists them.

### T8: Regenerate + verify
**Files:** dist/** (generated)
**Deliverable:** `dist/` regenerated from `src/`, sound and not stale.
**Gate:** `npm run build && npm run verify` green (CI also re-runs on push).

## Tests
- AC1 (frontmatter on templates) → T2
- AC2 (flip on advance) → T3, eval T7
- AC3 (resume) → T4, `evals/resume-continues.md`
- AC4 (status) → T5, `evals/status-surveys.md`

## Risks / trade-offs
- **Extraction portability** — `awk`/`sed`/`rg` across macOS + Linux. Pin one POSIX-safe command
  in T1; prefer `rg`/`fd` with silent fallback per trailmix tool conventions.
- **Flip is prompt-driven (best-effort)** — an agent could forget to stamp `approved`. Acceptable:
  status is re-derivable, and a missed flip fails safe (shows `draft`, resume re-lands there).
- **Template placeholder escaping** — existing templates use `&lt;…&gt;`; match exact strings on
  edit to avoid corrupting them.
- **Frontmatter vs body drift** — smaller than trail.json; resume ref instructs "re-derive from
  body if in doubt."

## Open questions
- None blocking. Exact extraction command (`awk` vs `rg` multiline) pinned during T1.
