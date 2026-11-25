// Timeline / roadmap: a vertical road draws down the frame; milestones pop in one by one.
import { L, tv, U, spread, low , t0 , bands, scatter } from './_lib.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  { const b = bands(s); s.draw({ at: -1 }, (c) => { c.setLineDash([18, 16]); c.strokeStyle = 'rgba(80,90,120,0.45)'; c.lineWidth = 8; const x = s.safe.left + s.safe.w * 0.22; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, s.H); c.stroke(); c.setLineDash([]); });
    s.draw({ at: -1 }, (c) => { const x = s.safe.left + s.safe.w * 0.22; for (let y = 120; y < s.H; y += 150) { c.fillStyle = 'rgba(80,90,120,0.35)'; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); c.fillRect(x + 24, y - 3, 80 + (y % 3) * 40, 6); } });
    scatter(s, ['flag', 'milestone', 'map-pin', 'calendar'], b.top, { colors: ['accent', 'purple', 'green'], seed: ctx.i + 6, n: 4 });
    scatter(s, ['footprints', 'flag-triangle-right', 'trophy', 'route', 'signpost'], b.bottom, { colors: ['accent', 'orange', 'blue'], seed: ctx.i + 12, n: 5 }); }
  const { top, h, w, left } = s.safe; const u = U(s);
  s.text(L(s, sc.headline), { y: top + u * 2, valign: 'top', size: u * 10.5, bold: true, maxWidth: w * 0.95, at: t0(ctx) });
  let steps = (sc.steps || []).map((x) => ({ date: x.date || '', label: L(s, x.label) }));
  if (!steps.length && sc.items) steps = sc.items.map((x, k) => ({ date: `0${k + 1}`, label: L(s, x) }));
  if (!steps.length) steps = [{ date: '01', label: L(s, sc.headline).replace(/\*/g, '') }];
  // the destination: the road runs on past the milestones into a big icon in the picture zone, shown early (not at the
  // end of the scene) so the lower half of the frame carries the picture for most of the scene
  const z = low(s); const isz = Math.min(z.h * 0.8, u * 64);
  s.line([[left + w * 0.22, top + h * 0.94], [left + w * 0.22, z.y], [s.W / 2 - isz * 0.55, z.y]], { color: 'accent', width: 8, at: tv(s, 0.2), dur: 0.8, overlap: true, camera: false });
  s.icon(sc.icon || 'flag', { y: z.y, size: isz, color: 'accent', at: tv(s, 0.3), overlap: true });
  const x0 = left + w * 0.22, y0 = top + h * 0.22, y1 = top + h * 0.94;
  s.line([[x0, y0], [x0, y1]], { color: 'muted', width: 8, at: 0.05, dur: 1.0 });
  const ys = steps.map((_, k) => y0 + (y1 - y0) * ((k + 0.5) / steps.length));
  const ts = spread(s, steps.length, 0.12, 0.8);
  steps.forEach((st, k) => {
    s.circle({ x: x0, y: ys[k], r: u * 4.5, fill: 'accent', border: false, at: ts[k], enter: 'pop' });
    s.text(st.date, { x: x0 - u * 9, y: ys[k], size: u * 5, align: 'right', color: 'muted', bold: true, at: ts[k] });
    s.box(st.label, { x: x0 + u * 10 + w * 0.28, y: ys[k], w: w * 0.56, size: u * 6, color: ['blue', 'purple', 'green', 'orange', 'pink'][k % 5], at: ts[k] + 0.1, enter: 'slide-left' });
  });
}
