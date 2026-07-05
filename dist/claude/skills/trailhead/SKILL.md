---
name: trailhead
description: Entry point for any request to build, add, change, fix, or ship something. Routes
  the work through trailmix's Discuss→Plan→Implement→Review→Document workflow, sizes it, and
  names the feature. Use at the start of a coding task, before diving into code.
---

# trailhead — route the work

You're about to build, change, fix, or ship something. Don't jump straight to code. Route it
through the trail.

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

## Rules
- Pause at each checkpoint. The human drives; don't skip ahead.
- Write outputs to disk; keep chat for decisions and short summaries.
- Terse prose, lean code, and GORP handoffs are always on (see `AGENTS.md`).
- If a waypoint skill isn't installed yet, follow the phase as described in the table above.
