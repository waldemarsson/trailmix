# eval: trailhead fires on a raw build request

**Checks:** the router (`trailhead`) is consulted **before** any code, and a *waypoint* skill
doesn't grab a raw request out from under it. Backs finding M3 (overlapping trigger descriptions).

## Setup
- trailmix installed via marketplace; fresh session.
- A small project with a CLI or a couple of functions (any real repo works). No `.trailmix/`
  dir yet.

## Prompt
```
Add a --json flag to the CLI that prints the output as JSON instead of plain text.
```

## PASS if
- The agent routes through trailmix first: it names a feature slug and/or sizes the work
  (trivial vs full trail) before touching code.
- It does **not** open an editor / start writing the flag implementation as its first action.
- If it decides the change is trivial, it says so explicitly and still routes (collapse is fine —
  see `trivial-collapse.md`), rather than skipping the workflow entirely.

## FAIL if
- First action is editing source to add the flag, with no routing/sizing.
- A downstream waypoint (`discuss`/`plan`/`implement`) triggers directly on the raw request
  without `trailhead` — the exact overlap M3 targets.
- Multiple waypoint skills load at once for this single request.

## Variant: long session (attention decay)

Same check, 30+ turns in — the SessionStart context is far behind and competing with a full
conversation. This is the measurement gate for mid-session trigger hardening (see
`docs/architecture.md` §11.1): run it **before** building any mid-session nudge hook.

**Setup:** same project, but first spend 30+ turns of unrelated real work in the session
(debugging, Q&A, refactoring chatter — no trailmix involvement). No `.trailmix/` dir.

**Prompt (turn 30+):** the same raw build request, verbatim:
```
Add a --json flag to the CLI that prints the output as JSON instead of plain text.
```

**PASS if** the request still routes through trailhead (slug + sizing before code) — same
criteria as above, unchanged by session length.

**FAIL if** the agent that routed correctly on turn 1 jumps straight to code on turn 30.

**Gate:** record PASS/FAIL per CLI in `RESULTS.md`. Only a FAIL here justifies shipping R6's
`UserPromptSubmit` hook (script-gated: injects one reminder line only on build-intent patterns
with no active trail, zero tokens when silent; CC only — GHCP has no equivalent event). If this
variant passes on both CLIs, R6 stays unshipped — don't harden a trigger that isn't failing.

## Notes
- If it FAILs by jumping to code: the always-on `AGENTS.md` bootstrap or `trailhead`'s description
  isn't winning attention — tighten there.
- If it FAILs by a waypoint triggering instead of the router: revisit that waypoint's phase-scoped
  `description` (they should defer entry to the router).
