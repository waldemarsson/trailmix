#!/usr/bin/env pwsh
# trailmix installer (Windows / PowerShell) — copy generated assets into a project or home config.
#
# Usage: ./install.ps1 [-Target DIR] [-Global] [-Claude] [-Ghcp]
#   -Target DIR   project to install into (default: current directory). Ignored with -Global.
#   -Global       install into per-CLI home config (all projects) instead of one project.
#   -Claude       install Claude Code assets only.
#   -Ghcp         install GitHub Copilot CLI assets only.
# With no platform switch, auto-detects installed CLIs (claude, copilot);
# if neither is found, installs both.
#
# Placement:
#   Claude Code  project: .claude/{skills,agents} + root AGENTS.md + root CLAUDE.md (imports AGENTS.md)
#                global:  ~/.claude/{skills,agents} + ~/.claude/AGENTS.md + ~/.claude/CLAUDE.md (import)
#   Copilot CLI  project: .github/{skills,agents} + root AGENTS.md
#                global:  ~/.copilot/{skills,agents} + ~/.copilot/copilot-instructions.md (managed block)
# (Claude Code reads CLAUDE.md, not AGENTS.md, so we ship a CLAUDE.md that imports it.)

param(
  [string]$Target = ".",
  [switch]$Global,
  [switch]$Claude,
  [switch]$Ghcp
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Home_ = [Environment]::GetFolderPath("UserProfile")

$doClaude = $Claude.IsPresent
$doGhcp = $Ghcp.IsPresent
if (-not $doClaude -and -not $doGhcp) {
  if (Get-Command claude -ErrorAction SilentlyContinue) { $doClaude = $true }
  if (Get-Command copilot -ErrorAction SilentlyContinue) { $doGhcp = $true }
  if (-not $doClaude -and -not $doGhcp) { $doClaude = $true; $doGhcp = $true }
}

if (-not (Test-Path "$ScriptDir/dist")) { node "$ScriptDir/build/generate.mjs" }

# Copy each top-level entry from $src into $dest, replacing only same-named entries.
function Copy-Items($src, $dest) {
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($entry in Get-ChildItem -Force $src) {
    $d = Join-Path $dest $entry.Name
    if (Test-Path $d) { Remove-Item -Recurse -Force $d }
    Copy-Item -Recurse -Force $entry.FullName $d
  }
}

# Guarantee a CLAUDE.md in $dir that imports AGENTS.md (create or append; non-destructive).
function Ensure-ClaudeImport($dir) {
  $f = Join-Path $dir "CLAUDE.md"
  $line = "@AGENTS.md"
  if (Test-Path $f) {
    if (-not (Select-String -Path $f -SimpleMatch $line -Quiet)) { Add-Content $f "`n$line" }
  } else {
    Set-Content $f $line
  }
}

# Write a trailmix-managed block into an instructions file, replacing any prior block.
function Write-ManagedBlock($file, $contentFile) {
  $start = "<!-- trailmix:start -->"; $end = "<!-- trailmix:end -->"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $file) | Out-Null
  $kept = @()
  if (Test-Path $file) {
    $skip = $false
    foreach ($l in Get-Content $file) {
      if ($l -eq $start) { $skip = $true; continue }
      if ($l -eq $end) { $skip = $false; continue }
      if (-not $skip) { $kept += $l }
    }
  }
  $block = @($start) + (Get-Content $contentFile) + @($end)
  Set-Content $file ($kept + $block)
}

function Install-Claude {
  $src = Join-Path $ScriptDir "dist/claude"
  if ($Global) {
    $skills = Join-Path $Home_ ".claude/skills"; $agents = Join-Path $Home_ ".claude/agents"; $core = Join-Path $Home_ ".claude"
  } else {
    $skills = Join-Path $Dest ".claude/skills"; $agents = Join-Path $Dest ".claude/agents"; $core = $Dest
  }
  Copy-Items "$src/skills" $skills
  Copy-Items "$src/agents" $agents
  New-Item -ItemType Directory -Force -Path $core | Out-Null
  Copy-Item -Force "$src/AGENTS.md" (Join-Path $core "AGENTS.md")
  Ensure-ClaudeImport $core
  Write-Host "installed claude -> $skills, $agents, $core/{AGENTS.md,CLAUDE.md}"
}

function Install-Ghcp {
  $src = Join-Path $ScriptDir "dist/ghcp"
  if ($Global) {
    $skills = Join-Path $Home_ ".copilot/skills"; $agents = Join-Path $Home_ ".copilot/agents"
    Copy-Items "$src/skills" $skills
    Copy-Items "$src/agents" $agents
    Write-ManagedBlock (Join-Path $Home_ ".copilot/copilot-instructions.md") "$src/AGENTS.md"
    Write-Host "installed ghcp -> $skills, $agents, ~/.copilot/copilot-instructions.md (managed block)"
  } else {
    $skills = Join-Path $Dest ".github/skills"; $agents = Join-Path $Dest ".github/agents"
    Copy-Items "$src/skills" $skills
    Copy-Items "$src/agents" $agents
    Copy-Item -Force "$src/AGENTS.md" (Join-Path $Dest "AGENTS.md")
    Write-Host "installed ghcp -> $skills, $agents, $Dest/AGENTS.md"
  }
}

if (-not $Global) { $Dest = (Resolve-Path $Target).Path }

if ($doClaude) { Install-Claude }
if ($doGhcp) { Install-Ghcp }

if ($Global) { Write-Host "trailmix installed globally (home config)" }
else { Write-Host "trailmix installed into $Dest" }
