"""Real-footage layer: licensed photos (Openverse) and video clips (Wikimedia Commons), picked per scene by CLIP
relevance to what the line actually says, then prepared for Ken Burns + 2.5D parallax in Remotion.

Storyboard scene fields used:
  "visual": "footage" | "anim" | "auto"
  "footage": { "queries": ["specific search 1", "search 2"], "subject": "English description of what must be visible",
               "prefer": "image" | "video" | "any" }
Output per scene (written to <job>/footage/footage.json and copied next to Remotion public assets):
  { kind, src, fg (parallax foreground PNG, images only), clip, credit{title,creator,license,url}, candidates_scored }
"""
from __future__ import annotations

import hashlib
import re
import io
import json
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

UA = "shortvideo-pipeline/1.0 (local; personal use)"
ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "output" / ".cache" / "footage"
CACHE.mkdir(parents=True, exist_ok=True)
MIN_CLIP = 0.245          # below this, the picture doesn't really show the line -> the scene falls back to animation
OK_LICENSES = {"cc0", "pdm", "by", "by-sa"}   # allow modification + commercial use (we crop/animate)

_clip = None
_depth = None


_LAST: dict[str, float] = {}


def _get(url: str, binary=False, tries=6):
    """Polite fetch: >= 1.2 s between requests to the same Wikimedia/Openverse host, honour Retry-After on 429/503."""
    import urllib.error
    host = urllib.parse.urlparse(url).netloc
    gap = 1.2 if ("wikimedia" in host or "openverse" in host) else 0.3
    for k in range(tries):
        wait = _LAST.get(host, 0) + gap - time.time()
        if wait > 0:
            time.sleep(wait)
        _LAST[host] = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
            return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and k < tries - 1:
                ra = e.headers.get("Retry-After")
                time.sleep(min(30, float(ra) if ra and ra.isdigit() else 3 * 2 ** k)); continue
            raise
        except Exception:
            if k == tries - 1:
                raise
            time.sleep(3 * (k + 1))


def _cached(key: str, fn):
    f = CACHE / (hashlib.sha1(key.encode()).hexdigest() + ".json")
    if f.exists():
        return json.loads(f.read_text())
    v = fn()
    f.write_text(json.dumps(v))
    return v


def search_openverse(q: str, n: int = 14) -> list[dict]:
    """CC0 / public-domain first (no attribution needed at all), then the other commercial+modification licences."""
    def run():
        rows, seen = [], set()
        for params in ({"license": "cc0,pdm"}, {"license_type": "commercial,modification"}):
            url = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({"q": q, "page_size": n, "mature": "false", **params})
            try:
                d = _get(url)
            except Exception:
                continue
            for r in d.get("results", []):
                if r.get("url") not in seen:
                    seen.add(r.get("url")); rows.append(r)
        out = []
        for r in rows:
            if (r.get("license") not in OK_LICENSES) or (r.get("filetype") or "").lower() in ("svg", "gif"):
                continue
            if (r.get("width") or 0) < 900 or (r.get("height") or 0) < 700:
                continue
            out.append({"kind": "image", "url": r["url"], "thumb": r.get("thumbnail") or r["url"], "w": r.get("width"), "h": r.get("height"),
                        "credit": {"title": r.get("title"), "creator": r.get("creator"), "license": f"CC {r['license'].upper()} {r.get('license_version') or ''}".strip(),
                                   "url": r.get("foreign_landing_url"), "source": r.get("source")}})
        return out
    return _cached("ov2:" + q, run)


def search_commons_video(q: str, n: int = 8) -> list[dict]:
    def run():
        url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "format": "json", "generator": "search", "gsrsearch": f"filetype:video {q}", "gsrnamespace": 6,
            "gsrlimit": n, "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 480,
            "iiextmetadatafilter": "LicenseShortName|Artist|ObjectName"})
        d = _get(url)
        out = []
        for p in (d.get("query", {}).get("pages", {}) or {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            if not ii or (ii.get("width") or 0) < 640 or (ii.get("duration") or 0) < 3:
                continue
            md = ii.get("extmetadata", {})
            lic = (md.get("LicenseShortName", {}) or {}).get("value", "")
            if "NC" in lic or "ND" in lic:
                continue
            import re
            artist = re.sub("<[^>]+>", "", (md.get("Artist", {}) or {}).get("value", "")).strip()
            out.append({"kind": "video", "url": ii["url"], "thumb": ii.get("thumburl"), "w": ii.get("width"), "h": ii.get("height"), "dur": ii.get("duration"),
                        "credit": {"title": p["title"].replace("File:", ""), "creator": artist, "license": lic, "url": ii.get("descriptionurl"), "source": "wikimedia commons"}})
        return out
    return _cached("cv:" + q, run)


def _clip_model():
    global _clip
    if _clip is None:
        from transformers import CLIPModel, CLIPProcessor
        m = "openai/clip-vit-base-patch32"
        _clip = (CLIPModel.from_pretrained(m).eval(), CLIPProcessor.from_pretrained(m))
    return _clip


def clip_scores(text: str, images: list[Image.Image]) -> list[float]:
    import torch
    model, proc = _clip_model()
    with torch.no_grad():
        inp = proc(text=[text], images=images, return_tensors="pt", padding=True, truncation=True)
        out = model(**inp)
        im = out.image_embeds / out.image_embeds.norm(dim=-1, keepdim=True)
        tx = out.text_embeds / out.text_embeds.norm(dim=-1, keepdim=True)
        return (im @ tx.T).squeeze(-1).tolist()


CULTURE = re.compile(r"\b(indian|india|mughal|hindu|mahabharat\w*|ramayan\w*|rajput|sanskrit|kurukshetra|egyptian|roman|greek|"
                     r"chinese|japanese|persian|ottoman|aztec|mayan|viking|medieval european|soviet|russian|african)\b", re.I)
DECOYS = ["a 19th-century satirical cartoon drawing", "an American political cartoon with English captions", "a European oil painting",
          "a newspaper illustration with printed English text", "a Western book engraving"]
OLD = re.compile(r"\b(old|ancient|painting|miniature|engraving|manuscript|mural|fresco|relief|illustration|folio)\b", re.I)


def context_ok(subject: str, image: Image.Image) -> tuple[bool, str]:
    """Zero-shot context gate: when the subject names a culture/place, the picture must look like it belongs to that context
    more than to a look-alike from the wrong one. CLIP similarity alone scored a 19th-century US political cartoon of an
    elephant 0.273 for 'an old Indian painting of war elephants' (it matched 'elephant + old drawing'); this test gives
    that cartoon 0.82 'satirical cartoon' vs 0.11 for the subject. Returns (ok, reason)."""
    m = CULTURE.search(subject or "")
    if not m:
        return True, ""
    import torch
    cul = m.group(1).lower()
    pos = [subject, f"{cul} art", f"a photograph from {cul if cul not in ('indian',) else 'India'}"]
    decoys = [d for d in DECOYS if not re.search(r"\b" + d.split()[1] + r"\b", subject, re.I)]
    if OLD.search(subject):
        decoys.append("a modern colour photograph")
    model, proc = _clip_model()
    with torch.no_grad():
        inp = proc(text=pos + decoys, images=[image], return_tensors="pt", padding=True, truncation=True)
        pr = model(**inp).logits_per_image.softmax(-1)[0].tolist()
    p_in, dec = sum(pr[:len(pos)]), pr[len(pos):]
    k = max(range(len(dec)), key=lambda i: dec[i])
    return (p_in >= dec[k]), ("" if p_in >= dec[k] else f"looks more like {decoys[k]!r} ({dec[k]:.2f} vs in-context {p_in:.2f})")


def _thumb(c: dict) -> Image.Image | None:
    try:
        data = _cached_bin(c["thumb"])
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return None


def commons_thumb(url: str, width: int = 1920) -> str:
    """upload.wikimedia.org original -> CDN-cached standard thumbnail (cheap, rarely throttled, plenty for 1080x1920)."""
    import re
    m = re.match(r"(https://upload\.wikimedia\.org/wikipedia/commons)/([0-9a-f])/([0-9a-f]{2})/([^/]+\.(?:jpe?g|png|tiff?))$", url, re.I)
    if not m:
        return url
    name = m.group(4)
    return f"{m.group(1)}/thumb/{m.group(2)}/{m.group(3)}/{name}/{width}px-{name}" + (".jpg" if name.lower().endswith(("tif", "tiff")) else "")


def _cached_bin(url: str, tries: int = 6) -> bytes:
    f = CACHE / (hashlib.sha1(url.encode()).hexdigest() + ".bin")
    if f.exists():
        return f.read_bytes()
    data = _get(url, binary=True, tries=tries)
    f.write_bytes(data)
    return data


def _fetch_image(c: dict) -> bytes:
    """Full-quality still for a candidate: Commons 1920px thumbnail first, then the original, with short retries."""
    for u in dict.fromkeys([commons_thumb(c["url"]), c["url"]]):
        try:
            return _cached_bin(u, tries=3)
        except Exception:
            continue
    raise RuntimeError("image download failed")


def depth_foreground(img: Image.Image, out_png: Path) -> None:
    """2.5D parallax: alpha-matte the nearest ~35% of the scene (Depth-Anything-V2-Small) as a foreground layer."""
    global _depth
    from transformers import pipeline
    if _depth is None:
        _depth = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
    small = img.copy(); small.thumbnail((640, 640))
    d = np.array(_depth(small)["depth"].resize(img.size, Image.BILINEAR), dtype=np.float32)
    d = (d - d.min()) / max(1e-6, d.max() - d.min())          # 1 = near
    thr = np.quantile(d, 0.65)
    alpha = np.clip((d - thr) / 0.08, 0, 1)
    a = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
    fg = img.convert("RGBA"); fg.putalpha(a)
    fg.save(out_png)


def prepare_still(img: Image.Image, sid: str, out_dir: Path) -> dict:
    """Still -> display-sized JPG (enough pixels to fill 1080x1920 with a Ken Burns pan, never bigger), its depth-matted
    foreground PNG at the same size, and a pre-blurred backdrop (so the render never blurs a huge image every frame)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    aspect = img.width / img.height
    target_h = 2100 if aspect > 0.8 else 2300          # wide: cover-height + pan room; tall: cover + zoom room
    if img.height > target_h:
        img = img.resize((round(target_h * aspect), target_h), Image.LANCZOS)
    src = out_dir / f"{sid}.jpg"; img.save(src, quality=93)
    fg = out_dir / f"{sid}-fg.png"; depth_foreground(img, fg)
    small = img.copy(); small.thumbnail((360, 360))
    blur = small.filter(ImageFilter.GaussianBlur(14)).resize((540, 960), Image.BILINEAR)
    from PIL import ImageEnhance
    blur = ImageEnhance.Brightness(blur).enhance(0.5)
    b = out_dir / f"{sid}-blur.jpg"; blur.save(b, quality=88)
    return {"src": src.name, "fg": fg.name, "blur": b.name, "w": img.width, "h": img.height}


def prepare_video(url: str, out_mp4: Path, max_s: float = 12.0, tries: int = 6) -> None:
    raw = out_mp4.with_suffix(".src")
    if not raw.exists():
        raw.write_bytes(_cached_bin(url, tries))
    # constant 30 fps, H.264, no audio, max 1920 tall, trimmed — Remotion plays it smoothly
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-t", str(max_s), "-an", "-vf",
                    "scale='if(gt(iw,ih),-2,1080)':'if(gt(iw,ih),1080,-2)',fps=30", "-c:v", "libx264", "-crf", "16", "-preset", "medium",
                    "-pix_fmt", "yuv420p", str(out_mp4)], check=True)


def pick_for_scene(scene: dict, out_dir: Path, log=print) -> dict | None:
    fo = scene.get("footage") or {}
    queries = fo.get("queries") or []
    subject = fo.get("subject") or (queries[0] if queries else "")
    if not queries or not subject:
        return None
    prefer = fo.get("prefer", "any")
    cands = []
    for q in queries[:8]:            # every variant the mode allows (fast 2 / max as written / cinematic up to 7, x India variants)
        if prefer in ("image", "any"):
            cands += search_openverse(q)
        if prefer in ("video", "any"):
            cands += search_commons_video(q)
    seen, uniq = set(), []
    for c in cands:
        if c["url"] not in seen:
            seen.add(c["url"]); uniq.append(c)
    thumbs = [(c, _thumb(c)) for c in uniq[:28]]
    thumbs = [(c, t) for c, t in thumbs if t is not None]
    if not thumbs:
        log(f"  [{scene['id']}] no licensed candidates for {queries}")
        return None
    scores = clip_scores(subject, [t for _, t in thumbs])
    # CLIP judges the look, not names: boost candidates whose title names the scene's key terms
    # (e.g. "Bhishma"), and slightly penalise low-resolution files that would look soft at 1080x1920.
    keys = {w.lower() for w in (fo.get("keywords") or [w for q in queries for w in q.split() if w[:1].isupper()]) if len(w) > 2}
    def adj(s, c):
        t = (c["credit"].get("title") or "").lower()
        bonus = 0.05 if any(k in t for k in keys) else 0.0
        lic = (c["credit"].get("license") or "").lower()
        if "cc0" in lic or "pdm" in lic or "public domain" in lic or lic.startswith("pd"):
            bonus += 0.02                  # CC0 / public domain preferred when relevance is close
        # full-bleed 1080x1920: a still needs ~1400+ px on its short side to stay crisp; video >= 720p
        short = min(c.get("w") or 0, c.get("h") or 0)
        small = 0.0 if short >= 1400 else 0.02 if short >= 1000 else 0.06
        return s + bonus - small
    scores = [adj(s, c) for s, (c, _) in zip(scores, thumbs)]
    ranked = sorted(zip(scores, [c for c, _ in thumbs], [t for _, t in thumbs]), key=lambda x: -x[0])
    # context gate on the front-runners (cheap: only candidates that could actually win)
    gated, dropped = [], []
    for s_, c, t in ranked:
        if s_ >= MIN_CLIP and len(gated) < 3:
            ok, why = context_ok(subject, t)
            if not ok:
                dropped.append(f"{(c['credit'].get('title') or '')[:50]}: {why}"); continue
        gated.append((s_, c))
    for d in dropped:
        log(f"  [{scene['id']}] context gate dropped {d}")
    ranked = gated or [(0.0, ranked[0][1])]
    best_s, best = ranked[0]
    # prefer a moving clip when it is nearly as relevant as the best still
    vids = [(s, c) for s, c in ranked if c["kind"] == "video"]
    if vids and vids[0][0] >= best_s - 0.015 and vids[0][0] >= MIN_CLIP:
        best_s, best = vids[0]
    res = {"scene": scene["id"], "subject": subject, "clip": round(best_s, 3), "kind": best["kind"], "credit": best["credit"], "context_dropped": dropped,
           "candidates_scored": [{"clip": round(s, 3), "kind": c["kind"], "title": (c["credit"].get("title") or "")[:70]} for s, c in ranked[:6]]}
    if best_s < MIN_CLIP:
        res["rejected"] = f"best relevance {best_s:.3f} < {MIN_CLIP}"
        log(f"  [{scene['id']}] footage rejected ({res['rejected']}); scene stays animated")
        return res
    out_dir.mkdir(parents=True, exist_ok=True)
    if best["kind"] == "image":
        try:
            img = Image.open(io.BytesIO(_fetch_image(best))).convert("RGB")
        except Exception:      # original too big / blocked: use the next-best candidate's file
            nxt = next((c for s2, c in ranked[1:] if c["kind"] == "image" and s2 >= MIN_CLIP), None)
            if not nxt:
                res["rejected"] = "download failed"; return res
            best = nxt; res["credit"] = best["credit"]
            img = Image.open(io.BytesIO(_fetch_image(best))).convert("RGB")
        res.update(**prepare_still(img, scene["id"], out_dir))
    else:
        src = out_dir / f"{scene['id']}.mp4"
        try:
            prepare_video(best["url"], src, tries=2)
            res.update(src=src.name)
        except Exception as e:   # Wikimedia throttles large media downloads: use the best still instead
            log(f"  [{scene['id']}] clip download failed ({str(e)[:60]}); using the best photo")
            imgs = [(s2, c) for s2, c in ranked if c["kind"] == "image" and s2 >= MIN_CLIP]
            if not imgs:
                res["rejected"] = "clip download failed and no relevant photo"; return res
            best_s, best = imgs[0]
            res.update(kind="image", clip=round(best_s, 3), credit=best["credit"])
            img = Image.open(io.BytesIO(_fetch_image(best))).convert("RGB"); img.thumbnail((2400, 2400))
            srcj = out_dir / f"{scene['id']}.jpg"; img.save(srcj, quality=94)
            fg = out_dir / f"{scene['id']}-fg.png"; depth_foreground(img, fg)
            res.update(src=srcj.name, fg=fg.name, w=img.width, h=img.height)
    log(f"  [{scene['id']}] {best['kind']} clip={best_s:.3f} — {best['credit'].get('title')} ({best['credit'].get('license')})")
    return res


INDIA = re.compile(r"\b(india|indian|bharat|hindi|hindu|mahabharat\w*|ramayan\w*|mughal|delhi|mumbai|kolkata|chennai|bengaluru|bangalore|"
                   r"hyderabad|agra|jaipur|varanasi|kerala|punjab|bihar|gujarat|rajasthan|ganga|ganges|himalaya\w*|taj mahal|bollywood|cricket|"
                   r"rupee|lakh|crore|diwali|holi|chai|kurukshetra)\b", re.I)


def india_bias(board: dict, sc: dict) -> dict:
    """India-relevant topic: search an India variant of each query first and say "in India" in the visual subject, so the
    context gate rejects pictures that look foreign (a generic 'street market' shot from elsewhere)."""
    fo = dict(sc.get("footage") or {})
    langs = board.get("lang") in ("hi", "hl")
    topic = " ".join(str(board.get(k, "")) for k in ("topic", "title"))
    if board.get("region", "india") != "india" or not (INDIA.search(topic) or langs):
        return sc
    qs = fo.get("queries") or []
    fo["queries"] = [v for q in qs for v in ([q] if INDIA.search(q) else [f"{q} India", q])]
    subj = fo.get("subject") or ""
    if subj and not CULTURE.search(subj):
        fo["subject"] = subj + " in India"
    return dict(sc, footage=fo)


def fetch_all(board: dict, out_dir: Path, log=print) -> dict:
    picks = {}
    for sc in board["scenes"]:
        if sc.get("visual", "anim") in ("footage", "auto") and sc.get("footage"):
            sc = india_bias(board, sc)
            try:
                r = pick_for_scene(sc, out_dir, log)
            except Exception as e:     # never let one scene's footage kill the run: it stays animated
                log(f"  [{sc['id']}] footage error: {str(e)[:120]}")
                r = {"scene": sc["id"], "rejected": f"footage error: {str(e)[:120]}", "clip": None, "kind": None, "credit": {}}
            if r:
                picks[sc["id"]] = r
    (out_dir / "footage.json").parent.mkdir(parents=True, exist_ok=True)
    (out_dir / "footage.json").write_text(json.dumps(picks, ensure_ascii=False, indent=1))
    credits = [f"{p['scene']}: \"{p['credit'].get('title')}\" by {p['credit'].get('creator') or 'unknown'} — {p['credit'].get('license')} — {p['credit'].get('url')}"
               for p in picks.values() if not p.get("rejected")]
    (out_dir / "CREDITS.txt").write_text("Footage credits (put these in the post description)\n" + "\n".join(credits) + "\n")
    return picks
