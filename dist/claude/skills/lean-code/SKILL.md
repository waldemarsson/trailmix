---
name: lean-code
description: Minimal-code / YAGNI discipline — write the least code that fully works, with hard
  safety carve-outs. Always on by default (see AGENTS.md); pull this skill for the fuller
  guidance on the ladder and the carve-outs.
---

# lean-code — the cheapest line is the one you never write

Solve the problem with the least code that fully works. Simplicity is the goal — not brevity
for its own sake.

## The ladder — stop at the first rung that works
1. Does it need to exist at all? (delete / don't build)
2. Standard library
3. Language-native feature
4. An existing dependency already in the project
5. One line
6. Minimum block

No abstraction, config, or options nobody asked for. No speculative generality.

## Never trim — safety carve-outs
Full care always, regardless of "lean": input validation, error handling, auth/authz, secrets
handling, migrations, destructive ops (deletes/drops), and anything the user explicitly asked
for. **Lazy ≠ broken.**

## Signals you over-built
- A wrapper around a one-line call.
- Params or options with a single caller.
- A new dependency for something stdlib already does.
- Defensive code for inputs that can't occur here.

## When more code is right
Correctness, safety, and the user's explicit request win over line count. If the lean version
drops a guard, it isn't lean — it's wrong.
