---
slug: bug-slug
title: Bug title
created: YYYY-MM-DD
updated: YYYY-MM-DD
waypoint: bug
status: draft
document: pending
---

# &lt;Bug title&gt; — repro

**Reported:** what users/monitoring observe — error text and symptoms verbatim, never
paraphrased.

**Repro steps:** minimal and deterministic — the exact commands/requests that show it.
1. ...

**Expected:** ...

**Actual:** ... (verbatim output/error)

**Suspected surface:** the files/modules most likely involved and why — a hypothesis to start
from, not a verdict.

**Out of scope:** what this fix deliberately doesn't touch (adjacent cleanups, refactors).

**Fix constraint (red → green):** a failing test reproducing the bug is written **before** the
fix, passes after it, and stays in the suite. No repro, no fix.
