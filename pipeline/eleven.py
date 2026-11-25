"""Small ElevenLabs API helper shared by the command-line tools. The API key is read from .env (or the environment) and
is never printed, logged or written anywhere else."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"
API = "https://api.elevenlabs.io"


def key() -> str | None:
    if ENV.exists():
        for ln in ENV.read_text(encoding="utf-8").splitlines():
            if ln.startswith("ELEVENLABS_API_KEY="):
                v = ln.split("=", 1)[1].strip().strip('"').strip("'")
                if v:
                    return v
    return os.environ.get("ELEVENLABS_API_KEY") or None


def call(path: str, body: dict | None = None, api_key: str | None = None, timeout: int = 60) -> tuple[int, bytes]:
    """GET (no body) or POST JSON; returns (status, bytes). Errors come back as a readable message, never the key."""
    req = urllib.request.Request(API + path, method="POST" if body is not None else "GET",
                                 headers={"xi-api-key": api_key or key() or "", "Content-Type": "application/json"},
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as f:
            return 200, f.read()
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            d = json.loads(raw).get("detail")
            msg = d.get("message") if isinstance(d, dict) else str(d)
        except Exception:
            msg = raw[:200]
        return e.code, (msg or f"HTTP {e.code}").encode()
    except Exception as e:
        return 0, f"Could not reach ElevenLabs: {e}".encode()


def account() -> dict:
    if not key():
        return {"key_set": False}
    code, raw = call("/v1/user/subscription")
    if code != 200:
        code2, raw2 = call("/v1/voices")      # a key without "User (read)" still works for speech
        return {"key_set": True, "valid": code2 == 200, "error": raw.decode()[:200] if code2 != 200 else None,
                "note": None if code2 != 200 else "key works; give it 'User (read)' access to see your credit balance"}
    d = json.loads(raw)
    return {"key_set": True, "valid": True, "plan": d.get("tier"), "used": d.get("character_count"), "limit": d.get("character_limit"),
            "resets": d.get("next_character_count_reset_unix")}
