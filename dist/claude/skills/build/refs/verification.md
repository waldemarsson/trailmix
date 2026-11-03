# Verification protocol (build)

The gates behind the Iron Law: if you didn't run it *this turn*, you can't say it passes.

## Run every gate fresh, in order
1. **Tests** — run the full suite fresh; read the output, count failures. Claim "pass" only with
   the actual numbers (e.g. `34/34 passed`). Never "should pass" / "looks correct".
2. **Build / lint** — run it; confirm exit 0. Lint passing ≠ build passing — run both if both
   exist.
3. **Each acceptance criterion** — re-read the brief, verify each criterion against real behavior
   (tests passing ≠ all requirements met). Report any gaps.
4. **Bug fixes** — verify red-green: the test FAILS without the fix and PASSES with it, not just
   passes once.

Red flags that mean you are NOT done: "should" / "probably" / "seems to", expressing
satisfaction before running verification, implying success without fresh output. If a gate
fails, fix it or stop and report the real status — never paper over it.

Return per `gorp`, plus one `ACn → met | gap` line per acceptance criterion.
