// Notebook / sticky-note doodle: ruled notebook paper, a red margin, sticky notes and pen doodles.
import { L, tv, U, items, low , t0 , statStr , bands, scatter , mid } from './_lib.js';
// video.json settings for this style live in config.json
const NOTES = ['#ffe66d', '#ffb3c7', '#b8f2c9', '#a9d8ff'];
export function scene(s, sc, ctx) {
  { const b = bands(s); scatter(s, [sc.icon || 'pencil', 'star', 'heart', 'smile', 'cloud'], b.top, { colors: ['blue', 'red'], seed: ctx.i + 3 });
    scatter(s, ['star', 'heart', 'music', 'sun'], { y0: b.bottom.y0 - s.H * 0.12, h: s.H * 0.08, y: b.bottom.y0 - s.H * 0.08 }, { colors: ['blue', 'red'], seed: ctx.i + 21, n: 4, size: 0.9 });
    scatter(s, ['paperclip', sc.icon || 'pencil', 'sparkles', 'flower', 'arrow-up-right'], b.bottom, { colors: ['blue', 'red', 'green'], seed: ctx.i + 8, n: 6 });
    s.draw({ at: -1 }, (c) => { c.strokeStyle = 'rgba(31,95,191,0.6)'; c.lineWidth = 4; for (const [cx, cy] of [[s.W * 0.86, s.full.top + 150], [s.W * 0.12, s.H - 200]]) { c.beginPath(); for (let a = 0; a < 18; a += 0.2) c.lineTo(cx + Math.cos(a) * a * 3.2, cy + Math.sin(a) * a * 3.2); c.stroke(); } }); }
  const { top, h, w, left } = s.safe; const u = U(s);
  s.draw({ at: -1 }, (c) => {
    c.strokeStyle = 'rgba(70,130,200,0.28)'; c.lineWidth = 2;
    for (let y = 150; y < s.H; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(s.W, y); c.stroke(); }
    c.strokeStyle = 'rgba(220,60,60,0.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(120, 0); c.lineTo(120, s.H); c.stroke();
    c.fillStyle = '#e8e2cc'; for (let y = 260; y < s.H; y += 360) { c.beginPath(); c.arc(56, y, 18, 0, 7); c.fill(); }
  });
  s.text(L(s, sc.headline), { y: top + h * 0.1, size: u * 13, font: 'hand', bold: true, maxWidth: w * 0.85, mark: 'red', at: t0(ctx) });
  // big sticky note with the doodled icon
  const z = mid(s); const ns = Math.min(z.h * 0.66, u * 82);
  s.box({ x: s.cx, y: z.y, w: ns, h: ns, fill: NOTES[ctx.i % 4], border: false, radius: 6, rotate: -3, at: tv(s, 0.05), enter: 'drop' });
  s.icon(sc.icon || 'pencil', { y: z.y, size: ns * 0.6, color: 'ink', at: tv(s, 0.12), rotate: -3, overlap: true });
  const its = items(s, sc);
  const notes = its.length ? its.slice(0, 3) : (sc.stat ? [`${statStr(s, sc.stat)} ${L(s, sc.stat.label)}`] : []);
  notes.forEach((t, k) => {
    const n = notes.length; const x = left + w * (n === 1 ? 0.5 : 0.18 + 0.64 * (k / (n - 1)));
    s.box(t, { x, y: top + h * 0.4, w: u * 31, h: u * 31, fill: NOTES[(ctx.i + k + 1) % 4], border: false, font: 'hand', size: u * 6.5,
      textColor: 'ink', rotate: [4, -5, 3][k], at: tv(s, 0.35 + 0.18 * k), enter: 'drop', maxWidth: u * 27 });
  });
}
