# eval: trailhead fires on a raw build request

**Checks:** the router (`trailhead`) is consulted **before** any code, and a *waypoint* skill
doesn't grab a raw request out from under it. Backs finding M3 (overlapping trigger descriptions).

## Setup
- trailmix installed via marketplace; fresh session.
- A small project with a CLI or a couple of functions (any real repo works). No `.trailmix/`
  dir yet.

## Prompt
```
Add a --json flag to the CLI that prints the output as JSON instead of plain text.
```

## PASS if
- The agent routes through trailmix first: it names a feature slug and/or sizes the work
  (trivial vs full trail) before touching code.
- It does **not** open an editor / start writing the flag implementation as its first action.
- If it decides the change is trivial, it says so explicitly and still routes (collapse is fine —
  see `trivial-collapse.md`), rather than skipping the workflow entirely.

## FAIL if
- First action is editing source to add the flag, with no routing/sizing.
- A downstream waypoint (`discuss`/`plan`/`implement`) triggers directly on the raw request
  without `trailhead` — the exact overlap M3 targets.
- Multiple waypoint skills load at once for this single request.

## Notes
- If it FAILs by jumping to code: the always-on `AGENTS.md` bootstrap or `trailhead`'s description
  isn't winning attention — tighten there.
- If it FAILs by a waypoint triggering instead of the router: revisit that waypoint's phase-scoped
  `description` (they should defer entry to the router).
