---
slug: harness-refresh
title: Refresh the CC and GHCP harness integration
kind: feature
created: 2026-09-22
updated: 2026-09-22
waypoint: discuss
status: approved
---

# Refresh the CC and GHCP harness integration — brief

**Goal:** Use harness features that landed since trailmix's integration was written, and drop
workarounds that no longer apply.

**Decisions:** items 1–8 from the 2026-09-22 research, each re-checked against official docs
before building:
- Inject the core's Security section into trailmix subagents (CC `SubagentStart`, GHCP `subagentStart`).
- GHCP model fallback lists, and per-agent effort (CC `effort`, GHCP `reasoning-effort`).
- Preload `gorp` into every agent via `skills:`.
- CC skills name the helper path via `${CLAUDE_PLUGIN_ROOT}`; GHCP keeps base-dir resolution.
- Add `fork` to the CC SessionStart matcher; GHCP `shell` → `execute`; drop the unused
  `task`/`todo` aliases; add the hook 10k-char guard to verify.
- Add a GHCP autopilot note to build.

**Out of scope:** stop hooks that force Build to continue, `context: fork`, and GHCP's Agent
Plugins 1.0 manifest.

**Acceptance criteria:**
- [ ] AC1: both hooks.json files carry session + subagent hooks, and all four run under bash and dash with valid context under 10k chars
- [ ] AC2: agents carry effort + gorp preload; GHCP agents carry model lists and `execute`
- [ ] AC3: the platform-only blocks resolve per platform with no stray markers; unbalanced markers fail the build
- [ ] AC4: `npm run verify` is green; docs describe the new mechanisms

## Build notes
**Amendments:**
- 2026-09-22: dropped the CC reviewer command allowlist (`Bash(git diff *)` in `tools`). The docs
  don't define a specifier's meaning in `tools`; in `disallowedTools` a specifier removes the
  whole tool. The reviewer stays read-only by prompt discipline.
