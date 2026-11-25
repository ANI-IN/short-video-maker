// Split-screen comparison: a full-height LEFT/RIGHT split (both colours run edge to edge, top to bottom). Words stay in
// s.safe; each column also owns its share of the picture zone and the bands, so no half of the frame is empty.
import { L, tv, U, t0, low, bands } from './_lib.js';

export function scene(s, sc, ctx) {
  const { top, h, w, left } = s.safe; const u = U(s);
  s.camera([]);
  const cmp = sc.compare || { left: { title: { en: 'Before', hi: 'पहले' }, emoji: sc.emoji || '😕', points: [] }, right: { title: { en: 'After', hi: 'बाद में' }, emoji: '🤩', points: [] } };
  const midX = s.W / 2, lz = low(s), b = bands(s);
  // backgrounds: two full-height halves + a seam
  s.box({ x: s.W / 4, y: s.H / 2, w: s.W / 2, h: s.H, fill: '#ffe3e3', border: false, radius: 0, at: t0(ctx), enter: 'slide-right', overlap: true, camera: false });
  s.box({ x: (s.W * 3) / 4, y: s.H / 2, w: s.W / 2, h: s.H, fill: '#d3f9d8', border: false, radius: 0, at: tv(s, 0.3), enter: 'slide-left', overlap: true, camera: false });
  s.draw({ at: -1 }, (c) => { c.fillStyle = '#212529'; c.fillRect(midX - 4, 0, 8, s.H);
    for (let y = 40; y < s.H; y += 90) { c.fillStyle = 'rgba(0,0,0,0.06)'; c.beginPath(); c.arc(s.W * 0.25, y, 26, 0, 7); c.arc(s.W * 0.75, y + 45, 26, 0, 7); c.fill(); } });
  s.text(L(s, sc.headline), { y: top + u * 2, valign: 'top', size: u * 9, bold: true, maxWidth: w * 0.95, at: t0(ctx), bg: 'rgba(255,255,255,0.85)', padding: 14, radius: 12 });
  const col = (d, cx, at, color) => {
    s.text(L(s, d.title), { x: cx, y: top + h * 0.26, size: u * 9.5, bold: true, color, maxWidth: s.W * 0.42, at });
    s.text(d.emoji || '•', { x: cx, y: top + h * 0.52, size: u * 24, at, enter: 'pop' });
    (d.points || []).slice(0, 2).forEach((p, k) => s.text(L(s, p), { x: cx, y: top + h * 0.76 + k * u * 8.5, size: u * 6.2, color: 'ink', maxWidth: s.W * 0.4, at: at + 0.25 + k * 0.2 }));
    // picture zone + bottom band: the same subject, big, so the lower frame carries the comparison too
    s.text(d.emoji || '•', { x: cx, y: lz.top + lz.h * 0.24, size: Math.min(lz.h * 0.75, u * 34), opacity: 0.9, at: at + 0.2, enter: 'pop', overlap: true, camera: false });
    s.text(d.emoji || '•', { x: cx - s.W * 0.11, y: b.bottom.y0 + b.bottom.h * 0.3, size: Math.min(b.bottom.h * 0.62, u * 17), opacity: 0.5, at: at + 0.3, overlap: true, camera: false, rotate: -12 });
    s.text(d.emoji || '•', { x: cx + s.W * 0.1, y: b.bottom.y0 + b.bottom.h * 0.68, size: Math.min(b.bottom.h * 0.45, u * 12), opacity: 0.4, at: at + 0.4, overlap: true, camera: false, rotate: 10 });
    s.text(d.emoji || '•', { x: cx + s.W * 0.12, y: b.top.y, size: Math.min(b.top.h * 0.55, u * 14), opacity: 0.45, at: at + 0.3, overlap: true, camera: false, rotate: 12 });
  };
  col(cmp.left, s.W * 0.25, tv(s, 0.05), '#c92a2a');
  col(cmp.right, s.W * 0.75, tv(s, 0.35), '#2b8a3e');
  s.circle({ x: midX, y: top + h * 0.52, r: u * 9, label: 'VS', fill: '#212529', textColor: '#ffffff', border: false, size: u * 7, at: tv(s, 0.3), enter: 'pop', overlap: true });
  s.circle({ x: midX, y: lz.top + lz.h * 0.24, r: u * 6, label: 'VS', fill: '#212529', textColor: '#ffffff', border: false, size: u * 5, at: tv(s, 0.45), enter: 'pop', overlap: true, camera: false });
}
