# Eval results log

One block per run batch, per CLI + version. On FAIL, record what the model did instead — that's
the signal for which description/instruction to tune. Ad-hoc checks (not a full fresh-session
scenario) are marked as such.

```
CLI: Claude Code (Fable 5)   date: 2026-07-08
helper-invocation (ad-hoc, backs resume-continues)
  pre-fix:  FAIL — ${CLAUDE_PLUGIN_ROOT} unset in the tool shell; documented trail.mjs
            command errored with "Cannot find module /skills/trailhead/refs/trail.mjs"
  post-fix: PASS — resolved from the loaded skill's base directory; `trail.mjs status` ran
            (also via the sibling-skill relative path)
trailhead-fires            not yet run
discuss-checkpoint-holds   not yet run
trivial-collapse           not yet run
implement-iron-law         not yet run
reviewer-hands-off         not yet run
resume-continues           not yet run
status-surveys             not yet run
install-roundtrip          partial — plugin installed + SessionStart hook injecting (observed
                           live); GHCP side not verified
```

```
CLI: Copilot CLI <version>   date: —
(no runs recorded yet)
```
