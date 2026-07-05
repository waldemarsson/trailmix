---
name: trailmix-gorp
description: Compact, lossless agent-to-agent handoff format for subagent returns and
  agent-consumed handoffs. Pull when returning results from a subagent to an orchestrator or
  writing a handoff another agent will read. Never use for user-facing answers.
---

# GORP — dense handoffs between agents

For agent→agent handoffs only (subagent → orchestrator, or any handoff another agent consumes).
Never shape a user-facing answer this way. Goal: maximum signal, minimum tokens, zero loss of
what the reader needs.

## Rules
- **Artifacts on disk, not in chat.** Return a pointer to the file plus a distilled summary. The
  reader opens the diff/artifact from the terminal — don't paste it.
- **Evidence = counts + the exact command.** `npm test → 46/46 passed`, not the log. Never paste
  logs or diffs.
- **Findings are one line each**, with a stable id: `id · file:line · what → why → fix`
  (e.g. `H1 · auth.ts:42 · expiry uses < not <= → lets expired tokens pass → use <=`).
- **Hard word caps.** Keep returns tight (implementer ≤ ~400 words; reviewer/documenter ≤ ~300).
- **No preamble, no sign-off, no gratitude.** The return *is* the artifact.

## Return template
```
Changed: <files + one-line what each>
Tests: <cmd> → <counts>
Build/lint: <cmd> → <exit>
Findings:
- <id · file:line · what → why → fix>
Gaps / follow-ups: <none | ...>
```

## Optional (later)
For large structured returns, a columnar/keyed encoding can roughly halve size losslessly; for
huge uniform tool output, a recoverable sampler. Not required to start — the rules above capture
most of the win.
