# Verification protocol (build)

If you didn't run it *this turn*, you can't say it passes.

1. **Tests** — the full suite, fresh. Claim a pass only with counts (`34/34 passed`).
2. **Build / lint** — each that exists; exit 0.
3. **Each acceptance criterion** — against real behavior; passing tests don't prove every
   requirement.
4. **Bug fixes** — red-green: the test fails without the fix and passes with it.

A gate fails: fix it, or report the real status. Record results in the brief's **Evidence**,
one `ACn → met | gap` line per criterion.
