---
name: trailmix-discuss
description: Waypoint 1 — refine a rough feature idea into an agreed spec through Socratic
  questions and research, then write spec.md. Use once trailmix-trailhead has routed a non-trivial
  feature into the discuss phase — not as the entry point for a raw request (that's the router).
---

# discuss — turn an idea into an agreed spec

Refine the request into a spec you and the human agree on. Don't design the implementation yet
(that's `trailmix-plan`), and don't write code.

## Do
1. **Ask before assuming.** Surface the real goal, the users, the constraints, the edge cases.
   Ask one focused question at a time when it changes direction; batch related ones.
2. **Research to ground it.** Dispatch the `trailmix-explorer` agent (cheap, read-only; or a general
   read-only subagent if not installed) to survey the current codebase and, when useful, the
   web. It returns a GORP summary — don't fill your own context with raw file dumps.
3. **Present in digestible chunks.** Show the emerging spec in short sections the human can
   actually read and sign off on — not a wall of text.
4. **Smooth the edge cases.** Name what's out of scope as clearly as what's in.

## Output — `.trailmix/trail/<slug>/spec.md`
Use `refs/spec-template.md`. Keep it tight; no placeholders, no TBDs.

## Checkpoint
Get the human's sign-off on the spec before `trailmix-plan`. If `trailmix-trailhead` sized the
work as trivial and merged discuss + plan, use `trailmix-plan`'s `spec-plan-template.md` instead
— one artifact, one checkpoint.
