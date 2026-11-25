"""Whisper speech recognition on every platform, one call shape for the whole project.

  Apple Silicon : mlx-whisper, whisper-large-v3-turbo (fast on the Mac's GPU)
  Windows/Linux : faster-whisper, large-v3-turbo (CPU int8, or CUDA float16 when an NVIDIA GPU is present)

transcribe() returns the mlx-whisper shape: {"text", "segments": [{"start", "end", "text", "words": [{"word", "start",
"end", "probability"}]}]}. Override with ASR_BACKEND=mlx|faster-whisper and WHISPER_MODEL=<faster-whisper model name>.
"""
from __future__ import annotations

import os

from plat import APPLE_SILICON

MLX_MODEL = "mlx-community/whisper-large-v3-turbo"
BACKEND = os.environ.get("ASR_BACKEND") or ("mlx" if APPLE_SILICON else "faster-whisper")
_fw = None


def _faster():
    global _fw
    if _fw is None:
        from faster_whisper import WhisperModel
        try:
            import ctranslate2
            cuda = ctranslate2.get_cuda_device_count() > 0
        except Exception:
            cuda = False
        _fw = WhisperModel(os.environ.get("WHISPER_MODEL", "large-v3-turbo"), device="cuda" if cuda else "cpu",
                           compute_type="float16" if cuda else "int8")
    return _fw


def transcribe(path: str, language: str | None = None, word_timestamps: bool = False, condition_on_previous_text: bool = False) -> dict:
    language = {"hl": "hi"}.get(language, language)
    if BACKEND == "mlx":
        import mlx_whisper
        return mlx_whisper.transcribe(str(path), path_or_hf_repo=MLX_MODEL, language=language, word_timestamps=word_timestamps,
                                      condition_on_previous_text=condition_on_previous_text)
    import subprocess
    import numpy as np
    from plat import tool
    # decode with ffmpeg (a required tool) rather than faster-whisper's PyAV path, whose API changes between versions
    pcm = subprocess.run([tool("ffmpeg"), "-nostdin", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    segs, _ = _faster().transcribe(np.frombuffer(pcm, np.float32), language=language, word_timestamps=word_timestamps,
                                   condition_on_previous_text=condition_on_previous_text, beam_size=5)
    out = []
    for s in segs:
        out.append({"start": float(s.start), "end": float(s.end), "text": s.text,
                    "words": [{"word": w.word, "start": float(w.start), "end": float(w.end), "probability": float(w.probability)} for w in (s.words or [])]})
    return {"text": "".join(s["text"] for s in out), "segments": out}
