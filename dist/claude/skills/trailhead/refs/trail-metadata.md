# Trail metadata — frontmatter, status, resume/status extraction

Loaded just-in-time. Defines the YAML frontmatter every trail artifact carries, how status
moves, and the bundled helper that scaffolds, transitions, reads, lints, and surveys trails from
frontmatter alone — without loading artifact bodies, and without the LLM ever hand-writing YAML
or typing a status literal.

## Frontmatter schema

**Anchor** — `spec.md` (full trail), `spec-plan.md` (trivial track), or `bug.md` (bug track).
Holds trail-level identity plus the Document outcome, which has no artifact of its own:

```yaml
---
slug: feature-slug          # trail identity (matches the dir name)
title: Human-readable title
created: YYYY-MM-DD
updated: YYYY-MM-DD
waypoint: discuss           # or spec-plan (trivial track) | bug (bug track)
status: draft               # draft | approved | superseded
document: pending           # pending | done | skipped
---
```

**Non-anchor** — `plan.md`, `review.md`:

```yaml
---
slug: feature-slug
waypoint: plan              # plan | review
status: draft               # draft | approved | superseded
updated: YYYY-MM-DD
tasks: T1:done T2 T3        # plan only, optional — implement progress, one token per plan task
findings: H1:fixed M1 L1:wont-fix  # review only, optional — finding lifecycle; bare id = open
---
```

Only `status`, `tasks`, and `findings` are non-derivable — they record whether the human
checkpoint passed, which task gates went green, and where each review finding stands. Waypoint
name, which artifacts exist, and review counts/verdict are derivable or already in the body;
never duplicate them into frontmatter.

## Status lifecycle

- **draft** — artifact written; human checkpoint not yet passed.
- **approved** — human signed off. Stamped when the *next* waypoint starts (advancing implies
  approval), so an abandoned trail correctly shows its last artifact still `draft`.
- **superseded** — artifact replaced (e.g. re-planned, or spec-plan split into spec+plan). Rare.

## Deriving current position

Order: `discuss(spec)` → `plan` → `implement (no artifact)` → `review` → `document (no artifact)`.
Trivial track: `spec-plan` → `implement` → `review` → `document`.
Bug track: `bug` → `implement` → `review` → `document` (repro confirmed at the bug checkpoint;
implement is red test → fix → green).

- **Resume point** = the furthest artifact still `draft` (its checkpoint is pending — land there).
- If every present artifact is `approved`, the position is the next waypoint after the last
  artifact; the trail is *done* when all artifacts are `approved` and the anchor's `document` is
  not `pending`.
- **Mid-implement:** when the plan carries `tasks`, resume lands on the first open task —
  `status` reports e.g. `implement (1/3 done, next T2)`; don't redo or re-read the diff of a
  `:done` task. All gates green ⇒ next is review.
- **Mid-fix-loop:** while `review.md` is `draft` and carries `findings`, `status` appends the
  open count — `review (awaiting sign-off, 2 open)`. Resume lands in the fix loop, not a fresh
  review.

`trail.mjs status` does exactly this derivation for you (see below) — prefer it over deriving by
hand; the rules here are the spec it implements.

## The helper — `refs/trail.mjs`

Every mechanical frontmatter operation — scaffolding an artifact, transitioning a status,
reading, linting, surveying — is done by a bundled zero-dependency Node helper, not by hand. This
is the correctness/repeatability win: the LLM never parses or rewrites YAML itself (which drops
fields, malforms quoting, or fills the wrong date), and never types a status value it could
misspell — it names an *intent* (`approve`, `new … spec`) and the helper owns the vocabulary.
It's also cheaper: one command instead of `Read` + reason + `Edit`. The helper is a pure data
tool: it owns the closed vocabulary (statuses, waypoints, templates) but **no** workflow rules —
no gates, no enforced ordering, no state machine. Even `status`, which derives the resume point,
only *reports* — it blocks nothing. You decide when to act.

Command surface: `new` · `approve`/`supersede`/`document-done`/`document-skipped` ·
`tasks`/`task-done` · `findings`/`finding` · `read` · `check` · `status`.

**Resolve the helper's path once, then reuse it.** The examples below write `"$TRAIL"` for the
resolved script path — substitute the real path (shell state doesn't persist between tool
calls, so set it inline or paste the literal). Resolution order:
1. **The loaded skill's base directory.** Every skill loads with a `Base directory for this
   skill: <path>` line. From trailhead's base dir the helper is `<base>/refs/trail.mjs`;
   from a sibling waypoint skill's base dir it's `<base>/../trailhead/refs/trail.mjs`.
2. `$CLAUDE_PLUGIN_ROOT` / `$PLUGIN_ROOT` + `/skills/trailhead/refs/trail.mjs` — only
   where the host actually sets them (hook commands do; the interactive tool shell usually does
   **not** — never assume, check first).
3. Neither resolvable, or no `node`: use the zero-dep fallback below.

**Scaffold** a new artifact — writes a correct frontmatter block (slug, today's dates, initial
`status: draft` / `document: pending`, the right `waypoint`) so none of that is hand-typed, then
you fill the body from the phase's template ref. `<template>` is `spec | spec-plan | bug | plan |
review`; an unknown one or a non-kebab slug fails loudly, and it refuses to clobber an existing
artifact:
```sh
node "$TRAIL" new <slug> spec "Human-readable title"
```

**Read** frontmatter only (never bodies) — for resume (one trail) or status (all trails):
```sh
node "$TRAIL" read .trailmix/trail/<slug>/*.md    # one trail; use trail/*/*.md for all
```
It prints `path: key: value` per line, skips paths that don't exist (an unexpanded `*` glob is
harmless), and prints `no trails yet` when nothing readable was passed.

**Transition** a status with a **named op**, never a free-text value — so the status vocabulary
can't be misspelled (a mistyped op exits non-zero instead of writing a bad value). Each op bumps
`updated` to today:

| Op | Effect | Use when |
|---|---|---|
| `approve <file>` | `status: approved` | advancing past a checkpoint — approve the previous artifact |
| `supersede <file>` | `status: superseded` | an artifact is replaced (re-plan, spec-plan split) |
| `document-done <anchor>` | `document: done` | docs changed at the Document waypoint |
| `document-skipped <anchor>` | `document: skipped` | zero-doc was the right call |

```sh
node "$TRAIL" approve .trailmix/trail/<slug>/spec.md
```
**Track implement progress** — same named-op rule for the plan's `tasks` field, so a task id or
`:done` mark is never hand-typed. Register the plan's task ids once when implement starts
(refuses to re-register — progress survives), then flip each task as its gate goes green:
```sh
node "$TRAIL" tasks .trailmix/trail/<slug>/plan.md T1 T2 T3
node "$TRAIL" task-done .trailmix/trail/<slug>/plan.md T1
```
A bad or unknown id fails loudly instead of writing a bad value. `status` derives the resume
point from the marks (see "Deriving current position").

**Track the review fix loop** — the same pattern for `review.md`'s `findings` field. Register
the finding ids once when the review is transcribed, then name an id + state as the loop runs
(`open | fixed | wont-fix | disputed` — the vocabulary lives in the helper; `open` reopens a
finding whose fix didn't hold):
```sh
node "$TRAIL" findings .trailmix/trail/<slug>/review.md H1 M1 M2 L1
node "$TRAIL" finding  .trailmix/trail/<slug>/review.md H1 fixed
```

These are the *only* status writes — the vocabulary (`approved`/`superseded`/`done`/`skipped`)
lives once, inside the helper, never as a literal at the call site. The helper knows the
vocabulary but **not** the transition rules: it will `approve` regardless of current state — it's
you (the skill) who decides an approval is due. It refuses (non-zero) a file with no frontmatter
rather than corrupt it, and leaves the body byte-for-byte unchanged.

**Survey** trails — `status` derives one line per trail (`slug · state · next waypoint`) from
frontmatter, the derivation in "Deriving current position" done for you. No args = all trails;
pass a dir for one:
```sh
node "$TRAIL" status .trailmix/trail/<slug>       # omit the path for all trails
```

**Lint** frontmatter — `check` validates every artifact against the schema (status/waypoint/
document in their closed sets, dates well-formed, anchor fields present) and exits non-zero on any
problem. It's the retroactive guard against a bad value that slipped in via the hand-edit
fallback. No args = all trails. Wired into `scripts/verify.sh` for this repo's own trail:
```sh
node "$TRAIL" check
```

**Zero-dep fallback.** If the helper path can't be resolved or `node` isn't available (e.g. some
GHCP shells), fall back: for **read**, one awk pass; for a **transition**, hand-edit the field
per the status schema above (the one path where the value is typed by hand — get it right).
The helper itself is portable Node, but these examples are POSIX — on Windows (GHCP PowerShell)
invoke `node` with the backslash path, and read frontmatter with your file tools instead of awk.
Guard the awk glob first (with no trails the `*` stays literal and awk errors):
```sh
ls -d .trailmix/trail/*/ >/dev/null 2>&1 || { echo "no trails yet"; exit 0; }
awk 'FNR==1{fm=0} FNR==1&&$0=="---"{fm=1;next} fm&&$0=="---"{fm=0;next} fm{print FILENAME": "$0}' \
  .trailmix/trail/*/*.md          # or trail/<slug>/*.md for one trail
```

Load an artifact *body* only for the waypoint you're actually resuming into. If frontmatter
looks stale or contradicts a body you did read (e.g. counts), trust the body and re-derive.
