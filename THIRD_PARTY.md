# Third-party software and services

This repository does not include third-party code or voice assets. The setup (`install.py`) fetches them, or they are used as services.

| What | Licence / terms | How it is used |
|---|---|---|
| [explainroo](https://github.com/vincentsch/explainroo) 0.6.2 | MIT, © Vincent Schmalbach | Cloned by the setup at a pinned commit. Draws the explainroo-engine styles and builds the audio master (voice, music, SFX). |
| [Remotion](https://www.remotion.dev) 4.0.542 | Remotion licence: free for individuals and small teams, paid for larger companies. Check their terms before commercial use. | Renders the React styles and composites every video. |
| [ElevenLabs](https://elevenlabs.io) API | ElevenLabs terms of service. Needs your own account and API key. | All narration. Only voice IDs are stored in `config/voices.json`. |
| Whisper large-v3-turbo via [mlx-whisper](https://github.com/ml-explore/mlx-examples) (Apple Silicon) or [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (other systems) | MIT | Runs locally to time captions and check pronunciation. The model is downloaded on first use. |
| [ocrmac](https://github.com/straussmaximilian/ocrmac) (macOS) / [RapidOCR](https://github.com/RapidAI/RapidOCR) (Windows, Linux) | MIT / Apache 2.0 | Reads on-screen text for the layout checks. |
| CLIP (via `transformers`) | MIT / model card terms | Runs locally to rank footage against each line. Downloaded on first use. |
| [Openverse](https://openverse.org), [Wikimedia Commons](https://commons.wikimedia.org) | Each item's own Creative Commons licence | Footage search for the real-footage and documentary styles. Credits are written next to each video. |
| [Inter](https://rsms.me/inter/), [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | SIL Open Font Licence 1.1 (copies in `styles/remotion/public/fonts`) | Fonts of the EDTech style and the explainer reels. |
| [lucide](https://lucide.dev) icons | ISC | Icons in the Remotion styles. |
| [Claude Code](https://claude.com/claude-code) | Anthropic terms. Needs your own Claude subscription or API account. | The main interface: the project's slash commands, topic research and script writing (`/make-video`). |
| ffmpeg | LGPL/GPL (installed by you) | Encoding, loudness, muxing. |
