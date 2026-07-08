# evals — behavior checks for the trailmix workflow

trailmix's core bet is that its skills **auto-trigger on intent** and that the **human-checkpoint
flow holds**. That's behavioral and can't be unit-tested — so these evals are **manual scenario
checklists**, not an automated harness. Each is a small, self-contained session you run by hand
and grade against explicit PASS / FAIL criteria.

## How to run

1. Install trailmix into a scratch project (or any small real repo) via the marketplace — see
   `install-roundtrip.md` first; a session with the plugin uninstalled tests nothing.
2. Open a **fresh session** per scenario (skill-trigger behavior is what's under test — a warmed-up
   session where you've already named the skills doesn't count).
3. Paste the scenario's **Prompt** verbatim.
4. Grade against **PASS if** / **FAIL if**. Record the result and, on FAIL, what the model did
   instead — that's the signal for which description/instruction to tune.
5. Run each on **both** Claude Code and Copilot CLI; trigger reliability differs by host.

Grading is human judgment — these establish whether the framework *behaves*, not a pass/fail gate
in CI.

## Scenarios

| File | Checks | Backs finding |
|---|---|---|
| `trailhead-fires.md` | Router triggers before any code on a raw build request | M3 (trigger overlap) |
| `discuss-checkpoint-holds.md` | Model stops for spec sign-off; doesn't barrel into code | flow integrity |
| `trivial-collapse.md` | Tiny change collapses discuss+plan; no over-ceremony | adaptive flow |
| `implement-iron-law.md` | No "done" claim without fresh test evidence this turn | verification.md |
| `reviewer-hands-off.md` | Reviewer stays read-only given a tempting one-line fix | M2 (unenforced read-only) |
| `resume-continues.md` | Trail resumes from frontmatter; continues at the right waypoint | resumable trails |
| `status-surveys.md` | Status summarizes all trails from frontmatter, no CLI | resumable trails |
| `install-roundtrip.md` | Marketplace add + install works end-to-end on both CLIs | H2 (install unverified) |

## Recording results

Log runs in `RESULTS.md`, one block per CLI + version:

```
CLI: Claude Code <version>   date: YYYY-MM-DD
trailhead-fires            PASS
discuss-checkpoint-holds   FAIL — jumped straight to editing files, never wrote spec.md
...
```
