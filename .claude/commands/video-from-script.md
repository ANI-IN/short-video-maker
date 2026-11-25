---
description: Make a finished 9:16 video from a script the user already wrote (no AI writing). ElevenLabs narration, chosen style, captions, QC.
argument-hint: <path to script.txt, or the script pasted inline> [--style <name>] [--lang en|hi|hl] [--mode fast|max|cinematic] [--voice <key>]
---

# /video-from-script

Input: `$ARGUMENTS`. The user's own words are used exactly as written: do not rewrite, shorten or "improve" them.
Run everything from the project root. Windows: `py` instead of `python3`.

1. Run `python3 video.py doctor`. If a required item is missing, stop and tell the user how to fix it (README § Installation).
2. Get the script:
   - a file path: use it as is;
   - pasted text: save it to `output/scripts/<slug>.txt` (UTF-8), keeping the user's blank lines.
   Script format (README § Script format): a blank line starts a new scene; the first scene is the hook, the last the
   call to action; an optional first line `# Headline with a *keyword*`; lines starting with `- ` become numbered cards.
   If the script has no blank lines and is longer than ~40 words, ask once whether to split it into scenes at sentence
   breaks; otherwise keep it as written.
3. Pick a title (from the user, or the script's first line) and the style: the user's `--style`, else `edtech`.
   If the user asks which style suits, run `python3 video.py styles` and recommend one from docs/styles.md.
4. Run in the background (fast ≈ 3–5 min, max ≈ 10–15 min per 60 s):
   ```bash
   python3 video.py script <file> --title "<title>" --style <style> --lang <en|hi|hl> --mode <fast|max|cinematic> [--voice <key>]
   ```
5. When it finishes, read `output/<name>/final/<name>.report.json`. Report: the video path, duration, voice, style,
   the QC result (list any failed check with its detail) and the Instagram caption in the report. If QC failed, say so
   plainly; do not call the video finished. Look at `final/<name>.sheet.jpg` if it exists and mention anything a viewer
   would notice.
