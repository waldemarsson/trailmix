# Verification protocol (implement)

Loaded just-in-time when finishing implementation. **Iron Law: no completion claim without
fresh verification evidence** — if you didn't run the command *this turn*, you cannot say it
passes.

## Run every gate fresh, in order
1. **Tests** — run the full suite fresh; read the output, count failures. Claim "pass" only with
   the actual numbers (e.g. `34/34 passed`). Never "should pass" / "looks correct".
2. **Build / lint** — run it; confirm exit 0. Lint passing ≠ build passing — run both if both
   exist.
3. **Each acceptance criterion** — re-read the spec, verify each criterion against real behavior
   (tests passing ≠ all requirements met). Report any gaps.
4. **Bug fixes** — verify red-green: the test FAILS without the fix and PASSES with it, not just
   passes once.

Red flags that mean you are NOT done: "should" / "probably" / "seems to", expressing
satisfaction before running verification, implying success without fresh output. If a gate
fails, fix it or stop and report the real status — never paper over it.

## GORP return format
Keep the whole return ≤ ~400 words. Evidence = counts + the exact command, never pasted logs or
diffs (the human reads those from the terminal / `git diff`).

```
Changed: src/foo.ts (new parser), src/foo.test.ts (12 tests)
Tests: `npm test` → 46/46 passed
Build/lint: `npm run build` → exit 0 · `npm run lint` → exit 0
Acceptance criteria:
- AC1 rejects empty input → met (test: "throws on empty")
- AC2 preserves order → met
Gaps / follow-ups: none
```
