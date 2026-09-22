---
slug: bug-slug
title: Bug title
kind: bug
created: YYYY-MM-DD
updated: YYYY-MM-DD
waypoint: discuss
status: draft
---

# &lt;Bug title&gt; — bug brief

**Reported:** what users/monitoring observe — error text and symptoms verbatim, never
paraphrased.

**Repro steps:** minimal and deterministic — the exact commands/requests that show it.
1. ...

**Expected:** ...

**Actual:** ... (verbatim output/error)

**Suspected surface:** the files/modules most likely involved and why — a hypothesis to start
from, not a verdict.

**Decisions:** anything settled in clarify, one line each.

**Out of scope:** what this fix deliberately doesn't touch (adjacent cleanups, refactors).

**Acceptance criteria:**
- [ ] AC1: the repro no longer reproduces; the regression test stays in the suite

**Fix constraint (red → green):** a failing test reproducing the bug is written **before** the
fix, passes after it, and stays in the suite. No repro, no fix.

<!-- Everything above is agreed at the discuss checkpoint. Build appends below; no re-approval. -->

## Build notes
**Tasks:**
- T1: red test reproducing the bug → fix → green · gate command

**Amendments:** dated one-liners when a mid-build stop-and-ask changed a decision.
