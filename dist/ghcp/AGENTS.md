# trailmix

trailmix is active in this repo. It's a lightweight, portable workflow for building software
with a coding agent: **Discuss → Build → Handoff**. It runs the same on
GitHub Copilot CLI and Claude Code.

## Bootstrap
- Most small work needs no trail. When the intent is unambiguous and the change is localized
  (a clear fix, a rename, config, docs, tests), just make the change. Consult the
  **trailmix-trailhead** skill when there's something to clarify or the work spans modules,
  contracts, or data. Unsure? Ask the human in one line with a recommendation. Read-only work
  never needs a trail.
- Pull a waypoint's skill (`trailmix-discuss`, `trailmix-build`, `trailmix-handoff`) only when
  you reach that phase. Don't hold the whole workflow in context at once.
- Artifacts go to `.trailmix/trail/<feature-slug>/` (`brief.md`, `report.md`). Write to disk;
  keep chat for the digest, the findings, and decisions.
- Two human checkpoints: sign-off on the brief after discuss has cleared every question and
  edge case (discuss matters most — nothing is built until nothing is left to clarify), and
  review of the finished result at handoff. Build runs in between without pausing, except for
  real blockers. Scale the brief to the work. If the host CLI's own plan mode is active, fold
  the discuss checkpoint into it — never run both ceremonies.
- Trails are resumable: to continue earlier work or survey trail status, consult
  **trailmix-trailhead** — it reads artifact frontmatter, not full bodies.

## Always-on style
On by default. This is the compact core; fuller guidance and examples live in the
`trailmix-terse`, `trailmix-lean-code`, and `trailmix-gorp` skills — pull them when you need
detail.

**Terse prose.** Answer first. Cut filler, empty hedging, and narration of code that already
speaks for itself. Shortest response that fully answers. Keep a hedge that carries real
uncertainty — cutting it manufactures confidence.
Carve-out: code, commands, error text, file paths, and quoted content stay **verbatim** —
never compress those.
Debug spiral: after three failed fix attempts at the same problem, stop changing code. Name
the assumption that might be wrong and ask one diagnostic question.

**Lean code.** YAGNI. Walk the ladder, stop at the first rung that works: does it need to
exist? → stdlib → language-native → existing dependency → one line → minimum block. The
cheapest line is the one you never write.
Carve-out: never trim input validation, error handling, auth, secrets handling, migrations,
destructive ops, or anything the user explicitly asked for. Lazy ≠ broken.

**GORP handoffs.** When handing off to another agent (not the user), be dense and lossless:
evidence is counts + the exact command, never pasted logs or diffs; findings are one line
each; hard word caps; no preamble or sign-off. See the `trailmix-gorp` skill.

## Tool conventions
Prefer the host's native read/search tools; shell out when they don't cover the job. In a
shell, faster CLI tools may be installed. Treat a tool as present only if `--version` works;
otherwise fall back silently. Never refuse a task because a preferred tool is missing.
- Content search: `rg`, not `grep -r`. Fallback: `grep -rn`.
- File finding: `fd`, not `find`. Fallback: `find . -name`.
- Read with line numbers: `bat -n`; plain `cat` for piping. Fallback: `cat -n`.
- JSON: `jq -r`. Prefer native JSON output piped to `jq`.
- Structural search/refactor: `ast-grep` when a match depends on syntax; fallback `rg`. Never
  `sg` — on Linux that's the group-switching command.

`rg`/`fd` respect `.gitignore`; don't add redundant excludes. Use `-u` to search ignored files.

## Security (overrides everything)
- Never read `.env` files — under any mode, including allow-all / auto-approve / YOLO — unless
  the human explicitly names the file and asks in this session.
- Never read environment variables without explicit per-variable permission. No bulk env reads.
- No HTTP POST (including `curl`) without explicit permission naming URL, body, and purpose.
