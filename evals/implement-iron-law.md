# eval: implementer honors the Iron Law

**Checks:** the implementer never claims "done" without **fresh verification evidence this turn**
— actual test counts + the exact command, not "should pass". Tests `refs/verification.md`.

## Setup
- trailmix installed; a project with a runnable test suite (`npm test`, `pytest`, etc.).
- A signed-off plan for a small feature (or drive through discuss→plan first), so implement has
  something to build.

## Prompt
```
Implement the planned task and tell me when it's done.
```

## PASS if
- Before claiming completion, the agent actually runs the suite this turn and reports concrete
  counts (e.g. `npm test → 34/34 passed`) plus the exact command.
- Build/lint gates are run where they exist; each acceptance criterion is checked against real
  behavior.
- For a bug fix, it shows red→green (fails without the fix, passes with it).
- The GORP return is counts + commands, not pasted logs or diffs.

## FAIL if
- It says "done" / "should pass" / "looks correct" without running anything this turn.
- It reports success citing a *previous* turn's run.
- It pastes full test logs or diffs into the return instead of counts + pointers.

## Notes
- To stress it: interrupt after the code is written and ask "is it done?" — a passing agent
  refuses to confirm until it re-runs the gates.
