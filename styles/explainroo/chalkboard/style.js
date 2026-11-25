// Chalkboard: chalk writing on a green board, with chalk underlines, boxes and doodles.
import { L, tv, U, items, low , t0 , statStr , bands, scatter , mid } from './_lib.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  { const b = bands(s); scatter(s, [sc.icon || 'sigma', 'pi', 'triangle', 'star', 'arrow-right'], b.top, { colors: ['ink', 'yellow', 'pink'], seed: ctx.i + 2, weight: 1.6 });
    scatter(s, ['circle', sc.icon || 'graduation-cap', 'infinity', 'square-sigma', 'star'], b.bottom, { colors: ['ink', 'yellow'], seed: ctx.i + 7, n: 6, weight: 1.6 });
    s.draw({ at: -1 }, (c) => { c.fillStyle = '#7a5230'; c.fillRect(0, s.H - 90, s.W, 56); c.fillStyle = '#f1f3f5'; c.fillRect(260, s.H - 112, 120, 22); c.fillStyle = '#ffe066'; c.fillRect(440, s.H - 110, 90, 20); c.fillStyle = '#495057'; c.fillRect(700, s.H - 128, 170, 40); }); }
  const { top, h, w } = s.safe; const u = U(s);
  // wooden frame
  s.draw({ at: -1 }, (c) => { c.strokeStyle = '#7a5230'; c.lineWidth = 34; c.strokeRect(17, 17, s.W - 34, s.H - 34); });
  s.text(`#${ctx.i + 1}`, { x: s.safe.left + u * 5, y: top + h * 0.02, size: u * 6, font: 'hand', color: 'yellow', at: -1 });
  const head = s.text(L(s, sc.headline), { y: top + h * 0.17, size: u * 12.5, font: 'hand', maxWidth: w * 0.88, mark: 'yellow', at: t0(ctx) });
  s.annotate({ x: s.cx, y: head.y, w: head.w + u * 6, h: head.h + u * 5 }, { type: 'box', color: 'yellow', at: tv(s, 0.15) });
  const z = mid(s); s.icon(sc.icon || 'graduation-cap', { y: z.y, size: Math.min(z.h * 0.62, u * 72), color: 'ink', at: tv(s, 0.08) });
  const its = items(s, sc);
  if (its.length) {
    s.list(its, { x: s.safe.left + w * 0.1, y: top + h * 0.36, size: u * 8, bullet: 'arrow', at: tv(s, 0.35), stagger: 0.45 });
  } else if (sc.stat) {
    const t = s.text(`${statStr(s, sc.stat)}`, { id: 'n', y: top + h * 0.42, size: u * 20, font: 'hand', color: 'yellow', at: tv(s, 0.45) });
    s.annotate('n', { type: 'underline', color: 'pink', at: tv(s, 0.65) });
    s.text(L(s, sc.stat.label), { y: t.bottom + u * 8, size: u * 8, font: 'hand', color: 'muted', at: tv(s, 0.6) });
  }
}
