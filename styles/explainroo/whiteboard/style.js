// Whiteboard marker sketch: everything is drawn line by line in dry-erase marker colours.
import { L, tv, U, items, low , t0 , statStr , bands, scatter , mid } from './_lib.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  { const b = bands(s); scatter(s, [sc.icon || 'lightbulb', 'star', 'arrow-right', 'sparkles', 'circle-check'], b.top, { colors: ['blue', 'red', 'green'], seed: ctx.i + 1 });
    scatter(s, ['arrow-up-right', sc.icon || 'lightbulb', 'zap', 'star', 'check'], b.bottom, { colors: ['red', 'blue', 'green'], seed: ctx.i + 9, n: 6 });
    s.draw({ at: -1 }, (c) => { c.fillStyle = '#c9ccd1'; c.fillRect(0, s.H - 70, s.W, 70); ['#1f5fbf', '#d1352b', '#1e8a4c'].forEach((m, k) => { c.fillStyle = m; c.fillRect(160 + k * 260, s.H - 100, 190, 26); c.fillStyle = '#eee'; c.fillRect(160 + k * 260 + 150, s.H - 100, 40, 26); }); }); }
  const { top, h, w } = s.safe; const u = U(s);
  // whiteboard frame + tray
  s.draw({ at: -1 }, (c) => { c.strokeStyle = '#c9ccd1'; c.lineWidth = 18; c.strokeRect(9, 9, s.W - 18, s.H - 18); });
  const head = s.text(L(s, sc.headline), { y: top + h * 0.12, size: u * 13, font: 'hand', bold: true, maxWidth: w * 0.95, mark: 'red', at: t0(ctx) });
  s.annotate({ x: s.cx, y: head.bottom + u * 2, w: head.w * 0.9, h: 4 }, { type: 'underline', color: 'blue', at: tv(s, 0.1) });
  const z = mid(s); const isz = Math.min(z.h * 0.62, u * 70);
  const ic = s.icon(sc.icon || 'lightbulb', { y: z.y, size: isz, color: 'blue', at: tv(s, 0.05), dur: 1.0 });
  s.annotate({ x: s.cx, y: z.y, w: isz * 1.35, h: isz * 1.35 }, { type: 'circle', color: 'red', at: tv(s, 0.4) });
  const its = items(s, sc);
  if (sc.stat) {
    const n = s.text(`${statStr(s, sc.stat)}`, { y: top + h * 0.4, size: u * 20, font: 'hand', bold: true, color: 'red', at: tv(s, 0.3) });
    s.annotate({ x: s.cx, y: n.bottom, w: n.w, h: 4 }, { type: 'underline', color: 'blue', at: tv(s, 0.6) });
    s.text(L(s, sc.stat.label), { y: n.bottom + u * 7, size: u * 8, font: 'hand', color: 'muted', at: tv(s, 0.45) });
  } else if (its.length) {
    s.list(its, { x: s.safe.left + w * 0.12, y: top + h * 0.32, size: u * 8, bullet: 'check', at: tv(s, 0.4), stagger: 0.5 });
  }
}
