---
name: document
description: Waypoint 5 — update the repo's own docs to reflect what shipped, by weight not
  volume. Dispatches the documenter agent. Zero doc changes is a valid outcome. Use once
  review is done, not as an entry point for a raw request.
---

# document — update docs that carry weight

Update the repo's documentation so it matches what actually shipped — add what's new, fix what
the change made stale. **Most changes touch little or no documentation.**

## How
- **Dispatch the `documenter` agent** (standard-tier; or a general subagent if not installed)
  with the feature dir and the implementation diff.
- The test for any doc edit: *would a developer joining this project in six months be worse off
  not knowing this?* If no → skip. Load `refs/weight-heuristics.md` when unsure whether a change
  has weight.
- **Match the repo's existing conventions** (layout, file naming, headings, cross-links). Learn
  them starting from the README. Load `refs/doc-conventions.md` when the convention is unclear.
- Edit surgically; verify commands/flags/examples against real code before writing them.

## Output
Edits to the repo's **own** docs (README, `docs/`, ADRs, per-module READMEs — whatever the repo
uses). Not a per-feature doc. Report files changed + one-line reasons (per `gorp`); flag
any `TBD — author to fill in` and any claim you couldn't fully verify.

## Checkpoint
**Zero docs is a correct outcome** — say so and stop if nothing had weight. Otherwise the human
approves the doc changes.
