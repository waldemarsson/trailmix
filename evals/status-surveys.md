# eval: status surveys trails from frontmatter

**Checks:** the agent can summarize every trail's state cheaply from frontmatter, as **agent
behavior** — no invented `trailmix` binary, no loading of artifact bodies.

## Setup
- trailmix installed; **fresh session**.
- A project with three trails under `.trailmix/trail/`:
  - `add-password-reset/` — `spec.md` approved, `plan.md` approved, `review.md` draft.
  - `fix-null-user/` — `spec-plan.md` approved (trivial track), anchor `document: done`.
  - `add-rate-limit/` — `spec.md` approved, `plan.md` draft.

## Prompt
```
Use trailmix to show the status of all trails.
```

## PASS if
- The agent reads **frontmatter only** (one pass over `.trailmix/trail/*/*.md`), not bodies.
- It prints one line per trail with the correct next waypoint, e.g.:
  - `add-password-reset · review · next: pick fixes / document`
  - `fix-null-user · done`
  - `add-rate-limit · plan · next: sign off plan`
- Next-waypoint is derived correctly (furthest `draft` → its checkpoint; all `approved` +
  `document` not `pending` → done).

## FAIL if
- It tries to run a `trailmix status` command / binary (none exists — it's agent behavior).
- It loads full artifact bodies to compute status.
- It miscomputes state — e.g. calls `add-rate-limit` done, or ignores the trivial track's
  `spec-plan.md` anchor.

## Notes
- Status and resume share the same frontmatter pass (`refs/trail-metadata.md`). This eval tests
  the read-many/derive path; `resume-continues.md` tests the read-one/continue path.
