---
name: implement
description: Waypoint 3 — build the planned feature with tests, TDD-style, and verify every gate
  before claiming done. Dispatches the implementer agent. Use once the plan checkpoint is
  signed off, not as an entry point for a raw request.
---

# implement — build it and prove it works

Turn the plan's tasks into working, tested code. The plan is the contract; you own the
implementation and the tests.

**On entry:** the plan checkpoint just passed — approve `plan.md` with the helper (`trail.mjs
approve .trailmix/trail/<slug>/plan.md`, or `spec-plan.md` on the trivial track; it also bumps
`updated` — see `trailhead/refs/trail-metadata.md`) before building.

## How
- **Dispatch the `implementer` agent** (reasoning-tier; or a general subagent if not installed)
  with the feature dir and `plan.md`. It works tasks in order, TDD where practical, honoring
  each task's contract and covering the listed behaviors with tests.
- Keep the main context clean — the subagent does the work and returns a GORP summary; read
  diffs from `git diff`, not from its message.
- If the plan has a blocking gap or a contract looks wrong, **stop and ask the human** — don't
  guess past ambiguity or silently change a contract.

## Verify before claiming done
Load `refs/verification.md` and follow it: the Iron Law (no completion claim without fresh
evidence this turn), the gate order (tests → build/lint → each acceptance criterion → red-green
for bug fixes), and the GORP return format.

## Checkpoint
Tasks end at a green gate. Report results as counts + exact commands (per `gorp`). Then
`review`.

## Fix loop
If dispatched with selected review findings (e.g. `H1, M2`), apply exactly those. Verify each
against the code first; if one is wrong or would break behavior, don't apply it — return the
technical reason. Fix one at a time, re-verify after each, report per finding id.
