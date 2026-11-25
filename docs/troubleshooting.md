# Troubleshooting

Start with `python3 video.py doctor` (Windows: `py video.py doctor`): it shows which part is missing.
`python3 video.py selftest` checks the whole local toolchain without spending credits. For a failed video, open
`output/<name>/final/*.report.json` (the step that failed and why) and `output/<name>/work/pipeline-*.log`.

## Installation

| Problem | Fix |
|---|---|
| `Missing: node` (or ffmpeg, git) on Windows right after installing it | Open a new terminal so the updated `PATH` is loaded, then run `setup.cmd` again. |
| `py` is not recognised (Windows) | Install Python 3.12 from python.org or `winget install Python.Python.3.12`, ticking "Add to PATH". |
| Whisper is slow on Windows/Linux | It runs on the CPU there. Set `WHISPER_MODEL=small` in `.env` for faster (slightly less exact) checks, or use an NVIDIA GPU. |
| `ModuleNotFoundError: faster_whisper` / `rapidocr_onnxruntime` | Re-run the setup (`./setup.sh` or `setup.cmd`); it installs the right packages for your system. |
| Garbled Hindi text or `UnicodeDecodeError` on Windows | Run commands through `py video.py …`; it switches to UTF-8 mode by itself. If you call Python another way, set `PYTHONUTF8=1`. |
| `Missing: Python 3.12` | macOS `brew install python@3.12` · Windows `winget install Python.Python.3.12` · Linux `sudo apt install python3.12 python3.12-venv`, then run the setup again. |
| `pip install` fails on `torch` | Make sure `.venv` was made with Python 3.12: delete the `.venv` folder and run the setup again. |
| `npm ci` fails | Node 20 or newer is needed: `node -v`. Update it from nodejs.org (or `brew upgrade node` / `winget upgrade OpenJS.NodeJS.LTS`). |
| `explainroo` clone fails | Check your internet connection or a proxy; `git clone https://github.com/vincentsch/explainroo.git` must work. |
| `iCloud replaced the symlink(s)` | Only if the project sits in an iCloud-synced folder and you made `*.nosync` folders. The message prints the exact fix. Easier: keep the project outside iCloud Drive. |

## Claude Code

| Problem | Fix |
|---|---|
| `claude: command not found` | Install it (README §5) and open a new terminal. Windows also needs Git for Windows. |
| "Not logged in" / authentication error | Run `claude` and sign in, or `/login` inside Claude Code. |
| The slash commands don't appear | Start Claude Code **inside the project folder** (`cd short-video-maker && claude`); the commands live in `.claude/commands/`. |
| Claude Code asks permission for every command | When asked, allow `python3 video.py:*` (Windows `py video.py:*`) for this project. |
| `/make-video` web research fails | Your Claude Code plan or settings may not allow web search; give it the facts yourself, or use `/video-from-script`. |
| Claude Code asks for the API key | Don't paste it in chat. Put it in `.env` or run `python3 video.py voices key` in your own terminal. |

## ElevenLabs

See the table in [voice-configuration.md](voice-configuration.md#troubleshooting). The most common ones:
`401` (key wrong or lacking Text to Speech permission), `voice_not_found` (add the voice to My Voices),
`quota_exceeded` (out of credits).

## Rendering

| Problem | Fix |
|---|---|
| Render fails with "Request closed" or a timeout | Memory pressure. Close other apps, or set `REMOTION_CONCURRENCY=1` in `.env`. Long videos are rendered in chunks (`REMOTION_CHUNK`, default 900 frames). |
| First render is slow | Remotion downloads a headless Chromium once; Whisper and CLIP download on first use (about 2 GB in total). |
| Captions are early or late | Run in `max` mode: the `timing` check re-aligns and re-renders. |
| A word is mispronounced | Add `"say": {"Word": "phonetic-spelling"}` to that scene in the storyboard. |
| Footage does not match the line | Improve the scene's `footage.queries` (1–3 word searches) and `footage.subject` (a plain visual description). |
| Video ends abruptly or has a click between scenes | Run in `max` mode; the `blips` check fixes joins. |

## Audio

| Problem | Fix |
|---|---|
| Music too loud | The bed is ducked under the voice; if it still feels loud, lower `_music_lu` in the storyboard (higher number = quieter music). |
| Voice too fast or slow | That is the voice's own ElevenLabs pace; the pipeline never changes it. Pick another voice. |
| Different scenes sound a little faster or slower | Each scene is its own ElevenLabs take, delivered as is. The `pace` QC line reports the spread but does not change it. |

## Disk space

Generated videos and caches live in `output/`. Delete project folders you no longer need; `output/.cache/` can be
deleted at any time (ElevenLabs takes will be generated again and cost credits).
