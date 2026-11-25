---
description: Topic -> Instagram-tuned research -> humanised script in ONE language (English, Hindi or Hinglish) for an Indian audience -> max-quality voice -> animation and/or real licensed footage -> QC-passed 9:16 MP4. Local rendering; narration by ElevenLabs.
argument-hint: <topic> [duration, e.g. 60s] [--style <name>] [--mode fast|max|cinematic]
---

# /make-video

Input: `$ARGUMENTS`: a topic, optionally a duration (15–120 s, default 60 s) and `--style <name>`.
Run every command from the project root. On Windows use `.venv/Scripts/python.exe` wherever `.venv/bin/python` appears,
and `py` instead of `python3`. First run `python3 video.py doctor`; if a required item is missing, stop and tell the user
how to fix it (README § Installation). Before you start, read `docs/storyboard.md`, `docs/styles.md` and `learnings.md` (what past videos taught: lean toward what worked, avoid what QC or the visual review flagged; real
post-performance entries outrank internal QC guesses, and say which kind a recommendation is based on).
For a script the user already wrote, use `/video-from-script` instead.

## 0. Language: ask exactly one question, first (skip it if the user already named the language)
Use **AskUserQuestion** with one question, "Which language?", and exactly three options: English (Indian accent), Hindi, Hinglish.
Use only that language for the script, voice and captions (code `en`, `hi` or `hl`). Make more versions only if the user explicitly asks.
Then go straight through to the finished video: no previews, no style-sample renders, no other questions. The only loop is QC fix-and-recheck.
(`pipeline/render_samples.py` re-renders the dashboard's style gallery; run it ONLY when the user asks to preview/test a style on its own.)

**Indian audience (all languages):** Indian context and analogies first; ₹/rupaye, lakh/crore (never million/billion), DD/MM dates, metric
units; correct Sanskrit/Hindi spellings of mythological and historical names (add a `"say"` hint per scene for any name the voice might
mispronounce); CTAs in Hindi/Hinglish phrased the way Indian creators talk ("Comment mein batao...", "Apne us dost ko bhejo jo..."), never a
translated "like and subscribe". Research also checks what is trending in Indian Reels for the niche (desi formats, Bollywood-style pacing,
Hinglish hooks). The humaniser gate fails western units and known mis-spellings of names. Mark a topic about another country with
`"region": "global"` to switch the India rules off.

**Hinglish (`hl`):** write `narration.hl` in Roman script the way Indian creators caption Reels, AND `narration.hl_voice`: the same words
token for token in Devanagari (English loanwords as Indians say them: वॉर, लाइव, कमेंट). The voice reads `hl_voice`; captions show `hl`.

Quality mode (default `max`): `fast` draft (~3–6 min/120 s), `max` (~20–30 min/120 s), `cinematic` (up to ~2 h/120 s). Cinematic spends the extra time only on
research depth (10–15 searches, 3 sources per fact), more hooks (8), more voice retries per scene (up to 5), more footage query variants (up to 7/scene) and more QC fix rounds (4) — not on things capped by the hardware or models.

## 1. Research, tuned for Instagram Reels (WebSearch, standard mode; several searches in one turn)
- What hook formats, pacing and story angles are working on **Instagram Reels** in this topic's niche right now. Search for Reels specifically (e.g. "instagram reels <niche> hook format", "<niche> reels what works 2026", Instagram creator guidance, creator breakdowns), not generic web results.
- What's new or currently discussed about the topic, with dates.
- 3–6 facts, each CROSS-VERIFIED against at least 2 independent sources (3 in cinematic). Drop anything you can't corroborate and list it under "Dropped" in research.md.

Write `output/<slug>/research.md`. It covers: the Reels findings (formats, pacing, length) and how you know them, 2–3 angles with an opening hook each, the chosen angle and **hook pattern** with the reason, the facts with URLs, and anything you left out as unverified.

## 1b. Hook tournament
Write 4–5 different opening hooks (8 in cinematic), each tagged with its Reels hook format and a niche-fit score 0–10. Save them as `output/<slug>/hooks.json` (`[{"hook","format","fit"}]`),
run `.venv/bin/python pipeline/hooks.py output/<slug>/hooks.json <en|hi|hl>`, and open with the top scorer. Also store them in the
storyboard as `"hook_candidates": {"<lang>": [...]}`: the gate (`pipeline/viral.py`) fails a script with fewer than 4 distinct
candidates, one that doesn't open with the top-ranked hook, or a hook scoring under 79 (the Hindi MCP hook's level).
**English purity:** the English script must be 100% English: no Hindi/Hinglish words even if common in Indian English (jugaad,
yaar, desi...); proper nouns and lakh/crore are the only exceptions. `pipeline/humanize.py` fails any slip before voice.

## 2. Visual engine
If `--style` was given, use it. Otherwise pick one of the four engines and state the reason (`pipeline/recommend.py <topic>` gives the rule-based answer):
- `documentary-history`: historical, biographical or ancient topics. It cuts per scene between archive footage, parchment maps (`places`), timelines (`steps`) and short character reenactments (`stage`), with a measured narrator and serif parchment captions.
- `character-story`: a narrative or mythological moment where named characters act out a scene.
- `real-footage`: concrete modern subjects licensed photos/clips can show.
- an animation style (or a style plus mixed footage): abstract, explanatory, data or tips content.

## 3. Script -> `output/<slug>/storyboard.json` (schema: `docs/storyboard.md`)
- Hook → Problem → Payoff → CTA, built on the Reels findings. The hook lands the stakes, a number or a question within 2 s, with no greeting. Use 5–9 scenes for 60–120 s, and a new scene every 6–14 s.
- Length: English ≈ 2.8 words/s, Hindi ≈ 2.3 words/s, Hinglish ≈ 2.6 words/s.
- **Humanise.** No Humanise skill is installed, so these rules apply, enforced by `pipeline/humanize.py`:
  - no stock AI phrasing ("in today's fast-paced world", "here's the twist", "let that sink in", "buckle up", "you won't believe", "delve", "game-changer", ...)
  - vary sentence length hard: some 3–5-word punches, some 12–18-word sentences, never the same opener three times in a row
  - scene transitions should sound like speech, not a numbered template
  - write like a knowledgeable person talking to a friend: concrete nouns, sourced numbers, contractions
  - Hindi is natural spoken Hindi in Devanagari, with numbers written as words in the narration
- Give every scene: `headline` (2–6 words, `*keyword*`), `emoji`, `icon` (check with `node explainroo/bin/explainroo.js icons <word>`), the data fields the style uses, `"visual"` (`footage` | `anim` | `auto`) and `"visual_reason"`.
- Footage scenes also need `"footage": {"queries": ["1–3 word search", ...], "subject": "English, purely visual description", "keywords": ["ProperName"], "prefer": "image|video|any"}`.
- Run `.venv/bin/python pipeline/humanize.py output/<slug>/storyboard.json --lang <en|hi>` and rewrite until it passes. Fix the warnings too.

## 4–8. Produce (one command, runs everything plus QC and auto-fix)
```bash
python3 video.py make output/<slug>/storyboard.json --style <style> --lang <en|hi|hl> --mode <fast|max|cinematic> --name <slug>
```
Run it in the background (a 120 s video takes about 15–25 minutes) and wait for the notification. The command:
- voices the script with ElevenLabs (the final voice in `config/voices.json`, or the storyboard's `hosts`; needs `ELEVENLABS_API_KEY` in `.env`): one take per scene, used exactly as ElevenLabs delivers it (no speed, pause, pitch or EQ change). Every take is Whisper-checked and a misheard scene is requested again
- fetches licensed footage (Openverse photos, Wikimedia Commons clips) ranked by CLIP relevance to each line, with Ken Burns and depth parallax
- builds the audio master and Whisper timing with explainroo
- composites in Remotion with karaoke captions and dissolves
- mixes a niche-matched music bed (devotional / orchestral / modern / upbeat) ducked by a sidechain on the voice (rises in pauses) plus subtle whoosh/ding cues on hook, cuts and payoff, then exports with x264 (max: slow CRF 14) at 30 fps, a light sharpen and two-pass loudnorm to -15 LUFS
- runs QC (timing, scene + word pace, join blips, music ducking, cuts, pronunciation, relevance, motion, frame balance, text layout, caption band, burned-in text, captions), fixes what fails and re-renders, then scores the video against the FULL known-issues checklist (`pipeline/known_issues.json`) and writes the frame sheet for the visual self-review
- keeps everything crisp: no grain, scratches, vignette or blur anywhere. "Historical" is signaled only by color grade and serif captions

It exits non-zero if QC still fails. In that case, read `output/<slug>/final/*.report.json`, fix the cause (rewrite a line, better footage queries) and rerun. Never report a video that failed its QC as finished.

Afterwards, look at the frames yourself (visual self-review, never skipped): open `final/*.sheet.jpg` and go through every `look_for` line in `pipeline/known_issues.json` (report.json `review_prompt`). Fix and re-render anything a viewer would notice. When you find a NEW kind of problem, add it to `pipeline/known_issues.json`. Check that each footage scene really shows its line, and that no captions are cut off.

## 9. Report
- final file path and duration, and the language
- the TTS model used, the hook pattern and the hook line
- style / visual mode, and which scenes are footage (with credits: `final/*.CREDITS.txt`)
- the QC table and what QC caught and fixed
- research sources
