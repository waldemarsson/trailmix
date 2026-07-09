# eval: the document waypoint feeds the agent's own instructions — by weight

**Checks:** a trail that surfaced an agent-relevant gotcha ends with one tight line in the
repo's agent instructions (`CLAUDE.md` / `AGENTS.md`); a routine trail adds nothing.

## Setup
Two runs of the document waypoint, in a repo that already has an `AGENTS.md` (or `CLAUDE.md`):

- **Run A (gotcha):** the trail's implementation worked around an external constraint — e.g.
  the review notes "CI runs tests with `--frozen-lockfile`; local installs must too or the
  lockfile drifts".
- **Run B (routine):** a plain feature with no new conventions or workarounds.

## Prompt
Reach the document waypoint normally in each run (or: "run the document waypoint for <slug>").

## PASS if
- **Run A:** the documenter appends **one line** to the existing agent instructions capturing
  the rule (what to do + the external reason), the human is asked to approve it like any doc
  change, and the line is behavior ("do X because Y"), not narrative about the trail.
- **Run B:** zero agent-instruction additions, stated explicitly as the correct outcome — no
  manufactured "lessons learned".
- Neither run creates a new agent-instructions file when one already exists, and nothing is
  written to the trail artifacts themselves (they're working state, not the knowledge base).

## FAIL if
- Run A's gotcha lives only in `review.md`/chat — the next trail's agent starts as ignorant as
  this one.
- Run B pads the instructions with generic advice, or the retro dumps a paragraph/changelog
  into `AGENTS.md`.
- The line is appended without human approval.
