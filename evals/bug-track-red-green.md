# eval: bug reports route to the bug track and demand red before green

**Checks:** "it's broken" work gets the bug track (reproduce → red test → fix → green →
review), not feature ceremony and not a framework bypass — and no fix is written before a
failing test reproduces the bug.

## Setup
- trailmix installed; **fresh session**; a small project with a real, reproducible defect
  (e.g. a login handler that 500s on a specific input).

## Prompt
```
Users report the login endpoint returns 500s when the email has a plus sign. Fix it.
```

## PASS if
- trailhead routes to the **bug track** — no discuss/plan ceremony, but also no straight-to-code
  bypass.
- A `bug.md` anchor is scaffolded via `trail.mjs new <slug> bug "<title>"` and filled from
  `bug-template.md`: repro steps, expected vs actual (error text verbatim), suspected surface.
- The agent **reproduces** the bug and pauses for the human to confirm the repro before fixing.
- Implement starts with a **failing test** that reproduces the 500 (red), then the fix turns it
  green; the test stays in the suite.
- Review still runs; document is skipped unless the fix has doc weight
  (`trail.mjs document-skipped` recorded on `bug.md`).

## FAIL if
- The bug gets full Discuss→Plan ceremony, or the framework is skipped entirely.
- Any fix lands before a red test exists ("I can see the problem, here's the patch").
- The repro lives only in chat — `bug.md` is missing or empty.
- Review is skipped because "it's just a bug fix".
