# Review checklist (build · self-review)

Loaded just-in-time. Assess **every dimension** below against the code you actually read;
categorize findings by real severity and give each a stable id (H1 / M2 / L3…).

- **Brief alignment** — does it match the brief, its decisions, and its `## Build notes`
  *including `**Amendments:**`*? (An amended deviation is documented, not a departure.) Is every
  acceptance criterion met? Are deviations justified improvements or problematic departures? Flag
  them specifically. A solo decision in an escalate-class area (public contracts, dependencies,
  data, security, deploy/runtime), unless the brief's **Autonomy** line allows it, is a
  `judgment` finding. If the *brief itself* is wrong, say so.
- **Scope discipline** — every changed line traces to the brief. Drive-by edits (reformatting,
  unrequested type hints or docstrings, "improved" adjacent code, deleted pre-existing dead
  code) are findings; so are orphans the change left behind. Usually LOW · clear. Refactors the
  brief's scope requires aren't drive-bys.
- **Code quality** — separation of concerns, error handling, type safety, DRY without premature
  abstraction, edge cases.
- **Architecture** — sound design, scalability/performance, integrates cleanly.
- **Security** — input validation, secrets, injection, authz.
- **Testing** — tests verify real behavior (not just mocks), edge cases covered, all passing.
- **Style & formatting** — naming, readability, lint/format consistency.
- **Production readiness** — backward compatibility, migrations, no obvious bugs.

**Calibration:** not everything is HIGH. Categorize by *actual* severity:
- HIGH — bugs, security, data loss, broken/missing functionality (must fix).
- MEDIUM — architecture, missing features, poor error handling, test gaps (should fix).
- LOW — style, formatting, optimization, doc polish (nice to have).

Acknowledge what was done well before listing issues — accurate praise helps the implementer
trust the rest. (The leading one-line `Strengths:` entry is part of the report structure; GORP's
"no preamble" bans greetings and waffle, not this.) Be specific (file:line), explain WHY each
issue matters, give a clear verdict.
Tag each finding `clear` (unambiguous fix inside the brief's scope) or `judgment` (scope change,
trade-off, contradicts a brief decision). The orchestrator auto-fixes `clear` findings and hands
`judgment` ones to the human.
Don't say "looks good" without checking, don't mark nitpicks HIGH, don't comment on code you
didn't read, don't be vague, don't modify any file.

## Report shape (GORP)
Returned to the orchestrator; there's no review artifact. It feeds the fix loop and the handoff
report.
```
Strengths: <specific, file:line>
HIGH:
- H1 · file:line · what → why → fix · clear | judgment
MEDIUM:
- M1 · file:line · ...
LOW:
- L1 · file:line · ...
Acceptance criteria:
- [x] AC1
- [ ] AC2 — not met because ...
Verdict: Yes | No | With fixes — 1-line technical reasoning.
```

## Re-review block shape (delta mode)
Returned after a fix round — scoped to the fixed findings + regression risk only:
```
## Re-review (YYYY-MM-DD)
- H1 · held — fix verified at file:line
- M2 · not fixed — why, what's still wrong
- M3 (new) · file:line · introduced by the H1 fix → why → fix · clear | judgment
Verdict: Yes | No | With fixes — 1-line technical reasoning.
```
