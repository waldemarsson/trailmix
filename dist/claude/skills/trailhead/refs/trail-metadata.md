# Trail metadata — frontmatter, status, resume/status extraction

Loaded just-in-time. Defines the YAML frontmatter every trail artifact carries, how status
moves, and the bundled helper that scaffolds, transitions, reads, lints, and surveys trails from
frontmatter alone — without loading artifact bodies, and without the LLM ever hand-writing YAML
or typing a status literal.

## Frontmatter schema

A trail has at most two artifacts. **Anchor**: `brief.md`, holding trail identity. It's written
at discuss, then build appends its notes and progress to it:

```yaml
---
slug: feature-slug          # trail identity (matches the dir name)
title: Human-readable title
kind: feature               # feature | bug
created: YYYY-MM-DD
updated: YYYY-MM-DD
waypoint: discuss
status: draft               # draft | approved | superseded
tasks: T1:done T2 T3        # optional — build progress, one token per task
---
```

**Report**: `report.md`, written at handoff:

```yaml
---
slug: feature-slug
waypoint: handoff
status: draft               # draft | approved | superseded
updated: YYYY-MM-DD
findings: H1:fixed M1 L1:wont-fix  # optional — findings left for the human; bare id = open
---
```

Only `status`, `tasks`, and `findings` are non-derivable. They record whether a checkpoint
passed, which task gates went green, and where each finding left for the human stands. Counts
and verdicts live in the body; never duplicate them into frontmatter.

## Status lifecycle

- **draft**: artifact written, checkpoint not yet passed.
- **approved**: the brief when build starts (the human signed off on the digest); the report
  when the human accepts the result. An abandoned trail shows its last artifact still `draft`.
- **superseded**: the brief was replaced because build proved the approach wrong and discuss
  reopened. Rare.

## Deriving current position

Order: `discuss (brief.md)` → `build (no artifact; brief tasks)` → `handoff (report.md)`. Bug
briefs follow the same order; build starts with the red test.

- No brief: `empty`, next discuss. Brief `draft`: `discuss (awaiting sign-off)`. Brief
  `superseded`: back to discuss.
- Brief `approved`, no report: build. With `tasks`, resume lands on the first open task, e.g.
  `build (1/3 done, next T2)`. Don't redo or re-read the diff of a `:done` task. All gates green:
  `build (tasks done, next self-review)`, so rerun self-review and docs, then hand off.
- Report `draft`: `handoff (awaiting review)`, plus the open count when findings are registered,
  e.g. `handoff (awaiting review, 2 open)`. Resume lands in the follow-up loop.
- Report `approved`: `done`.

`trail.mjs status` does exactly this derivation for you (see below) — prefer it over deriving by
hand; the rules here are the spec it implements.

## The helper — `refs/trail.mjs`

Every mechanical frontmatter operation — scaffolding an artifact, transitioning a status,
reading, linting, surveying — is done by a bundled zero-dependency Node helper, not by hand. This
is the correctness/repeatability win: the LLM never parses or rewrites YAML itself (which drops
fields, malforms quoting, or fills the wrong date), and never types a status value it could
misspell — it names an *intent* (`approve`, `new … brief`) and the helper owns the vocabulary.
It's also cheaper: one command instead of `Read` + reason + `Edit`. The helper is a pure data
tool: it owns the closed vocabulary (statuses, waypoints, templates) but **no** workflow rules —
no gates, no enforced ordering, no state machine. Even `status`, which derives the resume point,
only *reports* — it blocks nothing. You decide when to act.

Command surface: `new` · `approve`/`supersede` · `tasks`/`task-done` · `findings`/`finding` ·
`read` · `check` · `status`.

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

**Scaffold** a new artifact — writes a correct frontmatter block (slug, today's dates, `kind`,
initial `status: draft`, the right `waypoint`) so none of that is hand-typed, then you fill the
body from the phase's template ref. `<template>` is `brief | bug | report` (`brief` and `bug` both
write `brief.md`); an unknown one or a non-kebab slug fails loudly, and it refuses to clobber an
existing artifact:
```sh
node "$TRAIL" new <slug> brief "Human-readable title"
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
| `approve <file>` | `status: approved` | build starts (brief) · the human accepts the result (report) |
| `supersede <file>` | `status: superseded` | build proved the brief wrong; discuss reopens |

```sh
node "$TRAIL" approve .trailmix/trail/<slug>/brief.md
```
**Track build progress** — same named-op rule for the brief's `tasks` field, so a task id or
`:done` mark is never hand-typed. Register the task ids once when build has planned them
(refuses to re-register — progress survives), then flip each task as its gate goes green:
```sh
node "$TRAIL" tasks .trailmix/trail/<slug>/brief.md T1 T2 T3
node "$TRAIL" task-done .trailmix/trail/<slug>/brief.md T1
```
A bad or unknown id fails loudly instead of writing a bad value. `status` derives the resume
point from the marks (see "Deriving current position").

**Track the handoff follow-up loop** — the same pattern for `report.md`'s `findings` field.
Register the ids of the findings left for the human once when the report is written, then name
an id + state as the loop runs (`open | fixed | wont-fix | disputed` — the vocabulary lives in
the helper; `open` reopens a finding whose fix didn't hold):
```sh
node "$TRAIL" findings .trailmix/trail/<slug>/report.md H1 M2
node "$TRAIL" finding  .trailmix/trail/<slug>/report.md H1 fixed
```

These are the *only* status writes — the vocabulary (`approved`/`superseded`)
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
kind in their closed sets, dates well-formed, anchor fields present) and exits non-zero on any
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
