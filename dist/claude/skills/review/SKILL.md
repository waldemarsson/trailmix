---
name: review
description: Waypoint 4 — senior read-only review of the uncommitted implementation against spec
  and plan; returns HIGH/MED/LOW findings with a verdict. Dispatches the reviewer agent.
  Use once implementation is complete, not as an entry point for a raw request.
---

# review — catch issues before they cascade

Review the completed work against `spec.md` and `plan.md`, across architecture, code, security,
tests, and style. Read-only — never edit.

## How
- **Dispatch the `reviewer` agent** (strong-tier, read-only; or a general read-only subagent if
  not installed). Commits don't exist yet — it inspects the unstaged diff, staged diff, and
  untracked files (`git status`, `git diff`, `git diff --cached`, and untracked file contents).
  It comments only on code it actually read.
- Pass the reviewer the path to `refs/review-checklist.md` (under this skill's base directory) —
  it holds the dimensions, severity calibration, and report shape. Don't load it into your own
  context; the reviewer reads it.

## Output — `.trailmix/trail/<slug>/review.md`
Scaffold the file with `trail.mjs new <slug> review` (correct `waypoint: review`, `status: draft`
frontmatter; see `trailhead/refs/trail-metadata.md`), then write the reviewer's returned
report as the body verbatim — the report *is* the artifact; transcribe it, don't rewrite it.
(This artifact necessarily transits chat once — the reviewer is read-only and can't write it.)
Then register the finding ids so the fix loop has a lifecycle: `trail.mjs findings <review.md>
H1 M1 …` (every finding starts `open`).

## Checkpoint
The human picks which findings to fix (e.g. `H1, M2`). Stamp their decisions with the helper —
`trail.mjs finding <review.md> <id> wont-fix` for declined findings, `… disputed` for contested
ones (never hand-edit the field). Selected fixes go back through `implement` (apply
exactly those, verify each). Then `document`. Once the fix selection is settled, this
too is a good point to clear/restart — `review.md` holds the findings and their states, and
resume lands exactly here.

## Delta re-review (after fixes)
When the fix loop returns, don't re-run the full review and don't just take the implementer's
word. Dispatch the reviewer in **delta mode**: pass the finding ids just fixed, the current
diff, and `review.md`. It re-checks *only* those findings plus regression risk in the code they
touched — untouched findings (LOWs, wont-fix) are not re-litigated. It returns a dated
`## Re-review (YYYY-MM-DD)` block: one line per checked finding (held | not fixed | regressed),
any new finding the fixes introduced, and an updated verdict. Append the block to `review.md`
verbatim, stamp the outcomes (`trail.mjs finding <id> fixed`, or back to `open` if a fix didn't
hold), and loop until the human is satisfied.
