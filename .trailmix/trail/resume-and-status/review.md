---
slug: resume-and-status
waypoint: review
status: approved
updated: 2026-07-05
---
Strengths:
- The awk extraction pass is correct and tested against the live trail — resets `fm` per file
  (`FNR==1`), so a body line `---` never re-opens the block, and files without frontmatter emit
  nothing. `trail-metadata.md` carries it as the single definition.
- Change stays inside the stated constraints: no `trail.json`, no CLI, no generator change,
  no gate engine. Frontmatter is descriptive only.
- Both platforms build clean; CC namespace-strips the new ref/skill refs, ghcp keeps the prefix;
  SessionStart hooks still emit valid JSON under bash + dash after the AGENTS payload grew.

HIGH:
- none.

MEDIUM:
- M1 · src/skills/trailmix-plan/SKILL.md:13 · The "On entry" flip says *stamp `spec.md`
  approved*, but on the trivial track the plan skill **creates** `spec-plan.md` and there is no
  prior `spec.md` to stamp → the instruction is a no-op/confusing there. Fix: scope it to the
  full track ("full track only; on the trivial track this is the first artifact — nothing to
  stamp"), mirroring how implement/SKILL.md already says "or `spec-plan.md`".

LOW:
- L1 · src/skills/trailmix-trailhead/refs/trail-metadata.md:52 · `awk … .trailmix/trail/*/*.md`
  with **no** trails present: the shell passes the unexpanded glob literally and awk errors
  "can't open file". Fix: one guard line (check `.trailmix/trail/` exists / has entries, or note
  `shopt -s nullglob`) so status on an empty repo is quiet, not an error.
- L2 · docs/architecture.md:8 · Still reads "Status: **structure only, no implementation**" and
  its artifact list omits frontmatter/resume/status — now understated. Weight call for the
  Document waypoint, flagged here so it isn't missed.

Spec compliance:
- [x] AC1 — frontmatter on all templates + review report shape.
- [x] AC2 — flip-on-advance wired in plan/implement/document (see M1 for the trivial-track edge).
- [x] AC3 — resume behavior documented in trailhead + `resume-continues.md` eval.
- [x] AC4 — status behavior documented in trailhead + `status-surveys.md` eval.

Verification:
- Ran: `npm run build` (OK), hook execution under bash + dash (valid `{additionalContext}`),
  extraction awk on the live trail (frontmatter-only, correct state).
- Not verified: live agent resume/status behavior in a fresh session on each CLI — that's what
  the two new evals are for, graded by hand; AC3/AC4 are implemented but not yet behaviorally run.

Verdict: With fixes — ship after M1 (and L1 is a cheap, worth-it guard). L2 belongs to Document.
