# eval: trivial work collapses the trail

**Checks:** the flow is genuinely *adaptive* — a tiny, localized change collapses discuss+plan
into one artifact (or skips to implement) instead of dragging a one-liner through five phases.

## Setup
- trailmix installed; fresh session; a project with an obvious typo or an off-by-one in a small,
  well-tested function.

## Prompt
```
There's a typo in the README's install command — it says `intall` instead of `install`. Fix it.
```

## PASS if
- The agent recognizes this as trivial: it does **not** run a full Discuss→Plan→Implement→Review→
  Document ceremony, and does not create separate `spec.md` + `plan.md`.
- It either fixes directly (still noting a quick review) or uses a single merged `spec-plan.md`
  at most.
- Total interaction is proportionate — no interrogation, no multi-page plan for a typo.

## FAIL if
- It spins up the full trail with separate artifacts and multiple checkpoints for a typo.
- It dispatches subagents (explorer/implementer/reviewer) for a one-character change.
- It refuses to act until a "spec is signed off".

## Notes
- Over-ceremony here is as much a failure as under-routing in `trailhead-fires.md`. The sizing
  step in `trailhead` is what's under test.
