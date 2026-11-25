"""Generate docs/styles.md (the style gallery with every command) from the style registry styles/styles.json,
so the two never drift apart.   usage: python3 video.py styles-doc   (or .venv/bin/python pipeline/styles_doc.py)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
reg = json.loads((ROOT / "styles" / "styles.json").read_text(encoding="utf-8"))
S = reg["styles"]
ORDER = ["Explainer", "Documentary", "Real footage", "Story & characters", "Text/typography", "Illustration/hand-drawn", "Flat & motion graphics", "Data & infographic", "Retro & novelty"]
groups = [g for g in ORDER if any(s["group"] == g for s in S.values())] + sorted({s["group"] for s in S.values()} - set(ORDER))
by = {g: sorted([(k, s) for k, s in S.items() if s["group"] == g], key=lambda x: x[1]["n"]) for g in groups}
anchor = lambda k: k.replace(" ", "-").lower()
out = ["# Video styles", "",
       "> Generated from [`styles/styles.json`](../styles/styles.json) by `pipeline/styles_doc.py`. Edit the registry, then run",
       "> `python3 video.py styles-doc` (Windows: `py video.py styles-doc`).", "",
       f"{len(S)} styles, all 1080×1920 (9:16) at 30 fps. Click a picture to watch that style's preview (`samples/styles/<style>.mp4`).",
       f"When no style is given, `video.py script` uses `{reg['default']}`.", "",
       "**Commands for any style** (replace `STYLE`; on Windows write `py` instead of `python3`):", "",
       "| Where | Command |", "|---|---|",
       "| Terminal, your own script | `python3 video.py script my-script.txt --title \"My video\" --style STYLE` |",
       "| Terminal, a storyboard JSON | `python3 video.py make my-storyboard.json --style STYLE` |",
       "| Claude Code, your own script | `/video-from-script my-script.txt --style STYLE` |",
       "| Claude Code, topic (AI writes the script) | `/make-video What is an API 60s --style STYLE` |",
       "| List styles in the terminal | `python3 video.py styles` |", "",
       "Add `--mode fast` for a quick draft, `--lang hi` (Hindi) or `--lang hl` (Hinglish) for other languages.", "",
       "## Gallery", ""]
for g in groups:
    out += [f"**{g}**", "", "| " + " | ".join(f"[`{k}`](#{anchor(k)})" for k, _ in by[g]) + " |", "|" + "---|" * len(by[g]),
            "| " + " | ".join(f"[<img src=\"../samples/styles/{k}.jpg\" width=\"150\" alt=\"{s['label']}\">](../{s['sample']})" for k, s in by[g]) + " |", ""]
out += ["## Every style, with its commands", ""]
for g in groups:
    out += [f"### {g}", ""]
    for k, s in by[g]:
        ex = s["example_storyboard"]
        out += [f"#### {k}", "",
                f"<a href=\"../{s['sample']}\"><img src=\"../samples/styles/{k}.jpg\" width=\"180\" align=\"right\" alt=\"{s['label']} preview\"></a>", "",
                f"**{s['label']}**: {s['desc']}.", "",
                f"- **Best for:** {s['best_for']}",
                f"- **Engine:** {s['engine']} · **music bed:** {s.get('music', 'calm')} · **source:** `{s['source']}`",
                f"- **Storyboard fields it reads:** {s['uses']}",
                f"- **Assets:** {s['assets']}",
                f"- **Preview video:** [`{s['sample']}`](../{s['sample']}) · **example storyboard:** [`{ex}`](../{ex})",
                *([f"- **QC not applied:** " + "; ".join(f"`{c}`: {v}" for c, v in s["qc_not_applied"].items())] if s.get("qc_not_applied") else []),
                "", "```bash",
                f"# your own script",
                f"python3 video.py script my-script.txt --title \"My video\" --style {k}",
                f"# the example storyboard (a quick test)",
                f"python3 video.py make {ex} --style {k} --mode fast --allow-lint-fail --name try-{k}",
                "```", "",
                "In Claude Code:", "", "```text", f"/video-from-script my-script.txt --style {k}", f"/make-video <your topic> 60s --style {k}", "```", "",
                '<br clear="right">', ""]
out += ["## Layout rules every style follows", "",
        "- Frame 1080×1920. Keep words inside the safe area: nothing important in the top 100 px or the bottom 24% (the Reels/Shorts interface covers it).",
        "- Captions never overlap scene content. Remotion styles place them per style (`captions.y`); explainroo styles put words and charts in y 270–1248, the caption band at about 1240–1320, and the big picture below it (`low()` / `mid()` in `styles/explainroo/_lib.js`).",
        "- Equal left and right margins. Text is sized to fit its box; it must not clip or overflow.",
        "- No film grain, scratches, vignette or blur: a period feel comes from colour and type only.", "",
        "## Two render engines", "",
        "| Engine | Styles live in | Used when |", "|---|---|---|",
        "| **remotion** | `styles/remotion/src/styles/*.tsx` (React) | The look is a visual effect or a designed layout: glow, glass, pixel work, cards, the EDTech canvas |",
        "| **explainroo** | `styles/explainroo/<name>/style.js` | The look is drawn or data-driven: hand-drawn boards, charts, counters, maps, timelines |", "",
        "Every video passes through both: explainroo builds the audio master (voice, music, sound effects) and word timings; Remotion composites the final picture and captions.", "",
        "## Add a style", "",
        "1. **Remotion:** create `styles/remotion/src/styles/MyStyle.tsx` exporting a `StyleDef` (`Scene`, optional `Background`, `Overlay`, `captions`) and register it in `styles/remotion/src/styles/index.ts`. `EdTech.tsx` is a complete example.",
        "   **explainroo:** copy a folder in `styles/explainroo/`, export `scene(s, sc, ctx)` from `style.js`, set theme and transition in `config.json`. Helpers are in `styles/explainroo/_lib.js`.",
        "2. Add an entry to `styles/styles.json` with every field listed in its `_about` line (`sample`: `samples/styles/my-style.mp4`).",
        "3. Render its preview (uses ElevenLabs credits once; later styles reuse the cached narration): `python3 video.py samples my-style`.",
        "4. Regenerate this page: `python3 video.py styles-doc`.", "",
        "## Change a style", "",
        "- Colours, fonts and sizes are constants at the top of each style file. Remotion fonts load in `styles/remotion/src/lib/fonts.tsx`; the EDTech fonts are in `styles/remotion/public/fonts/`.",
        "- Preview while editing: `cd styles/remotion && npx remotion studio` opens Remotion Studio with live reload.",
        "- Caption look per style is the `captions` object of its `StyleDef` (font, size, colour, y position).", ""]
(ROOT / "docs" / "styles.md").write_text("\n".join(out), encoding="utf-8")
print(f"docs/styles.md: {len(S)} styles")
