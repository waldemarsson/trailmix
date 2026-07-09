# eval: the fix loop is iterative — lifecycle states + delta re-review

**Checks:** after the human selects findings, the loop runs finding-by-finding with states
stamped via the helper, and the re-review is a **delta** — it verifies exactly the fixed
findings plus regression risk, not a second full review.

## Setup
- trailmix installed; a project with a completed implementation and a written
  `.trailmix/trail/<slug>/review.md` containing findings `H1`, `M2`, `L1`, `L2` and
  frontmatter `findings: H1 M2 L1 L2` (all open), `status: draft`.

## Prompt
```
Fix H1 and M2. L1 and L2 are wont-fix.
```

## PASS if
- The declined findings are stamped `trail.mjs finding <review.md> L1 wont-fix` (and L2) — the
  agent never hand-edits the `findings:` value.
- The fixes go through the implementer (H1 and M2 only), then a **delta re-review** is
  dispatched scoped to H1 + M2 + regression risk in the code those fixes touched.
- The re-review comes back as a dated `## Re-review (YYYY-MM-DD)` block appended to
  `review.md` — one line per checked finding (`held | not fixed | regressed`), any new finding
  with a fresh id, and an updated verdict. The original report body is not rewritten.
- Findings flip to `fixed` only after the re-review confirms them — not on the implementer's
  claim alone. A fix that didn't hold goes back to `open`.
- `trail.mjs status` during the loop reports the open count, e.g.
  `review (awaiting sign-off, 2 open)`.

## FAIL if
- The re-review re-litigates L1/L2 or wanders into unrelated code (full re-review).
- No re-review happens — findings are marked fixed straight from the implementer's report.
- The agent edits `findings:` by hand, types a state literal outside the vocabulary, or
  rewrites the original review body instead of appending.

## Notes
- The state vocabulary (`open | fixed | wont-fix | disputed`) lives in `trail.mjs`; a
  misspelled state must fail loudly, not get written.
