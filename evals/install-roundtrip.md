# eval: marketplace install round-trip

**Checks:** the **only** supported install path actually works end-to-end on both CLIs against the
live repo. Backs finding H2 (never verified). Run this **first** — the behavioral evals assume a
real install.

Cannot be automated from the repo (needs the live CLIs + marketplace). Run by hand, tick each box.

## Claude Code

```
/plugin marketplace add waldemarsson/trailmix
/plugin install trailmix@trailmix-marketplace
```

- [ ] `marketplace add` resolves (clones the repo; the root `.claude-plugin/marketplace.json`
      points `source` at `./dist/claude`).
- [ ] `install` succeeds with no manifest/schema errors.
- [ ] Skills resolve **auto-namespaced**: `/trailmix:trailhead`, `/trailmix:discuss`, … exist
      (bare `discuss`, not `trailmix-discuss` — CC strips the manual prefix).
- [ ] Agents are present: `trailmix:explorer`, `trailmix:implementer`, `trailmix:reviewer`,
      `trailmix:documenter`.
- [ ] SessionStart hook fires: start/clear a session and confirm the AGENTS.md always-on core is
      injected (the bootstrap/style/security text appears as context).

**If it fails:** blob URLs aren't clonable — use `owner/repo`, not a URL. If skills show as
`trailmix:trailmix-discuss`, the CC prefix-strip regressed. If the hook doesn't fire, check
`dist/claude/hooks/hooks.json` matcher `startup|resume|clear|compact`.

## Copilot CLI

```
copilot plugin marketplace add waldemarsson/trailmix
copilot plugin install trailmix@trailmix-marketplace
```

- [ ] `marketplace add` resolves (root `.github/plugin/marketplace.json` → `./dist/ghcp`).
- [ ] `install` succeeds.
- [ ] Skills/agents keep the manual prefix: `trailmix-trailhead`, `trailmix-discuss`, … (GHCP
      never auto-namespaces — the prefix is the only collision guard).
- [ ] `plugin.json` declares `"hooks": "hooks/hooks.json"` and the `sessionStart` hook injects
      `{"additionalContext": …}` on a new/resumed session.

Also verify the marketplace-free direct path:

```
copilot plugin install waldemarsson/trailmix:dist/ghcp
```

- [ ] Direct subdirectory install works without the marketplace step.

**If it fails:** confirm `dist/ghcp/plugin.json` has the explicit `hooks` field (no
default-folder discovery on GHCP). If the injected context is malformed, re-check the hook uses
`printf '%s'` (not `echo`) — `echo` corrupts the JSON under `dash`.

## Record
Log CLI + version + date + pass/fail per box. On any fail, capture the exact error before moving
on — this is the gate that says the plugin is publishable.
