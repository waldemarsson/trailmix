#!/usr/bin/env bash
set -euo pipefail

# trailmix installer — copy generated assets into a project or your home config.
#
# Usage: ./install.sh [--target DIR] [--global] [--claude] [--ghcp]
#   --target DIR   project to install into (default: current directory). Ignored with --global.
#   --global       install into per-CLI home config (all projects) instead of one project.
#   --claude       install Claude Code assets only.
#   --ghcp         install GitHub Copilot CLI assets only.
# With no platform flag, auto-detects installed CLIs (`claude`, `copilot`);
# if neither is found, installs both.
#
# Placement:
#   Claude Code  project: .claude/{skills,agents} + root AGENTS.md + root CLAUDE.md (imports AGENTS.md)
#                global:  ~/.claude/{skills,agents} + ~/.claude/AGENTS.md + ~/.claude/CLAUDE.md (import)
#   Copilot CLI  project: .github/{skills,agents} + root AGENTS.md
#                global:  ~/.copilot/{skills,agents} + ~/.copilot/copilot-instructions.md (managed block)
# (Claude Code reads CLAUDE.md, not AGENTS.md, so we ship a CLAUDE.md that imports it.)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="."
SCOPE="project"
DO_CLAUDE=0
DO_GHCP=0
EXPLICIT=0

while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    --global) SCOPE="global"; shift ;;
    --claude) DO_CLAUDE=1; EXPLICIT=1; shift ;;
    --ghcp)   DO_GHCP=1; EXPLICIT=1; shift ;;
    -h|--help) sed -n '3,20p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [ "$EXPLICIT" -eq 0 ]; then
  command -v claude  >/dev/null 2>&1 && DO_CLAUDE=1
  command -v copilot >/dev/null 2>&1 && DO_GHCP=1
  if [ "$DO_CLAUDE" -eq 0 ] && [ "$DO_GHCP" -eq 0 ]; then DO_CLAUDE=1; DO_GHCP=1; fi
fi

# Build dist if missing.
[ -d "$SCRIPT_DIR/dist" ] || node "$SCRIPT_DIR/build/generate.mjs"

# Copy each top-level entry from $1 into $2, replacing only same-named entries
# (never wipes the whole dir — safe for shared/global skill & agent folders).
copy_items() { # $1=src_dir $2=dest_dir
  mkdir -p "$2"
  for entry in "$1"/*; do
    [ -e "$entry" ] || continue
    local name; name="$(basename "$entry")"
    rm -rf "$2/$name"
    cp -R "$entry" "$2/$name"
  done
}

# Guarantee a CLAUDE.md at $1/ that imports AGENTS.md (create or append; non-destructive).
ensure_claude_import() { # $1=dir
  local f="$1/CLAUDE.md" line="@AGENTS.md"
  if [ -f "$f" ]; then
    grep -qF "$line" "$f" || printf '\n%s\n' "$line" >> "$f"
  else
    printf '%s\n' "$line" > "$f"
  fi
}

# Write a trailmix-managed block into an instructions file, replacing any prior block.
write_managed_block() { # $1=dest_file $2=content_file
  local f="$1" src="$2" start="<!-- trailmix:start -->" end="<!-- trailmix:end -->"
  mkdir -p "$(dirname "$f")"
  if [ -f "$f" ]; then
    awk -v s="$start" -v e="$end" 'BEGIN{skip=0} $0==s{skip=1;next} $0==e{skip=0;next} skip==0{print}' "$f" > "$f.tmp"
  else
    : > "$f.tmp"
  fi
  { echo "$start"; cat "$src"; echo "$end"; } >> "$f.tmp"
  mv "$f.tmp" "$f"
}

install_claude() {
  local src="$SCRIPT_DIR/dist/claude" skills agents core
  if [ "$SCOPE" = "global" ]; then
    skills="$HOME/.claude/skills"; agents="$HOME/.claude/agents"; core="$HOME/.claude"
  else
    skills="$DEST/.claude/skills"; agents="$DEST/.claude/agents"; core="$DEST"
  fi
  copy_items "$src/skills" "$skills"
  copy_items "$src/agents" "$agents"
  cp "$src/AGENTS.md" "$core/AGENTS.md"
  ensure_claude_import "$core"
  echo "installed claude -> $skills, $agents, $core/{AGENTS.md,CLAUDE.md}"
}

install_ghcp() {
  local src="$SCRIPT_DIR/dist/ghcp" skills agents
  if [ "$SCOPE" = "global" ]; then
    skills="$HOME/.copilot/skills"; agents="$HOME/.copilot/agents"
    copy_items "$src/skills" "$skills"
    copy_items "$src/agents" "$agents"
    write_managed_block "$HOME/.copilot/copilot-instructions.md" "$src/AGENTS.md"
    echo "installed ghcp -> $skills, $agents, ~/.copilot/copilot-instructions.md (managed block)"
  else
    skills="$DEST/.github/skills"; agents="$DEST/.github/agents"
    copy_items "$src/skills" "$skills"
    copy_items "$src/agents" "$agents"
    cp "$src/AGENTS.md" "$DEST/AGENTS.md"
    echo "installed ghcp -> $skills, $agents, $DEST/AGENTS.md"
  fi
}

if [ "$SCOPE" = "project" ]; then
  DEST="$(cd "$TARGET" && pwd)"
fi

[ "$DO_CLAUDE" -eq 1 ] && install_claude
[ "$DO_GHCP"   -eq 1 ] && install_ghcp

if [ "$SCOPE" = "global" ]; then
  echo "trailmix installed globally (home config)"
else
  echo "trailmix installed into $DEST"
fi
