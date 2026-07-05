#!/usr/bin/env bash
set -euo pipefail

# trailmix verify — build, then install into throwaway temp dirs (never this repo)
# and assert the resulting layout. Exercises project + global installs for both CLIs.
# Leaves no trace outside dist/: install output goes to mktemp dirs, removed on exit.
# dist/ and the root .claude-plugin//.github/plugin marketplace stubs are this repo's
# committed build output (marketplace installs read them directly), so this script
# regenerates them in place and fails if that changes anything uncommitted — stale
# generated output means someone edited src/ without running npm run build.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJ="$(mktemp -d)"
FAKE_HOME="$(mktemp -d)"
trap 'rm -rf "$PROJ" "$FAKE_HOME"' EXIT

fail() { echo "FAIL: $1" >&2; exit 1; }
check() { [ -e "$2" ] || fail "$1: missing $2"; }

node "$SCRIPT_DIR/build/generate.mjs" >/dev/null

GENERATED_PATHS="dist/ .claude-plugin/marketplace.json .github/plugin/marketplace.json"
if [ -n "$(git -C "$SCRIPT_DIR" status --porcelain -- $GENERATED_PATHS)" ]; then
  fail "generated output is stale vs. src/ — run 'npm run build' and commit the result"
fi

# --- project install (both CLIs) ---
"$SCRIPT_DIR/install.sh" --target "$PROJ" --claude --ghcp >/dev/null
check "project/claude skills"  "$PROJ/.claude/skills/trailmix-trailhead/SKILL.md"
check "project/claude agents"  "$PROJ/.claude/agents/trailmix-explorer.md"
check "project/claude AGENTS"  "$PROJ/AGENTS.md"
check "project/claude CLAUDE"  "$PROJ/CLAUDE.md"
grep -qF "@AGENTS.md" "$PROJ/CLAUDE.md" || fail "project CLAUDE.md missing @AGENTS.md import"
check "project/ghcp skills"    "$PROJ/.github/skills/trailmix-trailhead/SKILL.md"
check "project/ghcp agents"    "$PROJ/.github/agents/trailmix-explorer.agent.md"
check "project/ghcp AGENTS"    "$PROJ/AGENTS.md"

# --- global install (both CLIs) into a fake HOME ---
HOME="$FAKE_HOME" "$SCRIPT_DIR/install.sh" --global --claude --ghcp >/dev/null
check "global/claude skills"   "$FAKE_HOME/.claude/skills/trailmix-trailhead/SKILL.md"
check "global/claude agents"   "$FAKE_HOME/.claude/agents/trailmix-explorer.md"
check "global/claude CLAUDE"   "$FAKE_HOME/.claude/CLAUDE.md"
check "global/ghcp skills"     "$FAKE_HOME/.copilot/skills/trailmix-trailhead/SKILL.md"
check "global/ghcp agents"     "$FAKE_HOME/.copilot/agents/trailmix-explorer.agent.md"
check "global/ghcp instr"      "$FAKE_HOME/.copilot/copilot-instructions.md"
grep -qF "trailmix:start" "$FAKE_HOME/.copilot/copilot-instructions.md" \
  || fail "global copilot-instructions missing managed block"

# --- idempotency + non-destructiveness ---
mkdir -p "$FAKE_HOME/.copilot/skills/user-own"
echo mine > "$FAKE_HOME/.copilot/skills/user-own/SKILL.md"
HOME="$FAKE_HOME" "$SCRIPT_DIR/install.sh" --global --ghcp >/dev/null
check "user skill preserved"   "$FAKE_HOME/.copilot/skills/user-own/SKILL.md"
blocks=$(grep -c "trailmix:start" "$FAKE_HOME/.copilot/copilot-instructions.md")
[ "$blocks" -eq 1 ] || fail "expected 1 managed block, found $blocks"

echo "OK — verified project + global installs (both CLIs), import, managed block, idempotency"
