#!/usr/bin/env bash
# SmartLab Sound Kit — idempotent setup for macOS / Linux / cloud sandbox.
# Installs: Real SFX skill, Earshot (+ MCP), procedural SFX library. Openverse needs no install (public API).
# Usage:  ./bootstrap.sh [SHARED_DIR]
#   SHARED_DIR = folder synced between machines (Google Drive for desktop), e.g.
#   "$HOME/Library/CloudStorage/GoogleDrive-<email>/My Drive/SmartLab-Sound"
#   It holds downloaded CC0 sounds, generated music and CREDITI.md. NEVER the .venv or the model cache
#   (the Hugging Face cache uses symlinks, which Google Drive cannot sync: each Mac keeps its own).
set -euo pipefail

CLIPWING_COMMIT="edbefcbc3474869e6cc1e8a7ca583b0efd0dab7e"   # github.com/Clipwing/skills
EARSHOT_COMMIT="591fa3e028032e6dce56620a20e932e35667e8d8"     # github.com/Leonxlnx/earshot

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOME_KIT="${SOUND_KIT_HOME:-$HOME/.smartlab-sound-kit}"         # per-machine (venv, clones)
SHARED="${1:-${SMARTLAB_SOUND_SHARED:-$HOME_KIT/shared}}"       # synced between machines
mkdir -p "$HOME_KIT/src" "$HOME_KIT/cache" "$SHARED/sfx-openverse" "$SHARED/sfx-procedural" "$SHARED/music-gemini"

need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 1; }; }
need python3; need git; need ffmpeg
python3 - <<'EOF' || { echo "Python >= 3.10 required"; exit 1; }
import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)
EOF

clone_pin() {  # url dir commit
  [ -d "$2/.git" ] || git clone --quiet "$1" "$2"
  git -C "$2" fetch --quiet origin && git -C "$2" checkout --quiet "$3"
}
clone_pin https://github.com/Clipwing/skills.git "$HOME_KIT/src/clipwing-skills" "$CLIPWING_COMMIT"
clone_pin https://github.com/Leonxlnx/earshot.git "$HOME_KIT/src/earshot" "$EARSHOT_COMMIT"

# venv is machine-specific: never sync it
[ -x "$HOME_KIT/.venv/bin/python" ] || python3 -m venv "$HOME_KIT/.venv"
PIP="$HOME_KIT/.venv/bin/pip"; PY="$HOME_KIT/.venv/bin/python"
"$PIP" install -q --upgrade pip soundfile
# CPU torch: PyTorch's CPU index on Linux; the default PyPI wheel is right on macOS (Apple Silicon)
if [ "$(uname -s)" = "Linux" ]; then
  "$PIP" install -q torch --index-url https://download.pytorch.org/whl/cpu || "$PIP" install -q torch
else
  "$PIP" install -q torch
fi
"$PIP" install -q -e "$HOME_KIT/src/earshot[mcp,llm]"

# Real SFX skill (copy; keeps the skill folder itself untouched by runs)
mkdir -p "$HOME/.claude/skills"
rm -rf "$HOME/.claude/skills/real-sfx"
cp -R "$HOME_KIT/src/clipwing-skills/skills/real-sfx" "$HOME/.claude/skills/real-sfx"

# Procedural SFX fallback library -> shared folder
( cd "$SHARED/sfx-procedural" && "$PY" -I "$KIT/scripts/sfx_synth.py" )
( cd "$HOME/.claude/skills/real-sfx" && python3 -I scripts/setup.py add-library proc_fallback "$SHARED/sfx-procedural/sfx_lib" --tier extra --index || true )

# Earshot: models cached LOCALLY on each machine (~1.1 GB, downloaded once per machine)
export HF_HOME="$HOME_KIT/cache/hf-home" EARSHOT_HOME="$HOME_KIT/cache/earshot"
"$HOME_KIT/.venv/bin/earshot" doctor --fetch | grep -E "^(fetched|problems)" || true

# MCP registration (user scope, with the shared cache wired in)
if command -v claude >/dev/null; then
  claude mcp remove earshot --scope user >/dev/null 2>&1 || true
  claude mcp add earshot --scope user -e HF_HOME="$HF_HOME" -e EARSHOT_HOME="$EARSHOT_HOME" -- "$PY" -m earshot mcp
else
  echo "claude CLI not found: register later with: claude mcp add earshot --scope user -- $PY -m earshot mcp"
fi
echo "OK. Shared folder: $SHARED"
echo "To use Earshot from any shell, add to ~/.zshrc:"
echo "  export EARSHOT_HOME=\"$EARSHOT_HOME\" HF_HOME=\"$HF_HOME\""
