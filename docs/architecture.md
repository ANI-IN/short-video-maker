# Architecture

Short Video Maker is a local toolchain driven from Claude Code or the terminal: one command (`video.py`), a Python
pipeline and two render engines, all on your computer (macOS, Windows or Linux). There is no web server. Outside services:
ElevenLabs for narration (always), Openverse/Wikimedia Commons for footage (footage styles only), and Claude through
Claude Code for research and script writing (`/make-video`).

Diagrams: [system](diagrams/system-architecture.md) · [video workflow](diagrams/video-generation-workflow.md) ·
[voice workflow](diagrams/voice-generation-workflow.md) · [repository](diagrams/repository-structure.md).

## Components

| Component | Files | Responsibility |
|---|---|---|
| Claude Code interface | `CLAUDE.md`, `.claude/commands/*.md` | Project guide and slash commands (`/setup`, `/video-from-script`, `/make-video`, `/styles`, `/voices`). `/make-video` does web research and writes a storyboard that passes the script checks. |
| Command line | `video.py` (standard library only) | One entry point on every OS: picks the right virtualenv and runs `doctor`, `selftest`, `styles`, `voices`, `script`, `make`, `list`, `feedback`, `samples`, `styles-doc`. |
| CLI tools | `pipeline/voices.py`, `doctor.py`, `selftest.py`, `feedback.py`, `eleven.py` | Voice registry and ElevenLabs account, setup check, offline self-test, performance feedback. |
| Script import | `pipeline/script_to_storyboard.py` | Turns a plain script into a storyboard without AI. |
| Orchestrator | `pipeline/make_video.py` | Runs every step below, prints `@@P {json}` progress lines, writes the report. |
| Script checks | `humanize.py`, `viral.py`, `hooks.py` | Stock-phrase and wording rules; hook, pacing and call-to-action rules for AI-written scripts. |
| Voice | `voice_worker.py`, `textnorm.py`, `asr.py`, `config/voices.json`, `pipeline/voice_config.json` | One ElevenLabs take per scene, used exactly as delivered (no speed, pause, pitch or EQ change); Whisper check, misheard scenes requested again. Runs in `.venv-tts`. |
| Footage | `footage.py` | Searches Openverse (photos) and Wikimedia Commons (clips), ranks results against the line with CLIP, adds depth for parallax, writes credits. |
| Audio master and timing | explainroo (downloaded by the setup), `engines.py`, `word_align.py` | Voice + generated music bed + sound effects; Whisper word timings for captions. Also draws the explainroo-engine styles. |
| Render | `styles/remotion` | React compositions: style scenes, footage motion, dissolves, captions. |
| Sound design | `sound_design.py`, `cine_sfx.py`, `indian_music.py` | Music bed by mood, ducking under the voice, whooshes and dings on cuts. |
| Finish | `engines.finish` | ffmpeg: x264 by mode, 30 fps, light sharpen, two-pass loudness to -15 LUFS. |
| QC and auto-fix | `qc.py`, `balance.py`, `captionband.py`, `textcheck.py`, `known_issues.*` | 14 checks (below); failed checks trigger targeted re-work in max and cinematic modes. |
| After the video | `cover.py`, `post_kit.py`, `learnings.py` | Cover frame, caption and hashtags, and a memory of what worked (`learnings.json`). |

## Two Python environments

- `.venv`: pipeline and CLI tools (PyTorch + transformers for CLIP and depth, librosa, Pillow, ocrmac on macOS or
  RapidOCR elsewhere).
- `.venv-tts`: Whisper (mlx-whisper on Apple Silicon, faster-whisper on Windows, Linux and Intel Macs). Kept apart so the large ML stacks do not fight over versions. `make_video.py`
  calls into it as a subprocess for the voice step, word timing and the audio checks.

## Data flow and files

```
output/<name>/
  storyboard.json          the script: scenes, narration, headlines, visual fields
  voice/<lang>/*.wav       one narration file per scene + voice_qc.json
  footage/                 downloaded media and CREDITS
  work/                    explainroo project, composites, intermediate audio
  final/<name>.mp4         the video
  final/<name>.report.json every step, timing, QC result, voice used, caption
  final/<name>.cover.jpg   chosen cover frame
output/.cache/             ElevenLabs takes, footage search results (safe to delete)
```

## QC checks

`timing` (caption drift), `pace` (reported only: ElevenLabs' pacing is kept), `word-pace` (stalled or rushed words; the scene is requested again), `blips` (clicks at joins), `music` (ducking),
`cuts`, `pronounce` (Whisper re-hears the final audio), `relevance` (footage matches the line), `motion`,
`balance` (no empty or crowded frame zones), `text-layout`, `caption-band`, `burned-text` (no stray text in footage),
`captions`. Fast mode runs the checks without fixing; max mode allows 2 auto-fix rounds, cinematic 4. A style can mark a check as not applicable (`qc_not_applied` in `styles/styles.json`), e.g. `balance` for EDTech's deliberately dark canvas.

## Design decisions

- **Local first.** Rendering, timing, checks and footage ranking run on your machine; only narration needs a paid service.
- **IDs, not voices.** The repository stores ElevenLabs voice IDs, never audio or models.
- **The voice as delivered.** ElevenLabs' audio is never sped up, slowed down, re-paced or re-equalised; quality
  control may only ask for a new take.
- **Cross-platform.** `pipeline/plat.py` (virtualenv paths, tools, UTF-8 on Windows), `pipeline/asr.py` (MLX Whisper on
  Apple Silicon, faster-whisper elsewhere) and `pipeline/ocr.py` (Apple Vision on macOS, RapidOCR elsewhere) keep every
  system-specific choice in one place. Setup is `install.py` (standard library only), wrapped by `setup.sh` / `setup.cmd`.
- **No web app.** Claude Code is the interface; `video.py` is the single command it (and you) run. Nothing listens on a
  network port, and videos never leave the `output/` folder.
- **One registry per concern.** Styles: `styles/styles.json`. Voices: `config/voices.json`. Whisper limits:
  `pipeline/voice_config.json`. Docs are generated from the style registry.
- **One video at a time.** Rendering is memory-heavy: start the next video after the current one finishes (8 GB machines run out of memory otherwise). Claude Code is told this in `CLAUDE.md`.
