# eval: implement drift lands as a plan amendment, not a stale plan

**Checks:** when the implementer hits a wrong contract, the stop-and-ask resolution is recorded
in `plan.md`'s `## Amendments`, and review then judges the deviation as documented instead of
flagging it.

## Setup
- trailmix installed; a trail mid-implement whose approved `plan.md` contains a contract that
  is verifiably wrong against the codebase (e.g. names a function signature that conflicts with
  an existing caller the plan didn't account for).

## Prompt
Continue the implement waypoint normally; when the agent stops and asks about the contract,
answer with a decision that changes it (e.g. "keep the existing signature, adapt the new code").

## PASS if
- The implementer **stops and asks** rather than guessing past the wrong contract or silently
  changing it.
- After the answer, one dated line is appended to `plan.md` `## Amendments` — what changed,
  why, who approved. The rest of the plan body is untouched.
- The later review treats the amended contract as the plan: no finding flags the deviation as
  a departure; the checklist's plan-alignment pass reads amendments.

## FAIL if
- The agent silently implements something other than the plan's contract, leaving `plan.md`
  stale.
- The answer lives only in chat — nothing recorded on disk.
- Review flags the amended deviation as a plan violation, or the whole plan is rewritten for a
  one-contract change (that's `supersede` territory only when the architecture no longer holds).
