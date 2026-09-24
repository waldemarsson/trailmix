---
name: discuss
description: Waypoint 1 — research first, then clear every question and uncertainty with the human
  in batched clarify rounds, and write brief.md. Ends at the trail's only pre-build checkpoint.
  Use once trailhead has routed work into a trail — not as the entry point for a raw
  request (that's the router).
---

# discuss — settle every question, then write the brief

**This is the waypoint that matters most.** Build runs without the human, so every question,
edge case, or ambiguity left open here becomes a guess there, and a wrong guess costs a rebuild.
Don't write the brief, and don't let anything be implemented, until nothing is left to clarify.
One more round is cheaper than a wrong build. Settle the design approach and its trade-offs here;
leave file and task planning to build, and don't write code.

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

The human answers in one line (`defaults, except 2: yes`). The first round always ends with this
question:

```
N. Implementation preferences? E.g. names, where the change lives, patterns or libraries to use
   or avoid. (default: none — build follows existing conventions)
```

Record each preference as a line under the brief's **Decisions**. If research left nothing else
to ask, skip the round and ask it at the digest instead. Run another round whenever the answers
open new unknowns. Stop only when nothing that changes behavior, scope, or a public contract is
still open.

Cover goal, scope in/out, constraints, the design approach (and its trade-offs when there's a
real choice), and how success is proven. Then sweep the edge cases deliberately, not just the
ones that come to mind:
- inputs: empty, invalid, huge, duplicate, unicode
- failure: errors, timeouts, partial failure, retries, recovery
- state: existing data, migration, rollout/rollback, concurrency, ordering
- compatibility: public contracts, callers, config, versions
- access: permissions, secrets, trust boundaries
- operations: performance/scale, observability

Skip the categories that don't apply. Bug work: confirm the repro (steps, expected vs actual) in
the same round.

## 3. Write the brief — `.trailmix/trail/<slug>/brief.md`
Scaffold with the helper so frontmatter is correct by construction: `trail.mjs new <slug> brief
"<title>"` (or `new <slug> bug "<title>"` for a defect) — see
`trailhead/refs/trail-metadata.md`. Fill the body from `refs/brief-template.md`
(`refs/bug-template.md` for bugs). Record what the research found under **Context** so build
doesn't re-explore. Add an **Autonomy** line only when the human asked for decision rights that
differ from build's defaults. Leave empty sections out. No open questions and no TBDs: a question you can't
close is a question for the human.

## 4. Challenge the brief
Before the digest, dispatch `reviewer` (read-only) in **brief mode** with the brief's
path. It hunts for what's missing: callers and states the brief ignores, migration and rollback,
failure modes, unproven acceptance criteria, decisions that contradict each other. Settle what
research can; turn the rest into one more clarify round, then update the brief. Skip it for a
brief small enough that the challenge would cost more than the build.

## Checkpoint — the digest
Don't ask the human to read the brief, so the digest must not hide anything consequential. Show
it in chat, aiming for about 5 bullets. It **must** include every irreversible, security, data,
architecture, and public-contract decision, and every consequential default you took; group
related ones rather than dropping any. Then key assumptions, what's out of scope, and the
riskiest part. Then the brief's path. One sign-off: on approval run `trail.mjs approve
<brief.md>` and start build; on correction, update the brief and show the digest again. If no
clarify round ran, the sign-off line also asks for implementation preferences; any given become
**Decisions** and the digest is shown again.

If the human pre-authorized ("go ahead once it's clear") and the last round left nothing open,
show the digest, approve the brief, and go straight to `build` without pausing. An
unasked preference question counts as `none`.
Pre-authorization skips the pause, never the questions.
