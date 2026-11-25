// Animated bar / pie chart explainer: bars grow or a donut sweeps in on cue, values tick up.
import { L, tv, U, low , t0 , bands, scatter } from './_lib.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  { s.draw({ at: -1 }, (c) => { c.strokeStyle = 'rgba(80,100,140,0.16)'; c.lineWidth = 2; for (let x = 0; x <= s.W; x += 54) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, s.H); c.stroke(); } for (let y = 0; y <= s.H; y += 54) { c.beginPath(); c.moveTo(0, y); c.lineTo(s.W, y); c.stroke(); } });
    const b = bands(s); scatter(s, ['chart-line', 'chart-pie', 'trending-up', 'chart-column', 'percent'], b.top, { colors: ['blue', 'green', 'orange'], seed: ctx.i + 5 });
    scatter(s, ['chart-column', 'chart-spline', 'calculator', 'chart-pie', 'chart-no-axes-combined'], b.bottom, { colors: ['purple', 'blue', 'green'], seed: ctx.i + 11, n: 6 }); }
  const { top, h, w } = s.safe; const u = U(s);
  s.text(L(s, sc.headline), { y: top + u * 2, valign: 'top', size: u * 11, bold: true, maxWidth: w * 0.95, at: t0(ctx) });
  const ch = sc.chart || (sc.stat ? { type: 'bar', items: [{ label: '', value: sc.stat.value }] } : null);
  const z = low(s); s.icon(sc.icon || 'bar-chart-3', { y: z.y, size: Math.min(z.h * 0.7, u * 58), color: 'accent', at: tv(s, 0.05) });
  if (!ch) { s.icon(sc.icon || 'bar-chart-3', { y: top + h * 0.55, size: u * 40, color: 'accent', at: tv(s, 0.1) }); return; }
  const data = ch.items.map((it, k) => ({ label: L(s, it.label), value: it.value, at: tv(s, 0.1 + 0.6 * (k / Math.max(1, ch.items.length))) }));
  if (ch.type === 'pie') {
    s.pie(data, { x: s.cx, y: top + h * 0.6, r: u * 30, donut: 0.55, at: tv(s, 0.1), dur: 1.4 });
  } else {
    s.bars(data, { x: s.cx, y: top + h * 0.58, w: w * 0.9, h: h * 0.55, suffix: L(s, ch.unit), at: tv(s, 0.1), labelSize: u * 5.5, valueSize: u * 6 });
  }
}
