---
name: trailhead
description: Entry point for any request to build, add, change, fix, or ship something. Routes
  the work through trailmix's Discuss→Plan→Implement→Review→Document workflow, sizes it, and
  names the feature. Use at the start of a coding task, before diving into code.
---

# trailhead — route the work

You're about to build, change, fix, or ship something. Don't jump straight to code. Route it
through the trail. (Resuming work from an earlier session, or want an overview? See **Resume a
trail** and **Trail status** below.)

## 1. Name the work
Pick a short kebab-case feature slug. Its artifacts live in `.trailmix/trail/<slug>/`.

## 2. Size it (adaptive)
- **Trivial / localized / low-risk** (one clear change, no design choices): collapse Discuss +
  Plan into a single `spec-plan.md`, or for truly tiny work skip straight to implement. Still
  review.
- **Design choices, multiple files, or real risk**: run the full trail.

Scale detail to the work. When in doubt, ask the human which size fits.

## 3. Walk the waypoints
Pull each waypoint skill when you reach it — don't preload them all.

| Waypoint | Skill | Output | Checkpoint |
|---|---|---|---|
| Discuss | `discuss` | `spec.md` | human signs off on the spec |
| Plan | `plan` | `plan.md` | human signs off on the plan |
| Implement | `implement` | code + tests | tests green |
| Review | `review` | `review.md` | human picks fixes |
| Document | `document` | repo docs | human approves (zero docs is valid) |

## Resume a trail
A trail survives a fresh session. If a `.trailmix/trail/<slug>/` already exists for this work — or
the human says "resume `<slug>`" — pick it up instead of starting over:
1. Load `refs/trail-metadata.md`; run its awk pass over `.trailmix/trail/<slug>/*.md` to read
   **frontmatter only**, not bodies.
2. Find the resume point: the furthest artifact still `status: draft` (its checkpoint is
   pending), else the next waypoint after the last `approved` artifact.
3. Summarize state in one short block: title, what's approved, review verdict if any, what's next.
4. Load the **body of only** the waypoint you're resuming into, then continue from its checkpoint.

## Trail status
To survey trails, read frontmatter only (per `refs/trail-metadata.md`) and print one line per
trail — `slug · status · next waypoint` — for one trail or all of `.trailmix/trail/*`. This is
agent behavior, not a command; don't load artifact bodies.

## Rules
- Pause at each checkpoint. The human drives; don't skip ahead.
- Write outputs to disk; keep chat for decisions and short summaries.
- Advancing a waypoint stamps the previous artifact's frontmatter `status: approved`; write each
  new artifact `status: draft`. Details in `refs/trail-metadata.md`.
- Terse prose, lean code, and GORP handoffs are always on (see `AGENTS.md`).
- If a waypoint skill isn't installed yet, follow the phase as described in the table above.
