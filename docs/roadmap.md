# trailmix — roadmap

Agent-behavior features, ordered by leverage. Theme for R1–R4: **the trail's state lives on
disk, fully** — resumable, checkpointed work as the differentiator, end-to-end. Each item names
its mechanism, what it touches, and the eval that proves it behaves.

| # | Feature | One-liner | Status |
|---|---|---|---|
| R1 | Task-level resumability | resume lands mid-implement, not at the waypoint boundary | shipped 2026-07-08 |
| R2 | Fresh-session-per-waypoint | restart at checkpoints as the *recommended* flow | shipped 2026-07-08 |
| R3 | Fix-loop v2 | finding lifecycle + delta re-review | shipped 2026-07-08 |
| R4 | Plan amendments | keep plan.md truthful when implement surfaces drift | shipped 2026-07-08 |
| R5 | Debug/bugfix track | a trail shape for "it's broken", not just "build this" | shipped 2026-07-08 |
| R6 | Trigger hardening | script-gated mid-session nudge, zero tokens when silent | eval-gated — long-session variant added; hook unshipped until it fails |
| R7 | Agent retro | document waypoint feeds CLAUDE.md/AGENTS.md, trails compound | shipped 2026-07-08 |

---

## R1 — Task-level resumability inside implement

Implement is the longest phase, the likeliest to die mid-way, and the only one with zero
recorded state. The plan already has stable task ids (T1, T2…) and named gates; record which
passed.

- **Mechanism:** a `tasks:` field in `plan.md` frontmatter (e.g. `tasks: T1 T2:done T3`),
  stamped by a new named op `trail.mjs task-done <plan.md> <id>` — same closed-vocabulary rule
  as `approve`: the LLM names an intent, never edits the field by hand. `status`/`deriveTrail`
  reports `implement (T2/5 done)` and resume lands on the first open task.
- **Touches:** `trail.mjs` (op + derivation), `trail-metadata.md` (schema), `trailmix-implement`
  SKILL + implementer agent (stamp after each green gate), `trail.test.mjs`.
- **Eval:** kill a session mid-implement with T1 stamped; a fresh session resumes at T2 without
  re-doing T1 or re-reading its diff.

## R2 — Fresh-session-per-waypoint as the recommended flow

Resume exists but is framed as crash recovery. After a checkpoint, the orchestrator's
accumulated discussion is dead weight — the artifact on disk *is* the distilled version.

- **Mechanism:** trailhead + each waypoint checkpoint gain one line: "checkpoint passed — a
  good point to clear/restart; resume lands exactly here." No new machinery; reframing turns
  resume into the main token-efficiency lever.
- **Touches:** `trailmix-trailhead` SKILL (rules), each waypoint SKILL's checkpoint section,
  README (sell it: state survives the session by design).
- **Eval:** extend `resume-continues.md` — after a clear at the plan checkpoint, the fresh
  session continues without re-asking anything the spec/plan already answers.
- **Depends on:** R1 (mid-implement is where restarts hurt today).

## R3 — Fix-loop v2: finding lifecycle + delta re-review

Findings are selected once and the loop ends with "re-review if needed" — a full re-review or
nothing. Real work is iterative.

- **Mechanism:** findings in `review.md` get a state — `open | fixed | wont-fix | disputed` —
  stamped via a named op (`trail.mjs finding <review.md> H1 fixed`), vocabulary owned by the
  helper. A **delta re-review** dispatch: the reviewer re-checks only touched findings plus
  regression risk around them, appends a dated `## Re-review` block, updates the verdict.
- **Touches:** `trail.mjs` (op; findings index in frontmatter or a parsed body convention —
  decide during design: frontmatter keeps the read-frontmatter-only invariant),
  `trailmix-review` + `trailmix-implement` SKILLs (fix-loop sections), reviewer agent,
  `review-checklist.md`.
- **Eval:** select H1+M2 → implementer fixes → delta re-review verifies exactly those, flags a
  regression it finds, doesn't re-litigate untouched LOWs.

## R4 — Plan amendments

The implementer correctly stops when a contract is wrong; after the human answers, nothing
updates `plan.md`, so review judges code against a stale plan.

- **Mechanism:** small drift → append to an `## Amendments` section in `plan.md` (dated, one
  line each: what changed, why, who approved). Big drift → existing `supersede` op +
  re-scaffold. Reviewer checks code against plan *including* amendments.
- **Touches:** `plan-template.md` (+Amendments section), `trailmix-implement` SKILL (after a
  stop-and-ask resolves, record the amendment), `review-checklist.md` (one line).
- **Eval:** implementer hits a wrong contract → stops → human answers → amendment recorded →
  review passes the deviation as documented instead of flagging it.

## R5 — Debug/bugfix track in trailhead

The trail is feature-shaped; "production is broken" fits Discuss→Plan awkwardly. Today's only
sizing axes are trivial vs full — bug work either gets feature ceremony or teaches the model to
skip the framework.

- **Mechanism:** a third track: **reproduce → red test → fix → green → review**. Anchor artifact
  `bug.md` (repro steps, expected vs actual, suspected surface) via `trail.mjs new <slug> bug`;
  red-green is already the Iron Law's bug-fix rule — this track makes it the spine. Review stays
  mandatory; document usually skips.
- **Touches:** `trailmix-trailhead` SKILL (sizing → three tracks), `trail.mjs` TEMPLATES +
  PHASES (`bug` track), a small `bug-template.md` ref, `trail-metadata.md`.
- **Eval:** "users report X 500s on login" → trailhead routes to the bug track, demands a repro
  + failing test before any fix is written.

## R6 — Trigger hardening beyond SessionStart

The framework's core bet is that trailhead fires; SessionStart context fades in long sessions
(attention decay). Harden the riskiest assumption without violating the soft philosophy.

- **Mechanism:** a `UserPromptSubmit` hook whose *script* decides whether to inject — e.g. only
  when the prompt matches build-intent patterns AND no `.trailmix/trail/` is active. Logic lives
  in the shell script, so it costs zero tokens when silent; when it fires, it injects one
  reminder line, not the full core. CC only at first (GHCP has no equivalent event — document
  the asymmetry, don't fake it).
- **Touches:** `build/generate.mjs` (`writeHooks`), a small hook script shipped in the plugin,
  `verify.sh` (execute it in CI like the SessionStart command), `evals/trailhead-fires.md`
  (long-session variant: 30+ turns in, a raw build request still routes).
- **Note:** measure before/after with the eval — if SessionStart alone passes the long-session
  eval, don't ship the hook.

## R7 — Agent retro: trails that compound

Document updates repo docs for humans; nothing updates the *agent's* operating knowledge, so
trail N+1 starts as ignorant as trail N.

- **Mechanism:** one question added to the document waypoint: "did this trail surface a
  convention, workaround, or gotcha the next trail's agent should know?" If yes → append a
  tight line to the project's own agent instructions (CLAUDE.md / AGENTS.md — whatever the repo
  uses), same weight test as docs (zero additions is the common, correct outcome). Human
  approves the line like any doc change.
- **Touches:** `trailmix-document` SKILL + documenter agent, `weight-heuristics.md` (a "for the
  agent" category).
- **Eval:** a trail that worked around an external constraint ends with a one-line agent-facing
  note; a routine trail adds nothing.

---

## Sequencing

1. **R1 → R2 → R3 → R4** — one coherent arc (full on-disk state), each shippable alone, all
   building on `trail.mjs`. R1 and R3 add named ops; design their vocabulary together.
2. **R5** — independent; do whenever bug work starts chafing.
3. **R7** — independent, small, high compounding value.
4. **R6** — last: run the long-session eval first; ship only if SessionStart alone fails it.

Not on this roadmap (secondary to agent behavior): README rebranding, marketplace publishing,
GHCP install verification, token-spend instrumentation, automated eval harness — tracked
informally; promote them here if they start blocking the items above.
