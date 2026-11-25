// Hand-drawn line-art stroke animation: one continuous ink line draws the frame, the icon traces itself.
import { L, tv, U, low , t0 , statStr , bands, scatter , mid } from './_lib.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  { const b = bands(s); const w = s.full.w;
    s.path(`M -40 ${b.top.y + 40} C ${w * 0.25} ${b.top.y - 90}, ${w * 0.5} ${b.top.y + 120}, ${w * 0.75} ${b.top.y - 20} S ${w + 60} ${b.top.y + 50}, ${w + 80} ${b.top.y}`, { color: 'ink', width: 4, single: true, at: 0.05, dur: 1.4, overlap: true, camera: false, sfx: false });
    s.path(`M -40 ${b.bottom.y} C ${w * 0.3} ${b.bottom.y + 110}, ${w * 0.55} ${b.bottom.y - 100}, ${w * 0.8} ${b.bottom.y + 40} S ${w + 60} ${b.bottom.y - 30}, ${w + 80} ${b.bottom.y + 20}`, { color: 'orange', width: 5, single: true, at: 0.3, dur: 1.6, overlap: true, camera: false, sfx: false });
    { const y = s.safe.top + s.safe.h * 0.6; s.path(`M ${-40} ${y} C ${w * 0.2} ${y - 70}, ${w * 0.45} ${y + 80}, ${w * 0.6} ${y} S ${w * 0.9} ${y - 60}, ${w + 60} ${y + 20}`, { color: 'ink', width: 3, single: true, at: 0.15, dur: 1.5, overlap: true, camera: false, sfx: false }); }
    scatter(s, ['leaf', 'feather', 'sprout'], b.bottom, { colors: ['ink'], seed: ctx.i + 4, n: 3, weight: 1.4 }); }
  const { top, h, w, left, right } = s.safe; const u = U(s);
  // one continuous flowing line from the left edge, looping round the subject
  const z = mid(s); const cy = z.y, R = Math.min(z.h * 0.36, u * 56);
  const d = `M ${left - 40} ${cy + R * 1.4} C ${left + w * 0.2} ${cy + R * 1.6}, ${s.cx - R * 1.4} ${cy + R * 1.2}, ${s.cx - R} ${cy}` +
    ` C ${s.cx - R} ${cy - R * 1.3}, ${s.cx + R} ${cy - R * 1.3}, ${s.cx + R} ${cy}` +
    ` C ${s.cx + R} ${cy + R * 1.1}, ${s.cx - R * 0.6} ${cy + R * 1.1}, ${s.cx - R * 0.3} ${cy + R * 0.5}` +
    ` C ${s.cx + R * 0.4} ${cy - R * 0.3}, ${right - w * 0.1} ${cy + R * 1.8}, ${right + 40} ${cy + R * 1.5}`;
  s.path(d, { color: 'orange', width: 5, single: true, at: 0, dur: Math.min(2.2, s.dur * 0.6), overlap: true });
  s.icon(sc.icon || 'feather', { y: cy, size: R * 1.15, color: 'ink', weight: 1.5, at: tv(s, 0.1), dur: 1.2 });
  s.text(L(s, sc.headline), { y: top + h * 0.12, size: u * 16, font: 'display', maxWidth: w * 0.92, mark: 'orange', enter: 'write', at: t0(ctx) });
  if (sc.stat) s.text(`${statStr(s, sc.stat)} · ${L(s, sc.stat.label)}`, { y: top + h * 0.42, size: u * 9, font: 'hand', color: 'muted', enter: 'write', at: tv(s, 0.5) });
  else if (sc.items) s.text(sc.items.map((x) => L(s, x)).join('  →  '), { y: top + h * 0.42, size: u * 7, font: 'hand', maxWidth: w * 0.95, color: 'muted', enter: 'write', at: tv(s, 0.4) });
}
