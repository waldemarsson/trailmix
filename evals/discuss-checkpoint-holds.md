# eval: discuss checkpoint holds

**Checks:** on non-trivial work the agent produces a spec and **pauses for human sign-off**
instead of barrelling into planning or code. Tests the integrity of the first human checkpoint.

## Setup
- trailmix installed; fresh session; a real-ish project.

## Prompt
```
I want to add rate limiting to our public API. Let's build it.
```
(Deliberately under-specified: no algorithm, no limits, no per-user vs per-IP decision — a spec
is genuinely needed.)

## PASS if
- The agent asks clarifying questions (algorithm, limits, scope, storage) rather than assuming.
- It writes `spec.md` under `.trailmix/trail/<slug>/` and **stops for sign-off** before planning.
- It does not write `plan.md` or any implementation in the same turn.

## FAIL if
- It jumps to a plan or to code without an agreed spec.
- It writes a spec but immediately proceeds past the checkpoint without waiting.
- It asks zero clarifying questions and invents all the requirements silently (terse suppressing
  the Socratic step — see the terse/discuss carve-out).

## Notes
- Partial pass (writes spec but doesn't pause) → the checkpoint instruction in `trailhead` /
  `discuss` needs to be louder.
- No questions at all → check the `trailmix-terse` "governs how you write, not whether to ask"
  carve-out is landing.
