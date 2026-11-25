# Diagram 1: overall system architecture

```mermaid
flowchart LR
    U([User]) -->|slash commands, plain requests| CC[Claude Code<br/>CLAUDE.md · .claude/commands/]
    U -->|terminal| CLI
    CC -->|runs| CLI[video.py<br/>doctor · styles · voices · script · make · list]
    CC -->|"/make-video: web research, writes storyboard"| SB[storyboard.json]
    CLI -->|script → storyboard| SB

    subgraph CFG[Configuration]
        ENV[.env<br/>ELEVENLABS_API_KEY]
        VREG[config/voices.json<br/>voice registry]
        SREG[styles/styles.json<br/>style registry]
        TUNE[pipeline/voice_config.json<br/>Whisper limits]
    end

    SB --> ORCH
    CLI --> ORCH
    subgraph ENGINE[Video generation engine · pipeline/]
        ORCH[make_video.py<br/>orchestrator] --> GATE[Script checks<br/>humanize.py · viral.py]
        ORCH --> VOICE[Voice<br/>voice_worker.py]
        ORCH --> FOOT[Footage<br/>footage.py]
        ORCH --> AUD[Audio master + timings<br/>explainroo]
        ORCH --> REND[Render<br/>Remotion]
        ORCH --> FIN[Finish + QC<br/>ffmpeg · qc.py]
        PLAT[plat.py · asr.py · ocr.py<br/>cross-platform layer]
    end
    CFG --> ORCH
    VOICE -->|"text + voice ID, no settings"| EL[(ElevenLabs API)]
    VOICE --> WH[Whisper, local<br/>mlx or faster-whisper]
    FOOT -->|search| OV[(Openverse<br/>Wikimedia Commons)]
    STY[Video styles<br/>styles/remotion · styles/explainroo] --> REND
    STY --> AUD
    FIN --> OUT[[output/&lt;name&gt;/final/*.mp4<br/>+ report, cover, caption, sheet]]
```

Everything inside the engine box runs on your computer. The outside services are ElevenLabs (narration), the footage
search for footage-based styles, and Claude (through Claude Code) for `/make-video` research and writing.
