# Diagram 3: voice generation workflow

```mermaid
flowchart TD
    K[.env<br/>ELEVENLABS_API_KEY] --> W
    R[config/voices.json<br/>final · languages · voices] --> S{Which voice?}
    SB[storyboard.json<br/>hosts · narrator · character voice] --> S
    S -->|storyboard names one| V[Voice ID]
    S -->|language pinned| V
    S -->|otherwise| F[final voice] --> V
    V --> W[voice_worker.py<br/>one request per scene<br/>neighbouring scenes as context]
    W -->|"POST /v1/text-to-speech/VOICE_ID (model, seed, no voice settings)"| EL[(ElevenLabs API)]
    EL -->|24 kHz PCM| C[Cache<br/>output/.cache/elevenlabs]
    C --> T[Cut silence before the first<br/>and after the last word only]
    T --> Q[Whisper check: does it say the script?]
    Q -->|misheard: new seed| W
    Q --> O[[output/&lt;slug&gt;/voice/&lt;lang&gt;/&lt;scene&gt;.wav<br/>+ voice_qc.json]]

    subgraph CLI[video.py voices · /voices in Claude Code]
        A1[voices key] --> K
        A2[voices use / voices add] --> R
        A3[voices test] -->|same API| EL
    end
```

The key is read from `.env` at the moment of the request and is never written to logs, reports or the browser.
The audio is used exactly as delivered: no speed, pause, pitch or EQ change.
A take is cached by voice, model, text, context and seed, so re-running a video does not spend credits again.
