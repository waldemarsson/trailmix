# Weight heuristics (document)

Loaded when unsure whether a change is worth documenting.

## The core test
> Would a developer joining this project in six months be worse off not knowing this?

Yes → document. No → skip. Most diff content fails this test; that's expected. **Zero output is
a correct outcome.**

## Categories of weight — document these
1. **Package / tool choices** — adopted/replaced/removed a notable package or tool. Document the
   *choice*, not the version.
2. **Integrations** — how the project talks to an external system (contract/behavior, not
   internal renames).
3. **Tools & how to use them** — commands a developer must run to work on the project.
4. **Architectural decisions** — a chosen approach where alternatives were considered, or a new
   pattern. If the repo uses ADRs, new decisions become new numbered ADRs.
5. **Workarounds** — "does X unusual thing because of Y external constraint." Highest value —
   they decay silently. Always document the reason.
6. **Getting started** — prerequisites, setup, run, test — the onboarding path.
7. **Configuration** — env vars, config keys, defaults, precedence. Include defaults and whether
   required for local dev.
8. **Edge-case behavior** — retries, fallbacks, idempotency, ordering, timeouts, rate limits,
   partial failure — anything surprising when reading the code.
9. **Breaking changes** — removed/renamed public APIs, config keys, CLI flags, schemas, minimum
   runtime versions. Loudest of all; include migration steps.
10. **For the agent** — a convention, workaround, or gotcha the *next trail's agent* needs (a
    rule it would otherwise re-learn by failing: "X env var is unset in tool shells", "always
    regenerate dist/ before verify"). Goes to the repo's agent instructions (`CLAUDE.md` /
    `AGENTS.md`) as **one tight line**, not a paragraph. Higher bar than human docs: only rules
    that change agent behavior, never narrative. Zero additions is the norm.

## Noise — almost never document on its own
Patch/minor version bumps, lockfile churn, formatting/whitespace/comment edits, private renames,
generated files, pure test additions (unless a new testing pattern), IDE config, bug fixes that
restore documented behavior, refactors with no external surface.

If the whole change is noise, say "nothing needs documenting" and stop. Don't manufacture weight.
