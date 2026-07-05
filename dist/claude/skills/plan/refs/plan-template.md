# Plan: &lt;feature&gt;

> A **guide/contract, not a code dump.** Define *what* to build and the contracts tasks depend
> on; leave *how* (implementation + tests) to the implementer. Scale detail to complexity. No
> placeholders.

**Goal:** one sentence.

**Architecture:** 2–3 sentences on the approach.

## Global constraints
Project-wide requirements copied verbatim from `spec.md`. Every task inherits these.
- ...

## File structure
Map every file before the tasks (one responsibility each; follow existing patterns):
- `exact/path` — Create | Modify — responsibility

## Public contracts (keep stable across tasks)
Only the signatures/types later tasks depend on — names, params, return types. Not
implementations. (Omit for trivial features.)
- `module/path` — `functionName(args): ReturnType` — one-line behavior

## Tasks
Each task is an independently testable deliverable with a stable id.

### T1: &lt;component&gt;
**Files:** Create | Modify — `exact/path`
**Deliverable:** what works when this task is done.
**Contract (if any):** exact public names/types this task exposes (omit if none).
**Behaviors to cover with tests:** the cases to test (happy path, edges, errors) — as behavior,
not test code.
**Gate:** the exact command(s) to run and the expected outcome (e.g. `npm test` green).

## Tests
- AC1 → T1 / behavior that covers it
- AC2 → T2 / behavior that covers it

## Risks / trade-offs
- ...

## Open questions
- None
