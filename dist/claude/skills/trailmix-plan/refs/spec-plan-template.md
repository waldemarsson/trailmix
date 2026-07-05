# &lt;Feature title&gt; — spec + plan (merged, trivial track)

> For small, localized, low-risk work: one artifact, one checkpoint. No placeholders. If the
> work turns out to need real design decisions, split into separate `spec.md` + `plan.md` and
> run the full trail.

## Spec

**Problem / why:** 1–2 sentences.

**In scope / out of scope:**
- in: ...
- out: ...

**Chosen approach:** the agreed approach + one line on why.

**Constraints:** version floors, naming/copy rules, platform/runtime limits — the tasks inherit
these.
- ...

**Acceptance criteria:**
- [ ] AC1: testable criterion
- [ ] AC2: testable criterion

**Edge cases:**
- ...

## Plan

**Architecture:** 1–2 sentences (often trivial).

### File structure
- `exact/path` — Create | Modify — responsibility

### Tasks
#### T1: &lt;component&gt;
**Files:** Create | Modify — `exact/path`
**Deliverable:** what works when done.
**Behaviors to cover with tests:** happy path, edges, errors — as behavior, not test code.
**Gate:** exact command(s) + expected outcome.

### Tests
- AC1 → T1 / behavior
- AC2 → T1 / behavior

## Open questions
- None
