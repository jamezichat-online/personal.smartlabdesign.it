# SmartLab Sound Kit

Sound-design stack for SmartLabDesign motion-graphic Reels. One command per machine.

| Tool | Role | Install |
|---|---|---|
| Openverse API | CC0 / public-domain SFX and music search (`api.openverse.org/v1/audio/`) | none |
| Real SFX (Clipwing, pinned) | places real sounds on the timeline, SFX-only WAV, report | `bootstrap.sh` |
| Earshot (Leonxlnx, pinned, MIT) | "ears": describe / match / realness / critique / measure | `bootstrap.sh` |
| Procedural SFX | fallback library from `scripts/sfx_synth.py` | `bootstrap.sh` |
| Gemini (shared browser) | ad hoc music, as used for VoidSignal | manual |

## Setup (each Mac)

```bash
git clone https://github.com/jamezichat-online/personal.smartlabdesign.it.git
cd personal.smartlabdesign.it/docs/sound-kit
./bootstrap.sh "$HOME/Library/CloudStorage/GoogleDrive-<email>/My Drive/SmartLab-Sound"
```

Requires Python >= 3.10, git, ffmpeg (`brew install ffmpeg`). Re-running is safe.

## What lives where

- **Per machine (never synced):** `~/.smartlab-sound-kit/.venv`, source clones, `~/.claude/skills/real-sfx`, MCP registration.
- **Per machine (never synced):** Earshot/Hugging Face model cache in `~/.smartlab-sound-kit/cache` (~1.1 GB per Mac; Drive cannot sync HF symlinks).
- **Shared (Google Drive):** downloaded Openverse sounds, `CREDITI.md`, procedural library, Gemini music.

## Rules

- Openverse: **CC0 / public domain only** (`license=cc0,pdm`). Log each file (id, title, URL, licence) in `CREDITI.md`.
- Third-party code is pinned by commit in `bootstrap.sh`; review before bumping.
- Audio cannot be heard by Claude: levels are measured (`earshot measure`, ffmpeg `ebur128`), final listening is the human's. Target: -14 LUFS integrated, <= -1.5 dBTP.

## Network allowlist (cloud sessions only)

`api.openverse.org`, `cdn.freesound.org`, `huggingface.co`, `cas-server.xethub.hf.co`, `transfer.xethub.hf.co`, `cdn-lfs.hf.co`, `*.cdn.hf.co`, `download.pytorch.org`. Local Macs need none of this.
