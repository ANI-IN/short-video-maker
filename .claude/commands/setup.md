---
description: Install and check everything this project needs on this computer (macOS, Windows or Linux), then guide the ElevenLabs key setup.
---

# /setup

Run from the project root.

1. Detect the OS. Run the setup: macOS/Linux `./setup.sh`, Windows `setup.cmd` (both run `install.py`). It is safe to re-run.
   If it stops with "Missing: <tool>", give the user the exact install command it printed (README § Prerequisites has
   one per OS) and wait for them to install it; do not install system packages yourself without asking.
2. Run `python3 video.py doctor` (Windows: `py video.py doctor`) and show the result.
3. If the ElevenLabs key is missing: NEVER ask the user to paste the key into this chat. Tell them to either
   - open `.env` in the project folder and set `ELEVENLABS_API_KEY=...`, or
   - run `python3 video.py voices key` in their own terminal (input is hidden).
   Then run `python3 video.py voices account` to confirm the key and show the credit balance.
4. Optional quick check without spending credits: `python3 video.py selftest`.
5. Finish with the next step: `/video-from-script` for their own script, or `/make-video <topic>`.
