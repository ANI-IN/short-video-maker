---
description: Show the available video styles with a preview path and the exact command for each; recommend one for a topic.
argument-hint: [topic or group, optional]
---

# /styles

Run `python3 video.py styles` (Windows: `py video.py styles`) and read `docs/styles.md`.
- No argument: show the styles grouped, each with one line on what it suits, its preview `samples/styles/<style>.mp4`
  and its command.
- A group name: only that group.
- A topic: recommend 2–3 styles with the reason (`.venv/bin/python pipeline/recommend.py "<topic>"` gives the rule-based
  pick), then the exact `video.py script ... --style <name>` and `/make-video <topic> --style <name>` commands.
