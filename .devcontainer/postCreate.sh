#!/usr/bin/env bash
# .devcontainer/postCreate.sh
set -euo pipefail

echo ""
echo "🔧 Running post-create setup..."
echo ""

# ── Prepare Copilot bind-mount directories ────────────────────────────────────
for dir in "$HOME/.copilot/skills" "$HOME/.copilot/agents" "$HOME/.copilot/extensions" "$HOME/.copilot/workflow" \
    "$HOME/.copilot/installed-plugins" "$HOME/.copilot/plugin-data" "$HOME/.copilot/instructions" \
    "$HOME/.copilot/prompts" "$HOME/.copilot/commands" "$HOME/.copilot/hooks" \
    "$HOME/.agents" "$HOME/.agents/skills"; do
    mkdir -p "$dir"
done
for dir in "$HOME/.copilot/skills" "$HOME/.copilot/agents" "$HOME/.copilot/extensions" "$HOME/.copilot/workflow" \
    "$HOME/.copilot/installed-plugins" "$HOME/.copilot/plugin-data" "$HOME/.copilot/instructions" \
    "$HOME/.copilot/prompts" "$HOME/.copilot/commands" "$HOME/.copilot/hooks" "$HOME/.agents/skills"; do
    if [ ! -w "$dir" ]; then
        echo "⚠️  $dir is not writable by $(whoami); fix host ownership instead of changing from inside the container"
    fi
done
echo "✅ Copilot directories ready"
# (No Claude directory prep needed — ~/.claude is bind-mounted as a whole.)

# ── Set yolo aliases for Claude and CoPilot ───────────────────────────────────

grep -q 'yolopilot' "$HOME/.bashrc" 2>/dev/null \
    || echo "alias yolopilot='copilot --yolo --experimental'" >> "$HOME/.bashrc"


grep -q 'yoloclaude' "$HOME/.bashrc" 2>/dev/null \
    || echo "alias yoloclaude='claude --dangerously-skip-permissions'" >> "$HOME/.bashrc"


# ── Fix volume ownership ──────────────────────────────────────────────────────
# .claude and .copilot's bind-mounted subdirs (skills, agents, etc.) are direct host
# binds — never chown -R paths containing those, it would rewrite ownership on your
# actual host files. Only fix the .copilot directory entry itself (Docker may have
# auto-created it as root before the container started) and the true named volume.
echo "🔑 Fixing volume ownership..."
sudo mkdir -p "$HOME/.npm" "$HOME/.copilot"
sudo chown vscode:vscode "$HOME/.copilot"
sudo chown -R vscode:vscode "$HOME/.npm" 2>/dev/null || true
echo "   ✅ Done"

# ── Git credentials via PAT (no SSH key mounted) ──────────────────────────────
# GH_TOKEN (containerEnv, see devcontainer.json) is a fine-grained token scoped to just this
# repo, also picked up directly by the gh CLI. The helper reads it from the env at push/fetch
# time — never written to disk.
echo "🔐 Configuring git credential helper..."
git config --global credential.helper '!f() { echo username=x-access-token; echo password="$GH_TOKEN"; }; f'
echo "   ✅ Done"

# ── Migrate Claude Code to native installer ───────────────────────────────────
echo "🤖 Installing Claude Code (native)..."
claude install 2>/dev/null || true
echo "   ✅ Done"

# ── ast-grep (npm) ─────────────────────────────────────────────────────────────
# Installed here rather than the Dockerfile since it needs Node on PATH,
# which is only guaranteed once the Node devcontainer feature has run.
echo "🌳 Installing ast-grep..."
npm install -g @ast-grep/cli
echo "   ✅ Done"

# ── Smoke-test the repo toolchain ─────────────────────────────────────────────
# trailmix has zero npm dependencies — nothing to install. Instead prove the
# toolchain works end-to-end: unit tests + the build-freshness/structure check.
echo "🥾 Smoke-testing trailmix build + verify..."
node --test build/trail.test.mjs
npm run verify
echo "   ✅ Done"

# ── Drop NOPASSWD sudo rule ───────────────────────────────────────────────────
# All privileged setup is complete. Removing this means AI agents in auto-approve
# mode cannot escalate to root.
echo "🔒 Hardening: removing NOPASSWD sudo rule..."
sudo rm -f /etc/sudoers.d/vscode
echo "   ✅ sudo disabled for vscode user"

# ── Verification ─────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Environment Verification"
echo "══════════════════════════════════════════════════════════"
echo "  Node.js        : $(node --version 2>/dev/null || echo 'NOT FOUND')"
echo "  npm            : $(npm --version 2>/dev/null || echo 'NOT FOUND')"
echo "  Claude Code    : $(claude --version 2>/dev/null || echo 'NOT FOUND')"
echo "  Copilot CLI    : $(copilot --version 2>/dev/null || echo 'run: copilot')"
echo "  ripgrep        : $(rg --version 2>/dev/null | head -n1 || echo 'NOT FOUND')"
echo "  fd             : $(fd --version 2>/dev/null || echo 'NOT FOUND')"
echo "  bat            : $(bat --version 2>/dev/null || echo 'NOT FOUND')"
echo "  jq             : $(jq --version 2>/dev/null || echo 'NOT FOUND')"
echo "  tree           : $(tree --version 2>/dev/null | head -n1 || echo 'NOT FOUND')"
echo "  micro          : $(micro -version 2>/dev/null | head -n1 || echo 'NOT FOUND')"
echo "  ast-grep       : $(sg --version 2>/dev/null || echo 'NOT FOUND')"
echo "  Copilot skills : $(ls "$HOME/.copilot/skills" 2>/dev/null | wc -l) file(s)"
echo "  Copilot agents : $(ls "$HOME/.copilot/agents" 2>/dev/null | wc -l) file(s)"
echo "  Copilot plugins: $(ls "$HOME/.copilot/installed-plugins" 2>/dev/null | wc -l) file(s)"
echo "  Claude plugins : $(ls "$HOME/.claude/plugins/marketplaces" 2>/dev/null | wc -l) marketplace(s)"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "📋 Quick Start"
echo "  Build dist/:   npm run build"
echo "  Verify:        npm run verify"
echo "  Unit tests:    node --test build/trail.test.mjs"
echo "  Claude Code:   claude"
echo "  Copilot CLI:   copilot   (then: copilot auth login — config.json isn't mounted)"
echo ""
