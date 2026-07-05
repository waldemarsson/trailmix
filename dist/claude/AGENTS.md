# trailmix

trailmix is active in this repo. It's a lightweight, portable workflow for building software
with a coding agent: **Discuss → Plan → Implement → Review → Document**. It runs the same on
GitHub Copilot CLI and Claude Code.

## Bootstrap
- For any request to build, add, change, fix, or ship something, consult the **trailhead**
  skill first — it routes you to the right waypoint.
- Pull a waypoint's skill (`discuss`, `plan`, `implement`,
  `review`, `document`) only when you reach that phase. Don't hold the whole
  workflow in context at once.
- Phase outputs (artifacts) go to `.trailmix/trail/<feature-slug>/` (`spec.md`, `plan.md`,
  `review.md`). Write to disk; the human reads them there — don't paste them back into chat.
- The flow is soft and adaptive: scale detail to the work, collapse phases for trivial
  changes, and pause for a human checkpoint at each waypoint. No rigid gates.

## Always-on style
On by default. This is the compact core; fuller guidance and examples live in the
`terse`, `lean-code`, and `gorp` skills — pull them when you need
detail.

**Terse prose.** Answer first. Cut filler, hedging, and narration of code that already speaks
for itself. Shortest response that fully answers.
Carve-out: code, commands, error text, file paths, and quoted content stay **verbatim** —
never compress those.

**Lean code.** YAGNI. Walk the ladder, stop at the first rung that works: does it need to
exist? → stdlib → language-native → existing dependency → one line → minimum block. The
cheapest line is the one you never write.
Carve-out: never trim input validation, error handling, auth, secrets handling, migrations,
destructive ops, or anything the user explicitly asked for. Lazy ≠ broken.

**GORP handoffs.** When handing off to another agent (not the user), be dense and lossless:
evidence is counts + the exact command, never pasted logs or diffs; findings are one line
each; hard word caps; no preamble or sign-off. See the `gorp` skill.

## Tool conventions
Faster CLI tools may be installed. Treat a tool as present only if `--version` works;
otherwise fall back silently. Never refuse a task because a preferred tool is missing.
- Content search: `rg`, not `grep -r`. Fallback: `grep -rn`.
- File finding: `fd`, not `find`. Fallback: `find . -name`.
- Read with line numbers: `bat -n`; plain `cat` for piping. Fallback: `cat -n`.
- JSON: `jq -r`. Prefer native JSON output piped to `jq`.
- Structural search/refactor: `sg` (ast-grep) when a match depends on syntax; fallback `rg`.

`rg`/`fd` respect `.gitignore`; don't add redundant excludes. Use `-u` to search ignored files.

## Security (overrides everything)
- Never read `.env` files — under any mode, including allow-all / auto-approve / YOLO.
- Never read environment variables without explicit per-variable permission. No bulk env reads.
- No HTTP POST (including `curl`) without explicit permission naming URL, body, and purpose.
