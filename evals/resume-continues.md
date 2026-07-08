# eval: a trail resumes from frontmatter

**Checks:** a trail survives a fresh session — the agent reconstructs where it left off from
artifact **frontmatter** (not by re-reading every body) and continues from the right waypoint.

## Setup
- trailmix installed; **fresh session**.
- A project containing a partial trail at `.trailmix/trail/add-password-reset/`:
  - `spec.md` — frontmatter `waypoint: discuss`, `status: approved`.
  - `plan.md` — frontmatter `waypoint: plan`, `status: draft` (plan written, not yet signed off).
  - no `review.md` yet.

## Prompt
```
Resume the add-password-reset trail.
```

## PASS if
- The agent consults `trailmix-trailhead` and reads **frontmatter only** to orient — via
  `trail.mjs status`/`read` (path resolved from the loaded skill's base directory), or the awk
  fallback — not full artifact bodies of everything.
- If it uses the helper, the invocation actually runs: no `Cannot find module` flailing on an
  unset `$CLAUDE_PLUGIN_ROOT`, no giving up and hand-editing YAML.
- It correctly identifies the resume point as the **plan checkpoint** (furthest artifact still
  `draft`) and says so in a short state summary (title, spec approved, plan pending sign-off).
- It loads the **plan.md body** (the waypoint it's resuming into) and pauses for the human to
  sign off on the plan — it does **not** start a new trail or re-run discuss.

## FAIL if
- It starts over from discuss, or asks the human to re-paste the earlier conversation.
- It loads every artifact body into context to figure out where it is.
- It misreads position — e.g. jumps into implement while the plan is still `draft`.

## Variant: deliberate clear at the plan checkpoint

Same setup, but the human *chose* the restart: the plan was signed off, the agent recommended
clearing, the human cleared, and the fresh session opens with "resume add-password-reset".
`plan.md` is `status: approved` (stamped before the clear... or stamped on resume when implement
starts — both are valid; the artifact bodies answer everything discussed).

**PASS if**
- The fresh session lands on **implement** and proceeds from spec + plan alone — it re-asks
  **nothing** the spec or plan already answers (no "what should the endpoint be called?", no
  re-litigating settled design choices).
- Total context loaded to resume ≈ frontmatter + the plan body — not the discuss transcript
  (which no longer exists) and not every artifact body.

**FAIL if**
- It asks the human to restate requirements or re-confirm decisions recorded in the artifacts.
- It re-runs discuss or plan "to be safe".

## Variant: mid-implement (task-level resume)

Same trail, further along: `plan.md` is `status: approved` and carries `tasks: T1:done T2 T3`
(the session died mid-implement after T1's gate went green).

**PASS if**
- `trail.mjs status` reports `implement (1/3 done, next T2)` and the agent lands on **T2**.
- T1 is treated as done: no re-implementing it, no re-reading its diff to "check".
- As T2's gate goes green the agent stamps `trail.mjs task-done <plan.md> T2` — it never
  hand-edits the `tasks:` field.

**FAIL if**
- It restarts implement at T1, or re-verifies T1's work before touching T2.
- It edits the `tasks:` value by hand, or marks a task done whose gate never ran.

## Notes
- The one non-derivable signal is `status` (plus the plan's `tasks` marks). If frontmatter looks
  stale or contradicts a body the agent did read, it should trust the body and re-derive (see
  `refs/trail-metadata.md`).
