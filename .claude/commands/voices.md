---
description: List, test, add or change the ElevenLabs voices used for narration.
argument-hint: [list | use <key> | add <voice id> | test "<line>" | account]
---

# /voices

Input: `$ARGUMENTS` (empty = list). Run from the project root; Windows: `py` instead of `python3`.

- List: `python3 video.py voices list` (the `*` marks the default narrator). Summarise the options for the user's need
  (language, gender, tone) using each voice's description.
- Change the default: `python3 video.py voices use <key>`; for one language only: `--lang hi`.
- Add a voice from the user's own ElevenLabs account: `python3 video.py voices add <20-character voice id> --name "<name>"`.
  Voice Library voices must first be added to "My Voices" on elevenlabs.io.
- Hear a voice: `python3 video.py voices test "<line>" --voice <key>` (about 1 credit per character); give the user the
  saved mp3 path to play.
- Credits and key status: `python3 video.py voices account`.

Voices are used exactly as ElevenLabs provides them: never add speed or other voice settings. Never ask for the API key
in chat (see `/setup`).
