#!/usr/bin/env bash
set -euo pipefail

# trailmix verify — regenerate dist/ and the root marketplace stubs, then assert the
# generated plugin structure is sound. No installer: the only supported install path is
# each CLI's marketplace/plugin system, reading dist/claude/ and dist/ghcp/ directly.
# dist/herdr-app/ (the Herdr app mod) is checked for its files, embedded trail.mjs, and the
# mod runtime's limits.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() { echo "FAIL: $1" >&2; exit 1; }
check() { [ -e "$2" ] || fail "$1: missing $2"; }
valid_json() { node -e "JSON.parse(require('fs').readFileSync('$2','utf8'))" 2>/dev/null || fail "$1: invalid JSON at $2"; }

node "$SCRIPT_DIR/build/generate.mjs" >/dev/null

GENERATED_PATHS="dist/ .claude-plugin/marketplace.json .github/plugin/marketplace.json"
if [ -n "$(git -C "$SCRIPT_DIR" status --porcelain -- $GENERATED_PATHS)" ]; then
  fail "generated output is stale vs. src/ — run 'npm run build' and commit the result"
fi

# --- trail.mjs frontmatter helper: unit tests + lint this repo's own trail artifacts ---
node --test "$SCRIPT_DIR/build/trail.test.mjs" >/dev/null \
  || fail "trail.mjs helper tests failed (run: node --test build/trail.test.mjs)"
( cd "$SCRIPT_DIR" && node src/skills/trailmix-trailhead/refs/trail.mjs check ) >/dev/null \
  || fail "trail frontmatter lint failed (run: node src/skills/trailmix-trailhead/refs/trail.mjs check)"

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
if grep -rn 'trailmix-' "$C" | grep -v 'trailmix-marketplace' >&2; then
  fail "claude build: unstripped trailmix- prefix (above)"
fi

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

# --- dist/herdr-app: Herdr desktop app mod ---
H="$SCRIPT_DIR/dist/herdr-app"
node --test "$SCRIPT_DIR/build/herdr-app.test.mjs" >/dev/null \
  || fail "herdr-app mod tests failed (run: node --test build/herdr-app.test.mjs)"
check "herdr-app recipe"        "$H/RECIPE.md"
check "herdr-app main.js"       "$H/mods/trailmix/main.js"
check "herdr-app mod.json"      "$H/mods/trailmix/mod.json"
check "herdr-app trail-source"  "$H/mods/trailmix/trail-source.js"
valid_json "herdr-app mod.json" "$H/mods/trailmix/mod.json"
# The mod runtime has no Node APIs or timers; trail-source.js is data (trail.mjs as a string).
node --input-type=module -e '
  import { readFileSync, readdirSync } from "node:fs";
  const [root, dir] = process.argv.slice(1);
  const { default: src } = await import(dir + "/trail-source.js");
  if (src !== readFileSync(root + "/src/skills/trailmix-trailhead/refs/trail.mjs", "utf8"))
    throw new Error("trail-source.js does not embed the current trail.mjs");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "trail-source.js")) {
    const code = readFileSync(dir + "/" + f, "utf8");
    // Static imports only: logic.js builds a loader string that contains a dynamic import().
    const specs = [...code.matchAll(/^\s*import\s+(?:[^;"\x27]*?\bfrom\s*)?["\x27]([^"\x27]+)["\x27]/gm)].map((m) => m[1]);
    const bad = specs.filter((s) => !["gpui-kit", "gpui-base", "herdr"].includes(s) && !s.startsWith("./") && !s.startsWith("../"));
    if (bad.length) throw new Error(f + ": disallowed import " + bad.join(", "));
    const api = code.match(/\bsetTimeout\b|\bsetInterval\b|["\x27]node:|\brequire\(/);
    if (api) throw new Error(f + ": not available in the mod runtime: " + api[0]);
  }
' "$SCRIPT_DIR" "$H/mods/trailmix" || fail "herdr-app mod: embedded source or runtime check failed (above)"

# --- root marketplace stubs: point at the right subdirectory ---
check "root claude marketplace" "$SCRIPT_DIR/.claude-plugin/marketplace.json"
check "root ghcp marketplace"   "$SCRIPT_DIR/.github/plugin/marketplace.json"
valid_json "root claude marketplace" "$SCRIPT_DIR/.claude-plugin/marketplace.json"
valid_json "root ghcp marketplace"   "$SCRIPT_DIR/.github/plugin/marketplace.json"
grep -qF '"source": "./dist/claude"' "$SCRIPT_DIR/.claude-plugin/marketplace.json" \
  || fail "root claude marketplace: source doesn't point at ./dist/claude"
grep -qF '"source": "./dist/ghcp"' "$SCRIPT_DIR/.github/plugin/marketplace.json" \
  || fail "root ghcp marketplace: source doesn't point at ./dist/ghcp"

# --- hook commands actually run and produce valid output ---
# CC caps hook context at 10,000 chars (beyond it Claude only gets a file path + preview), so every
# injected context is size-checked too.
hook_cmd() { # $1=hooks.json $2=JS path to the command string
  node -e "console.log(JSON.parse(require('fs').readFileSync('$1','utf8')).hooks$2)"
}
check_context() { # $1=label $2=JS path under the parsed JSON output to the context ('' = raw stdout)
  local expr="d"; [ -n "$2" ] && expr="JSON.parse(d)$2"
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const s=$expr;if(typeof s!=='string'||!s.trim())throw new Error('missing');if(s.length>10000)throw new Error('over 10k')})" \
    || fail "$1: missing, malformed, or over 10,000 chars"
}
HOOK_OUT="$(mktemp)"
trap 'rm -f "$HOOK_OUT"' EXIT
run_hook() { # $1=shell $2=command $3=label $4=JS path to the context
  "$1" -c "$2" > "$HOOK_OUT" || fail "$3: command failed under $1"
  check_context "$3 ($1)" "$4" < "$HOOK_OUT"
}
SHELLS="bash"
# Also run under dash/POSIX sh if available: it interprets backslash escapes in `echo` by default
# (bash doesn't), which previously corrupted the GHCP JSON — regression guard.
command -v dash >/dev/null 2>&1 && SHELLS="bash dash"
for sh in $SHELLS; do
  run_hook "$sh" "$(hook_cmd "$C/hooks/hooks.json" '.SessionStart[0].hooks[0].command')" "claude SessionStart" ""
  run_hook "$sh" "$(hook_cmd "$C/hooks/hooks.json" '.SubagentStart[0].hooks[0].command')" "claude SubagentStart" ".hookSpecificOutput.additionalContext"
  run_hook "$sh" "$(hook_cmd "$G/hooks/hooks.json" '.sessionStart[0].bash')" "ghcp sessionStart" ".additionalContext"
  run_hook "$sh" "$(hook_cmd "$G/hooks/hooks.json" '.subagentStart[0].bash')" "ghcp subagentStart" ".additionalContext"
done

echo "OK — dist/claude and dist/ghcp are structurally sound plugins; dist/herdr-app is a sound mod; root marketplace stubs resolve; hooks run and emit valid output"
