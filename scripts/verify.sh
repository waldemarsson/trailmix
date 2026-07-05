#!/usr/bin/env bash
set -euo pipefail

# trailmix verify — regenerate dist/ and the root marketplace stubs, then assert the
# generated plugin structure is sound. No installer: the only supported install path is
# each CLI's marketplace/plugin system, reading dist/claude/ and dist/ghcp/ directly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() { echo "FAIL: $1" >&2; exit 1; }
check() { [ -e "$2" ] || fail "$1: missing $2"; }
valid_json() { node -e "JSON.parse(require('fs').readFileSync('$2','utf8'))" 2>/dev/null || fail "$1: invalid JSON at $2"; }

node "$SCRIPT_DIR/build/generate.mjs" >/dev/null

GENERATED_PATHS="dist/ .claude-plugin/marketplace.json .github/plugin/marketplace.json"
if [ -n "$(git -C "$SCRIPT_DIR" status --porcelain -- $GENERATED_PATHS)" ]; then
  fail "generated output is stale vs. src/ — run 'npm run build' and commit the result"
fi

# --- dist/claude: plugin structure ---
C="$SCRIPT_DIR/dist/claude"
check "claude plugin.json"      "$C/.claude-plugin/plugin.json"
check "claude marketplace.json" "$C/.claude-plugin/marketplace.json"
check "claude skill"            "$C/skills/trailhead/SKILL.md"
check "claude agent"            "$C/agents/explorer.md"
check "claude hooks"            "$C/hooks/hooks.json"
check "claude AGENTS"           "$C/AGENTS.md"
valid_json "claude plugin.json"      "$C/.claude-plugin/plugin.json"
valid_json "claude marketplace.json" "$C/.claude-plugin/marketplace.json"
valid_json "claude hooks.json"       "$C/hooks/hooks.json"

# --- dist/ghcp: plugin structure ---
G="$SCRIPT_DIR/dist/ghcp"
check "ghcp plugin.json"        "$G/plugin.json"
check "ghcp marketplace.json"   "$G/.github/plugin/marketplace.json"
check "ghcp skill"              "$G/skills/trailmix-trailhead/SKILL.md"
check "ghcp agent"              "$G/agents/trailmix-explorer.agent.md"
check "ghcp hooks"              "$G/hooks/hooks.json"
check "ghcp AGENTS"             "$G/AGENTS.md"
valid_json "ghcp plugin.json"      "$G/plugin.json"
valid_json "ghcp marketplace.json" "$G/.github/plugin/marketplace.json"
valid_json "ghcp hooks.json"       "$G/hooks/hooks.json"
grep -qF '"hooks": "hooks/hooks.json"' "$G/plugin.json" || fail "ghcp plugin.json missing hooks field"

# --- root marketplace stubs: point at the right subdirectory ---
check "root claude marketplace" "$SCRIPT_DIR/.claude-plugin/marketplace.json"
check "root ghcp marketplace"   "$SCRIPT_DIR/.github/plugin/marketplace.json"
valid_json "root claude marketplace" "$SCRIPT_DIR/.claude-plugin/marketplace.json"
valid_json "root ghcp marketplace"   "$SCRIPT_DIR/.github/plugin/marketplace.json"
grep -qF '"source": "./dist/claude"' "$SCRIPT_DIR/.claude-plugin/marketplace.json" \
  || fail "root claude marketplace: source doesn't point at ./dist/claude"
grep -qF '"source": "./dist/ghcp"' "$SCRIPT_DIR/.github/plugin/marketplace.json" \
  || fail "root ghcp marketplace: source doesn't point at ./dist/ghcp"

# --- hook commands actually run and produce valid JSON where required ---
bash -c "$(node -e "console.log(JSON.parse(require('fs').readFileSync('$C/hooks/hooks.json','utf8')).hooks.SessionStart[0].hooks[0].command)")" >/dev/null \
  || fail "claude SessionStart command failed to run"
GHCP_BASH_CMD="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$G/hooks/hooks.json','utf8')).hooks.sessionStart[0].bash)")"
check_ghcp_output() { # $1=shell used to run the command
  printf '%s' "$("$1" -c "$GHCP_BASH_CMD")" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const o=JSON.parse(d);if(typeof o.additionalContext!=='string')throw new Error('missing additionalContext')})" \
    || fail "ghcp sessionStart bash output isn't valid {additionalContext} JSON under $1"
}
check_ghcp_output bash
# Also check under dash/POSIX sh if available: it interprets backslash escapes in `echo` by
# default (bash doesn't), which previously corrupted this exact JSON — regression guard.
command -v dash >/dev/null 2>&1 && check_ghcp_output dash

echo "OK — dist/claude and dist/ghcp are structurally sound plugins; root marketplace stubs resolve; hooks run and emit valid output"
