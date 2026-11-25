# Storyboard schema (`output/<slug>/storyboard.json`)

One file drives voice, visuals and the languages. Every user-visible text is `{ "en": "...", "hi": "...", "hl": "..." }` (fill the
language you are making). Hindi is natural spoken Hindi in Devanagari (not a word-for-word translation). Hinglish (`hl`) is code-mixed
Hindi-English in Roman script as Indian creators caption Reels; its narration also needs `hl_voice` (below). Numbers may stay as digits on screen.
The audience is Indian by default: ₹ and lakh/crore, DD/MM dates, metric units, Indian context, correct Sanskrit/Hindi names (the gate enforces it).
`examples/storyboards/sample.json` is a complete example (one per engine family in `examples/storyboards/`).

```jsonc
{
  "title": "Short title",
  "slug": "kebab-case-slug",            // folder + file names
  "topic": "the topic as given",
  "hook_pattern": "surprising-number",   // which hook pattern was used (reported at the end)
  "region": "india",                     // default; "global" switches off the India rules for a topic about elsewhere
  "hook_candidates": { "en": [ { "hook": "Why can't ChatGPT just open your Gmail?", "format": "question", "fit": 8 }, ... ] },
                                         // REQUIRED: 4-5 distinct openings per language; the video opens with the top-ranked (score >= 79)
  // narrator voice comes from config/voices.json (the final ElevenLabs voice); optional top-level "hosts": ["<voice key or ElevenLabs voice ID>", ...] overrides it
  "scenes": [                            // 4 scenes: hook, problem, payoff, cta (more allowed)
    {
      "id": "hook",                      // a-z, 0-9, dashes; unique
      "role": "hook",                    // hook | problem | payoff | cta
      "narration": { "en": "Spoken sentence(s).", "hi": "बोले जाने वाले वाक्य।",
                     "hl": "Socho, yeh war sirf 18 din chala.",          // Hinglish, Roman: what the captions show
                     "hl_voice": "सोचो, ये वॉर सिर्फ़ 18 दिन चला।" },       // the SAME tokens in Devanagari: what the voice reads
      "say": { "Dhritarashtra": "Dhrit-a-raash-tra" },  // optional pronunciation hints: the voice reads the hint, captions keep the spelling
      "headline":  { "en": "On-screen *keywords*", "hi": "स्क्रीन पर *मुख्य* शब्द" },  // 2-6 words, *stars* = accent
      "emoji": "☕",                      // one emoji (used by remotion styles)
      "icon": "coffee",                  // a Lucide icon name (lucide.dev; check: node explainroo/bin/explainroo.js icons <word>)

      // Optional data. Give each scene what the chosen style shows (see styles/INDEX.md "uses").
      "stat":    { "value": 10, "prefix": "", "suffix": { "en": " min", "hi": " मिनट" }, "label": { "en": "...", "hi": "..." }, "decimals": 0 },
      "items":   [ { "en": "Point one", "hi": "पहला" } ],                     // 2-3 short points
      "chart":   { "type": "bar", "unit": { "en": "%", "hi": "%" }, "items": [ { "label": { "en": "A", "hi": "ए" }, "value": 30 } ] },  // or "pie"
      "steps":   [ { "date": "2019", "label": { "en": "Launch", "hi": "लॉन्च" } } ],  // timeline
      "compare": { "left":  { "title": {...}, "emoji": "😴", "points": [ {...} ] },
                   "right": { "title": {...}, "emoji": "⚡", "points": [ {...} ] } },
      "places":  [ { "name": { "en": "India", "hi": "भारत" }, "lat": 20.6, "lon": 78.9 } ]
    }
  ]
}
```

Rules:
- Never invent numbers. A `stat`/`chart` value must come from the research notes, with its source listed in `research.md`.
- Length budget (delivered pace incl. pauses): English ≈ **2.9 words/s**, Hindi ≈ **2.4 words/s**. Very short scripts run longer per word (fixed lead/tail per scene).
- Narration: short sentences of 6–14 words, spoken to one person. No `*` in narration. Write numbers the way they should be spoken ("ten minutes", "दस मिनट").

## character-story (2D cutout puppets)

Top level: the cast. A `description` drives the character generator: skin ("blue", "dusky", "fair"), headwear ("crown", "peacock feather", "turban", "helmet", "long hair", "veil"), prop ("bow", "flute", "mace", "sword", "dice", "chakra", "scroll", "lotus", "staff"), build ("strong", "slim", "tall"), age ("old", "white beard"), "woman/queen", "blind", "blindfold", "armor", "villain/scheming". `voice` is optional, per language, used when that character speaks. English: a description of the voice (`"design:An old man with a sly, raspy voice"`, designed once with Qwen3 VoiceDesign and cached in `pipeline/voices/`; old Kokoro names like `bm_george` are mapped to a matching description). Hindi: `hi_male`/`hi_female` (Voxtral) or a Maya2 speaker name (`Vasant`, `Vaidehi`, `Abhay`, … for distinct character voices). `"backend:voice"` forces a backend, e.g. `"kokoro:am_adam"`.

```jsonc
"characters": [
  { "id": "krishna", "name": { "en": "Krishna", "hi": "कृष्ण" }, "description": "blue skin, peacock feather crown, holds a flute, calm guide, royal",
    "voice": "will" }   // a key from config/voices.json, an ElevenLabs voice ID, or a short description ("gentle young man") that is mapped to a registry voice of that gender
],
```

Per scene: a `stage`. Times (`at`) are fractions of the scene's narration (0..1), so the same staging works in every language.

```jsonc
"stage": {
  "background": "court | throne-room | battlefield | forest | river | village | night",
  "camera": "push-in | pull-out | pan-left | pan-right | static",
  "set": [ { "kind": "dice-board | throne | chariot | campfire | lamp", "x": 0.5, "depth": 1 } ],
  "cast": [ { "id": "arjuna", "x": 0.28, "facing": "right", "depth": 0, "pose": "kneeling",
              "actions": [ { "at": 0.4, "pose": "despair" } ], "walk": { "from": 0.1, "to": 0.3, "at": 0.0, "dur": 0.4 } } ],
  "speaker": "krishna | narrator",
  "focus": "krishna"
}
```

Poses: standing, idle, pointing, gesturing, explaining, blessing, namaste, bowing, walking, holding, weapon-raised, drawing-bow, fighting-stance, sitting, sitting-talk, kneeling, despair, arms-raised, throwing, shocked, laughing, thinking, flute. Use 2–4 characters per scene, at `x` 0.15–0.85. `depth: 1` puts a character in the back row. Write dialogue scenes as the character speaking ("Arjuna, stand up…") with `speaker` set to that character. Narration scenes use `"speaker": "narrator"`.
