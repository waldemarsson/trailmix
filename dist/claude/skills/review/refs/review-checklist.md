# Review checklist (review)

Loaded just-in-time. Assess **every dimension** below against the code you actually read;
categorize findings by real severity and give each a stable id (H1 / M2 / L3…).

- **Plan alignment** — does it match spec & plan? Is all planned functionality present? Are
  deviations justified improvements or problematic departures? Flag deviations specifically. If
  the *plan itself* is wrong, say so.
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
Don't say "looks good" without checking, don't mark nitpicks HIGH, don't comment on code you
didn't read, don't be vague, don't modify any file.

## Report shape (GORP)
```
---
slug: feature-slug
waypoint: review
status: draft
updated: YYYY-MM-DD
---
Strengths: <specific, file:line>
HIGH:
- H1 · file:line · what → why → fix
MEDIUM:
- M1 · file:line · ...
LOW:
- L1 · file:line · ...
Spec compliance:
- [x] AC1
- [ ] AC2 — not met because ...
Verdict: Yes | No | With fixes — 1-line technical reasoning.
```

## Re-review block shape (delta mode)
Appended to `review.md` after a fix loop — scoped to the fixed findings + regression risk only:
```
## Re-review (YYYY-MM-DD)
- H1 · held — fix verified at file:line
- M2 · not fixed — why, what's still wrong
- M3 (new) · file:line · introduced by the H1 fix → why → fix
Verdict: Yes | No | With fixes — 1-line technical reasoning.
```
