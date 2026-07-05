---
slug: resume-and-status
title: Resume and status via artifact frontmatter
waypoint: discuss
status: approved
created: 2026-07-05
updated: 2026-07-05
document: done
---

# Resume and status via artifact frontmatter — spec

**Problem / why:** trailmix writes artifacts to disk but has no way to reopen a trail in a
fresh session, and no way to survey trails. Resume is the payoff that justifies writing to
disk; without it the artifacts are just notes. An external review proposed a sidecar
`trail.json`, but that is a second source of truth that drifts. Metadata belongs *on* the
artifact it describes.

**In scope:**
- Minimal YAML frontmatter on each trail artifact.
- Resume behavior: a `trailmix-trailhead` branch that reconstructs trail state from frontmatter.
- Status behavior: a documented agent prompt that surveys all trails via one cheap shell pass.

**Out of scope:**
- A `trail.json` sidecar file (rejected: duplicate source of truth, drift-prone).
- A real `trailmix status` CLI/binary (violates "marketplace-only, no standalone installer";
  there is no runtime to hang it on). Status is agent behavior, not a command.
- A per-waypoint gate engine / state machine. Frontmatter is descriptive breadcrumbs, never
  a gate. Preserves "soft rigidity."
- Generator changes. Artifacts are written into the target project, not built by the plugin.

**Chosen approach:** each artifact carries minimal frontmatter; `spec.md` (or the trivial
track's `spec-plan.md`) is the **anchor** holding trail-level identity. Resume/status read
only the frontmatter via a mechanical extraction step, then load an artifact body only for the
waypoint being resumed into.

- **Anchor** (`spec.md` / `spec-plan.md`) — `slug`, `title`, `created`, `updated`, plus the
  Document outcome (`document: pending | done | skipped`), since the Document waypoint has no
  artifact of its own to carry state.
- **Every artifact** — `waypoint`, `status` (`draft | approved | superseded`), `updated`.
- The one non-derivable field is `status`: whether the human checkpoint passed. Waypoint name,
  which artifacts exist, and review counts/verdict are all derivable and are NOT duplicated.

**Constraints:** the token saving comes from the extraction command, not `Read` (which loads
whole files). Resume reads frontmatter first to orient; loads a body only for the waypoint it
resumes into. Status = one `awk`/`rg` pass over `.trailmix/trail/*/*.md`.

**Acceptance criteria:**
- [ ] AC1: Every artifact template carries the minimal frontmatter block; `spec.md` /
      `spec-plan.md` additionally carry the anchor fields.
- [ ] AC2: Starting a waypoint flips the previous artifact's `status: draft → approved`
      (approval is implied by advancing), so an abandoned trail shows its last artifact `draft`.
- [ ] AC3: `trailmix-trailhead` detects an existing trail for the work (or an explicit "resume
      <slug>"), extracts frontmatter across the trail, summarizes state, and continues from the
      right waypoint without loading full bodies unnecessarily.
- [ ] AC4: A documented status prompt surveys all trails from frontmatter in one cheap pass and
      prints a per-trail line (slug · status · next waypoint).

**Edge cases:**
- **Trivial track** — single `spec-plan.md`; resume/status must treat it as both anchor and
  plan (`waypoint: spec-plan`).
- **Document waypoint** — no artifact; its state lives only on the anchor's `document:` field.
- **Abandoned mid-checkpoint** — last artifact stays `draft`; resume must land on that
  checkpoint, not past it.
- **Frontmatter/body drift** — smaller than `trail.json` (metadata sits with its artifact,
  counts stay re-derivable), but resume should note "re-derive from body if in doubt."

**Affected areas (current code):**
- `src/skills/trailmix-discuss/refs/spec-template.md` — add anchor + artifact frontmatter.
- `src/skills/trailmix-plan/refs/plan-template.md`, `refs/spec-plan-template.md` — add frontmatter.
- `src/skills/trailmix-review/` — review.md gets frontmatter (counts stay in body).
- `src/skills/trailmix-trailhead/SKILL.md` — new resume branch + status behavior.
- Each waypoint `SKILL.md` — opening step: flip previous artifact `draft → approved`.
- `src/instructions/AGENTS.md` — mention resume/status entry points (kept tiny).
- `README.md` — "Resuming a trail" + "Trail status" sections (low priority; personal use).

**Open questions:**
- None blocking. Positioning/examples deferred (goal is personal daily driver, not launch).
