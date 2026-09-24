---
name: trailmix-handoff
description: Waypoint 3 — hand the finished build to the human with report.md (what changed, AC
  proof, how to try it, deviations, what needs their call), then run their follow-up fixes until
  they accept. Use when trailmix-build finishes, or to resume a trail awaiting review.
---

# handoff — the human reviews the result

This is the human's main checkpoint: they judge the actual change, not documents about it.

## Write the report — `.trailmix/trail/<slug>/report.md`
Scaffold with `trail.mjs new <slug> report` (see `trailmix-trailhead/refs/trail-metadata.md`) and
fill the body from `refs/report-template.md`, using what build returned and fresh `git diff`
facts. Leave empty sections out. Register only the findings that need the human's call:
`trail.mjs findings <report.md> H1 M2 …`. Auto-fixed findings are listed in the body, not
registered.

## Surface it in chat
Don't make the human open the report to learn what to look at. Show:
1. One line: the result and verdict (`ready` / `ready, 2 need your call` / `blocked: …`).
   Open findings set the floor: any `stop`, or a HIGH that isn't `judgment`, → `blocked`; any
   other → `ready, N need your call`.
   Anything that stopped the build (failing gate, unproven AC, missing access) is `blocked` too.
2. **Needs your call**: each as `id · file:line — what it is, and the options`.
3. **Try it**: the commands or steps.
4. Anything in **Deviations**.
5. The report's path. Changes, AC proof, and docs stay in the report.

## Follow-up loop
The human reviews the diff and replies with findings to fix (`H1, M2`), new change requests, or
acceptance.
- **Fixes and changes:** dispatch `trailmix-implementer` with exactly those, then a delta
  re-review by `trailmix-reviewer`, passing the ids still open (skip it when only LOWs were
  fixed). Stamp each finding: `trail.mjs finding <report.md> <id> fixed` once the re-review
  confirms it held (a LOW: once the brief's gate commands pass), `wont-fix` when declined,
  `disputed` when the implementer shows it's wrong. Register any new finding (from the re-review
  or the human) with `trail.mjs findings <report.md> <id>`; existing ids keep their state.
  Append a dated `## Follow-up (YYYY-MM-DD)` block to the report, and show the delta in chat the
  same way.
- **A change beyond the brief that serves the same outcome:** add a dated line under the brief's
  `**Amendments:**` and run it through this loop. An independent goal gets a new trail.
- **Acceptance:** `trail.mjs approve <report.md>`. The trail is done. The human commits and
  opens the PR; don't do either unless asked.
