# &lt;Feature title&gt; — report

**Result:** 1–2 sentences on what now works. **Verdict:** ready | ready, N need your call | blocked — why.

## Needs your call
Registered in `findings:`, one line each: `id · file:line — what, why it matters, options`.
- M2 · `src/foo.ts:42` — ...

## Try it
The exact commands or steps that exercise the change by hand.
1. ...

## Acceptance criteria → proof
- AC1 → test `"rejects empty input"` (`src/foo.test.ts`)
- AC2 → manual: step 2 above

## Changes
- `path` — what changed, one line

## Deviations from the brief
Calls build made on its own, and amendments. One line each, with the reason.
- ...

## Self-review
Counts first (`5 findings: 4 fixed in 1 round, 1 needs your call`), then one line per fixed
finding, `stop` ones first.
- H1 · stop · fixed, re-review held — what it was

## Docs
Files changed with a one-line reason each, or `none — nothing had weight`. Include any agent-retro line.

## Verification
- `npm test` → 46/46 passed
- `npm run build` → exit 0
