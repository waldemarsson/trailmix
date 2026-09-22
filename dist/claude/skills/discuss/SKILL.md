---
name: discuss
description: Waypoint 1 — research first, then clear every question and uncertainty with the human
  in batched clarify rounds, and write brief.md. Ends at the trail's only pre-build checkpoint.
  Use once trailhead has routed work into a trail — not as the entry point for a raw
  request (that's the router).
---

# discuss — settle every question, then write the brief

This is where the human's input goes. Build runs without them, so anything left unclear here
becomes a wrong guess later. Don't design the implementation in detail, and don't write code.

Helper: `${CLAUDE_PLUGIN_ROOT}/skills/trailhead/refs/trail.mjs` — the host fills in the
path; use it for every `trail.mjs` call below.

## 1. Research first
Before asking anything, dispatch `explorer` agents (cheap, read-only; or general
read-only subagents if not installed), **in parallel**, with one independent question each:
affected code, existing patterns, constraints, prior art, and the web when useful. Each returns a
GORP summary. Never ask the human something research can answer.

## 2. Clarify, in batched rounds
Ask one numbered list per round. Each question gets a **recommended default** and a one-line why:

```
1. Error handling on bad input: reject with 400? (default: yes — matches api/users.ts)
2. Migrate existing rows? (default: no — the new column is nullable)
```

The human answers in one line (`defaults, except 2: yes`). Run another round only if the answers
opened new unknowns. Stop when nothing that changes behavior, scope, or a public contract is
still open. Cover goal, scope in/out, edge cases, constraints, and how success is proven.
Bug work: confirm the repro (steps, expected vs actual) in the same round.

## 3. Write the brief — `.trailmix/trail/<slug>/brief.md`
Scaffold with the helper so frontmatter is correct by construction: `trail.mjs new <slug> brief
"<title>"` (or `new <slug> bug "<title>"` for a defect) — see
`trailhead/refs/trail-metadata.md`. Fill the body from `refs/brief-template.md`
(`refs/bug-template.md` for bugs). Record what the research found under **Context** so build
doesn't re-explore. Leave empty sections out. No open questions and no TBDs: a question you can't
close is a question for the human.

## Checkpoint — the digest
Don't ask the human to read the brief. Show a **digest** in chat, at most 5 bullets: the
decisions you made without explicit input (defaults taken), key assumptions, what's out of scope,
and the riskiest part. Then the brief's path. One sign-off: approve and build starts, or correct
and you update the brief.

If the human pre-authorized ("go ahead once it's clear") and the last round left nothing open,
show the digest and go straight to `build` without pausing.
