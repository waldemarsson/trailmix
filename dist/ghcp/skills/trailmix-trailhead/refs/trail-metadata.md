# Trail metadata — frontmatter, status, resume/status extraction

Frontmatter schema, status lifecycle, and the helper that reads and writes it.

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
status: draft               # draft | approved | dropped
tasks: T1:done T2 T3        # optional — build progress, one token per task
branch: feature/x           # optional — git branch, recorded at sign-off
---
```

**Report**: `report.md`, written at handoff:

```yaml
---
slug: feature-slug
waypoint: handoff
status: draft               # draft | approved
updated: YYYY-MM-DD
findings: H1:fixed M1 L1:wont-fix  # optional — findings left for the human; bare id = open
---
```

Only `status`, `tasks`, `findings`, and `branch` are non-derivable. They record whether a
checkpoint passed, which task gates went green, where each finding left for the human stands,
and which branch holds the work. Counts and verdicts live in the body; never duplicate them into
frontmatter.

## Status lifecycle

`draft` until its checkpoint passes; `approved` at the digest sign-off (brief) or acceptance
(report); `dropped` (brief only) when the human abandons the trail — nothing is deleted, it wins
over any report, and `approve` (keeps `tasks`) or `reopen` undoes it. After `reopen`, discuss
revises the same `brief.md` in place, dropping the stale build notes.

## Deriving current position

Order: `discuss (brief.md)` → `build (no artifact; brief tasks)` → `handoff (report.md)`. Bug
briefs follow the same order; build starts with the red test.

- Brief `dropped`: `dropped`, next `—`, whatever else exists.
- No brief: `empty`, next discuss. Brief `draft` (new or reopened): `discuss (awaiting
  sign-off)`.
- Brief `approved`, no report: build. With `tasks`, resume lands on the first open task, e.g.
  `build (1/3 done, next T2)`. Don't redo or re-read the diff of a `:done` task. All gates green:
  `build (tasks done, next self-review)`, so rerun self-review and docs, then hand off.
- Report `draft`: `handoff (awaiting review)`, plus the open count when findings are registered,
  e.g. `handoff (awaiting review, 2 open)`. Resume lands in the follow-up loop.
- Report `approved`: `done`.

`trail.mjs status` does exactly this derivation for you (see below) — prefer it over deriving by
hand; the rules here are the spec it implements.

## The helper — `refs/trail.mjs`

Every frontmatter operation goes through this zero-dependency Node helper, never a hand edit:
you name an *intent* (`approve`, `new … brief`) and it owns the vocabulary. It enforces no
workflow rules — even `status` only reports. You decide when to act.

Command surface: `new` · `approve`/`reopen`/`drop` · `branch` · `tasks`/`task-done` ·
`findings`/`finding` · `read` · `check` · `status`.

**Resolve the helper's path once, then reuse it.** The examples below write `"$TRAIL"` for the
resolved script path — substitute the real path (shell state doesn't persist between tool
calls, so set it inline or paste the literal). Resolution order:
1. **The loaded skill's base directory.** Every skill loads with a `Base directory for this
   skill: <path>` line. From trailmix-trailhead's base dir the helper is `<base>/refs/trail.mjs`;
   from a sibling waypoint skill's base dir it's `<base>/../trailmix-trailhead/refs/trail.mjs`.
2. `$CLAUDE_PLUGIN_ROOT` / `$PLUGIN_ROOT` + `/skills/trailmix-trailhead/refs/trail.mjs` — only
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

**Transition** a status with a named op; each bumps `updated` to today:

| Op | Effect | Use when |
|---|---|---|
| `approve <file>` | `status: approved` | the human signs off on the digest (brief) · accepts the result (report) |
| `reopen <brief>` | `status: draft`, `tasks` removed | build proved the brief wrong; back to discuss |
| `drop <brief>` | `status: dropped` | the human abandons the trail |

```sh
node "$TRAIL" approve .trailmix/trail/<slug>/brief.md
```
**Record the branch** at sign-off (re-run if it changes; `reopen` keeps it):
```sh
node "$TRAIL" branch .trailmix/trail/<slug>/brief.md <branch-name>
```
**Track build progress** in the brief's `tasks`: register the ids once build has planned them
(re-registering is refused, so progress survives), then flip each as its gate goes green:
```sh
node "$TRAIL" tasks .trailmix/trail/<slug>/brief.md T1 T2 T3
node "$TRAIL" task-done .trailmix/trail/<slug>/brief.md T1
```

**Track the follow-up loop** in the report's `findings`: register the ids left for the human,
and new ones as they come up (existing ids keep their state), then set an id's state —
`open | fixed | wont-fix | disputed` (`open` reopens a fix that didn't hold):
```sh
node "$TRAIL" findings .trailmix/trail/<slug>/report.md H1 M2
node "$TRAIL" finding  .trailmix/trail/<slug>/report.md H1 fixed
```

**Survey** trails — `status` derives one line per trail (`slug · state · next waypoint`) from
frontmatter, the derivation in "Deriving current position" done for you. No args = all trails
except done and dropped, which collapse into one count line; `--all` lists them; a named dir
always shows:
```sh
node "$TRAIL" status .trailmix/trail/<slug>       # omit the path for all open trails
```

**Lint** — `check` validates every artifact against the schema and exits non-zero on a problem;
run it after a hand-edit fallback. No args = all trails:
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
