# The three explainer reels

`samples/mcp-explainer-reel.mp4`, `rag-…` and `upi-…` are hand-tuned Remotion compositions
(`styles/remotion/src/mcpreel/McpReel.tsx`, `RagReel.tsx`, `UpiReel.tsx`). Unlike the styles, each beat is keyed to a
specific spoken word. The reusable **EDTech** style (`--style edtech`) was distilled from them.

Each folder holds:

| File | What |
|---|---|
| `script.json` | One entry per sentence: `chapter` (hook / task / problem / solution / cta), `cap` (caption text), `voice` (what the voice reads; same number of words, e.g. a number spelled out) |
| `map.json` | Word-index map: the animations were authored against an earlier word list; `map[i]` is the word in this script that cue `i` lands on |
| `research.md` | Facts and sources (RAG, UPI) |

## Rebuild one (example: UPI)

macOS/Linux commands; on Windows use `.venv\Scripts\python.exe` and `.venv-tts\Scripts\python.exe`.

```bash
mkdir -p output/reels/upi && cp examples/reels/upi/script.json output/reels/upi/
# 1. narration with word timings (final voice Liam, exactly as ElevenLabs delivers it: default settings, no pause or speed edits)
.venv/bin/python pipeline/reel_voice.py output/reels/upi --voice TX3LPaxmHKxFdv7VOQHJ
# 2. Whisper check: word match and caption offset
.venv-tts/bin/python pipeline/reel_asr_check.py output/reels/upi
```

3. Put the new timings into the composition's props (`styles/remotion/src/mcpreel/upi-en-props.json`: replace
   `words`, set `duration` to the last word's end + 1.0) and copy `voiceover.mp3` to `styles/remotion/public/upireel-en/`.
4. Sound effects and master (cue list: `kind:word-index[:dB]`; a ping is added at every chapter start):

```bash
.venv/bin/python pipeline/reel_mix.py output/reels/upi styles/remotion/src/mcpreel/upi-en-props.json \
  "pop:36:-28 pop:43 pop:61 pop:83:-28 pop:98 pop:117 pop:124:-28 pop:137:-28 pop:141 ding:150 ding:152:-22 thud:161:-11 pop:164 pop:186:-28"
```

5. Render and mux:

```bash
cd styles/remotion && npx remotion render src/index.ts UpiReelEn ../../output/reels/upi/video.mp4 --codec=h264 --crf=14 --concurrency=3 && cd ../..
ffmpeg -i output/reels/upi/video.mp4 -i output/reels/upi/mix_master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart output/reels/upi/upi-explainer-reel.mp4
```

Cue lists for the other two: MCP `"thud:17:-8 thud:68:-9 thud:145:-10 pop:84 pop:96 pop:110 pop:176 pop:190 pop:204"`,
RAG `"thud:22:-8 thud:59:-9 pop:91 pop:122 pop:150:-28 pop:163:-28 pop:178:-28 pop:188"`.

`pipeline/reel_anchor_map.py` builds a new `map.json` when you rewrite a script, and `pipeline/reel_sheet.py` makes a
frame contact sheet for review.
