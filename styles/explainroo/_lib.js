// Shared helpers for explainroo-engine styles. Copied next to scenes.js in each project.

// Pick the current language from a { en, hi } field (or pass strings through).
export function L(s, v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return v[s.lang] ?? v.en ?? Object.values(v)[0] ?? '';
}
export const plain = (t) => String(t).replace(/\*/g, '');

// A time at fraction f (0..1) of the scene's narration: language-independent cues.
export function tv(s, f) {
  const v = s.voice && s.voice.end > s.voice.start ? s.voice : { start: 0, end: Math.max(0.5, s.dur - 0.4) };
  return v.start + f * (v.end - v.start);
}
// Start time of the i-th spoken word (clamped), falling back to a fraction.
export function wordT(s, i) {
  if (s.words && s.words.length) return s.words[Math.min(i, s.words.length - 1)].start;
  return tv(s, i / 10);
}
// First scene shows its title on frame 0 (thumbnail); later scenes animate it in.
export const t0 = (ctx) => (ctx.i === 0 ? -1 : 0);
export const U = (s) => Math.min(s.safe.w, s.safe.h) / 100;

// Evenly spread n cue times across [a, b] of the narration.
export function spread(s, n, a = 0.15, b = 0.85) {
  return Array.from({ length: n }, (_, i) => tv(s, n === 1 ? a : a + (b - a) * (i / (n - 1))));
}

export function items(s, sc) {
  if (sc.items && sc.items.length) return sc.items.map((x) => L(s, x));
  if (sc.steps && sc.steps.length) return sc.steps.map((x) => L(s, x.label));
  return [];
}

// The picture zone below the caption band (pictures may go there; words stay in s.safe).
export function low(s) {
  // starts under the caption band (captions sit at y ~1240-1320 on a 1920 frame), so a picture never sits behind the words
  const t = s.safe.bottom + 92;
  const b = s.full.bottom - Math.min(340, (s.full.bottom - s.safe.bottom) * 0.38);
  return { top: t, bottom: b, y: (t + b) / 2, h: Math.max(0, b - t) };
}

// "10 min" in the current language; prefix/suffix may be plain strings or { en, hi }.
export const statStr = (s, st) => (st ? `${L(s, st.prefix)}${st.value}${L(s, st.suffix)}` : '');

// The picture zone for sparse styles: same band as low() (under the captions, above the app UI).
export function mid(s) {
  const t = s.safe.bottom + 92;                    // below the caption band, like low(): never behind the words
  const b = s.full.bottom - Math.min(340, (s.full.bottom - s.safe.bottom) * 0.38);
  return { top: t, bottom: b, y: (t + b) / 2, h: Math.max(0, b - t) };
}
// Edge-to-edge composition: the bands above s.safe (status bar area) and below the picture zone (app UI area).
// Only pictures go there (icons/drawings, overlap: true, no camera, no sound) — words stay in s.safe.
export function bands(s) {
  const lz = low(s);
  return { top: { y0: s.full.top, y1: s.safe.top, y: (s.full.top + s.safe.top) / 2, h: s.safe.top - s.full.top },
           bottom: { y0: lz.bottom, y1: s.full.bottom, y: (lz.bottom + s.full.bottom) / 2, h: s.full.bottom - lz.bottom } };
}
export function scatter(s, names, band, { colors = ['ink'], size = 0.6, n = 5, seed = 1, at = 0.1, weight = 2, opacity = 0.85 } = {}) {
  for (let i = 0; i < n; i++) {
    const x = s.full.left + s.full.w * ((i + 0.5) / n) + (s.rand(seed + i) - 0.5) * s.full.w / n * 0.5;
    const y = band.y0 + band.h * (0.3 + s.rand(seed * 3 + i) * 0.45);
    s.icon(names[i % names.length], { x, y, size: Math.min(band.h * size, 120), color: colors[i % colors.length], weight, rotate: (s.rand(seed * 7 + i) - 0.5) * 30,
      opacity, at: typeof at === 'number' ? at : at, overlap: true, camera: false, sfx: false, float: 4 });
  }
}
