---
name: plan
description: Waypoint 2 — turn an agreed spec into a high-level implementation plan (interfaces,
  services, flows, endpoints, file map, contracts, tasks) — not code blocks. Writes plan.md. Use
  once the discuss checkpoint is signed off, not as an entry point for a raw request.
---

# plan — how to build it, at the contract level

Turn `spec.md` into a plan that's a **guide/contract, not a code dump.** Define *what* to build
and the contracts tasks depend on; leave *how* (the actual code + tests) to `implement`.
Scale detail to complexity — trivial work needs only a task or two.

**On entry (full track):** the discuss checkpoint just passed — approve `spec.md` with the helper
(`trail.mjs approve .trailmix/trail/<slug>/spec.md`, which also bumps `updated`; see
`trailhead/refs/trail-metadata.md`) before planning. On the **trivial track** you're
*writing* `spec-plan.md` here — it's the first artifact, so there's nothing prior to approve.

## Do
1. Restate the goal and architecture in a few sentences.
2. **Map the files** before tasks — one responsibility each; follow existing patterns.
3. **Public contracts** — only the names/types/signatures later tasks depend on. Keep stable.
4. **Tasks** — each an independently testable deliverable with a stable id (T1, T2…): its
   deliverable, the contract it exposes, and the behaviors to cover with tests (described as
   behavior, not test code). Name each task's gate command.
5. Map each acceptance criterion → a task. Note risks / trade-offs.

No code blocks. No placeholders / TBDs. Commits are not plan steps — end tasks at a green gate.

## Output — `.trailmix/trail/<slug>/plan.md`
Scaffold with `trail.mjs new <slug> plan`, then fill the body from `refs/plan-template.md`. For
trivial work merged by `trailhead`, scaffold `trail.mjs new <slug> spec-plan "<title>"`
and use `refs/spec-plan-template.md` instead (one artifact, one checkpoint). See
`trailhead/refs/trail-metadata.md`.

## Checkpoint
Get the human's sign-off on the plan before `implement`.
