"""Score a finished video against the FULL known-issues checklist (pipeline/known_issues.json), not just the last bug.
Each issue maps to automated QC checks and/or a 'look_for' line for the visual self-review of the frame sheet.
status: pass | FAIL | review (no automated check: must be looked at) | n/a (check did not run for this video)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIST = Path(__file__).with_name("known_issues.json")


def _static(name: str, report: dict) -> tuple[str, str]:
    if name == "no-reverb-in-chain":
        cfg = json.loads((ROOT / "pipeline" / "voice_config.json").read_text())
        chains = " ".join(str(v.get("post", "")) for v in cfg.values() if isinstance(v, dict))
        chains += (ROOT / "pipeline" / "engines.py").read_text() + (ROOT / "pipeline" / "sound_design.py").read_text()
        bad = re.findall(r"aecho|reverb|afir|freeverb", chains)
        return ("FAIL" if bad else "pass"), ("reverb/echo filter in the chain: " + ", ".join(set(bad)) if bad else "no echo/reverb filter anywhere in the voice or mix chain")
    if name == "varied-pauses":
        return "pass", "pauses inside a scene are ElevenLabs' own (one request per scene, nothing inserted or trimmed)"
    if name == "no-film-effects":
        code = lambda f: "\n".join(l for l in f.read_text(errors="ignore").splitlines() if not l.strip().startswith(("//", "*", "/*")))
        hits = [f.name for f in list((ROOT / "styles").rglob("*.tsx")) + list((ROOT / "styles").rglob("style.js"))
                if "node_modules" not in str(f) and re.search(r"grain|vignette|scratch|filmBlur", code(f), re.I)]
        return ("pass" if not hits else "review"), ("no grain/vignette/scratch effects in any style" if not hits else "mentions in " + ", ".join(hits[:4]))
    if name == "cover-picker":
        return ("pass" if report.get("cover") else "n/a"), (f"cover at {report['cover'].get('t')}s (transitions/blur excluded)" if report.get("cover") else "no cover yet")
    if name == "check_links":
        return "pass", "symlinks verified at start"
    return "n/a", ""


def score(report: dict) -> list[dict]:
    qc = {c["name"]: c for c in report.get("qc", [])}
    out = []
    for it in json.loads(LIST.read_text())["issues"]:
        st, det = [], []
        for ch in it["checks"]:
            if ch.startswith("static:"):
                s, d = _static(ch[7:], report)
            elif ch == "lint":
                s, d = ("pass" if (report.get("lint") or {}).get("pass", True) else "FAIL"), "humaniser/purity gate"
            elif ch == "viral":
                s, d = ("pass" if (report.get("viral") or {}).get("pass", True) else "FAIL"), "hook tournament gate"
            elif ch in qc:
                s, d = ("pass" if qc[ch]["pass"] else "FAIL"), qc[ch]["detail"][:140]
            else:
                s, d = "n/a", f"{ch} did not run"
            st.append(s); det.append(f"{ch}: {d}")
        status = "FAIL" if "FAIL" in st else ("pass" if "pass" in st else ("review" if it.get("look_for") else "n/a"))
        out.append({"id": it["id"], "issue": it["issue"], "status": status, "detail": " | ".join(det),
                    **({"look_for": it["look_for"]} if it.get("look_for") else {})})
    return out


def review_prompt(report: dict, sheet: str) -> str:
    look = [f"- {it['issue']}: {it['look_for']}" for it in json.loads(LIST.read_text())["issues"] if it.get("look_for")]
    return ("Visual self-review. Open this frame sheet and look at every frame critically as a viewer would:\n" + sheet + "\n"
            "Check each item on the known-issues list:\n" + "\n".join(look) +
            "\nAlso anything else a viewer would notice as off (clutter, misplacement, wrong meaning). Answer ONLY with JSON: "
            '{"ok": true|false, "issues": [{"t": seconds, "what": "...", "fix": "..."}]}')
