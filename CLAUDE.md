# Short Video Maker: guide for Claude Code

This repository makes finished 9:16 videos (Reels / Shorts) on the user's own computer: script → ElevenLabs narration →
animated style or licensed footage → word-by-word captions → music → quality-checked MP4. There is no web app: the user
works through Claude Code (slash commands below) or the terminal (`video.py`).

## Commands for the user

| Slash command | What it does |
|---|---|
| `/setup` | Install everything for this OS and check it (`setup.sh` / `setup.cmd`, then `video.py doctor`) |
| `/video-from-script <file or text> [--style S]` | The user's own script, used word for word |
| `/make-video <topic> [60s] [--style S]` | Research the topic, write and check the script, then make the video |
| `/styles [topic]` | Show styles, previews and commands; recommend one |
| `/voices [list|use|add|test|account]` | Manage ElevenLabs voices |

## Running things

- Always run from the project root. One entry point: `python3 video.py <command>` (Windows: `py video.py <command>`).
  It switches to the project's virtualenvs itself. `python3 video.py -h` lists the commands.
- If you must call a pipeline script directly: `.venv/bin/python pipeline/<x>.py` (Windows: `.venv/Scripts/python.exe`).
  Whisper-side scripts run in `.venv-tts`.
- Videos take minutes (fast ≈ 3–5 min, max ≈ 10–15 min per 60 s): run `video.py script` / `video.py make` in the
  background and wait for completion. Never start two renders at once (8 GB machines run out of memory).
- Results: `output/<name>/final/<name>.mp4` plus `.report.json`, `.cover.jpg`, `.sheet.jpg`, `.CREDITS.txt`.
  `python3 video.py list` lists them.

## Rules

- **ElevenLabs key:** never ask the user to paste it into chat, never print or log it. The user puts
  `ELEVENLABS_API_KEY=...` in `.env` or runs `python3 video.py voices key` in their own terminal.
- **Voices are used exactly as ElevenLabs delivers them.** Never add voice settings (speed, stability), never
  speed up, slow down, re-pace, cut pauses or re-EQ the narration. QC may only request a new take.
- **Official ElevenLabs voices** are in `config/voices.json`; users may add their own by voice ID. Never clone a real
  person's voice; never depict real people.
- **Own scripts are used as written.** Do not rewrite a user's script unless they ask.
- **Quality:** a video whose QC failed is not finished; say which check failed and why. Look at `final/*.sheet.jpg`.
- **Cross-platform:** the project must keep working on macOS, Windows and Linux. System-specific code lives only in
  `pipeline/plat.py` (paths, tools, UTF-8), `pipeline/asr.py` (Whisper backend), `pipeline/ocr.py` (OCR backend).
  Use `plat.venv_python()` / `plat.tool()`; never hard-code `.venv/bin/python` or call `npx` without `plat.tool()`.
  Read and write text files with `encoding="utf-8"`.
- English scripts are 100% English (proper nouns and lakh/crore excepted); Indian audience by default (see
  `.claude/commands/make-video.md`).

## Where things are

`video.py` (CLI) · `pipeline/` (engine; `make_video.py` orchestrates) · `styles/styles.json` (style registry) ·
`styles/remotion/`, `styles/explainroo/` (style code) · `config/voices.json` (voice registry) · `examples/` (storyboards,
reel sources) · `samples/` (sample videos, style previews) · `docs/` (styles gallery, storyboard format, voices,
architecture, troubleshooting) · `output/` (generated, git-ignored).
