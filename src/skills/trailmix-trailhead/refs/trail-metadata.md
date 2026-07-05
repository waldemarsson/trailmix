# Trail metadata — frontmatter, status, resume/status extraction

Loaded just-in-time. Defines the YAML frontmatter every trail artifact carries, how status
moves, and the one cheap command that reads it. The point: reconstruct a trail's state from
frontmatter alone, without loading artifact bodies.

## Frontmatter schema

**Anchor** — `spec.md` (full trail) or `spec-plan.md` (trivial track). Holds trail-level
identity plus the Document outcome, which has no artifact of its own:

```yaml
---
slug: feature-slug          # trail identity (matches the dir name)
title: Human-readable title
created: YYYY-MM-DD
updated: YYYY-MM-DD
waypoint: discuss           # or spec-plan on the trivial track
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
---
```

Only `status` is non-derivable — it records whether the human checkpoint passed. Waypoint name,
which artifacts exist, and review counts/verdict are derivable or already in the body; never
duplicate them into frontmatter.

## Status lifecycle

- **draft** — artifact written; human checkpoint not yet passed.
- **approved** — human signed off. Stamped when the *next* waypoint starts (advancing implies
  approval), so an abandoned trail correctly shows its last artifact still `draft`.
- **superseded** — artifact replaced (e.g. re-planned, or spec-plan split into spec+plan). Rare.

## Deriving current position

Order: `discuss(spec)` → `plan` → `implement (no artifact)` → `review` → `document (no artifact)`.
Trivial track: `spec-plan` → `implement` → `review` → `document`.

- **Resume point** = the furthest artifact still `draft` (its checkpoint is pending — land there).
- If every present artifact is `approved`, the position is the next waypoint after the last
  artifact; the trail is *done* when all artifacts are `approved` and the anchor's `document` is
  not `pending`.

## Reading frontmatter only (the cheap pass)

One awk pass prints just the frontmatter block of each artifact, prefixed by filename. Use it
for both resume (one trail) and status (all trails). It never loads artifact bodies.

Guard first — with no trails, the `*` glob stays literal and awk errors "can't open file". Bail
quietly instead:
```sh
ls -d .trailmix/trail/*/ >/dev/null 2>&1 || { echo "no trails yet"; exit 0; }
```

All trails:
```sh
awk 'FNR==1{fm=0} FNR==1&&$0=="---"{fm=1;next} fm&&$0=="---"{fm=0;next} fm{print FILENAME": "$0}' \
  .trailmix/trail/*/*.md
```

One trail (resume):
```sh
awk 'FNR==1{fm=0} FNR==1&&$0=="---"{fm=1;next} fm&&$0=="---"{fm=0;next} fm{print FILENAME": "$0}' \
  .trailmix/trail/<slug>/*.md
```

Load an artifact *body* only for the waypoint you're actually resuming into. If frontmatter
looks stale or contradicts a body you did read (e.g. counts), trust the body and re-derive.
