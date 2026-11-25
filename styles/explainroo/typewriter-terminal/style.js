// Typewriter / terminal: everything is typed out in green mono on a CRT-dark grid.
import { L, plain, tv, U, items, low , t0 , statStr , bands, scatter } from './_lib.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  { const words = (L(s, sc.narration) || '').replace(/[^\w\s\u0900-\u097F]/g, '').split(/\s+/).filter(Boolean);
    s.draw({ at: -1 }, (c) => { c.font = '28px "JetBrains Mono", monospace'; const cols = 9;
      for (let k = 0; k < cols; k++) { const x = 30 + k * (s.W / cols); for (let r = 0; r < 40; r++) { const y = ((r * 52 + s.t * (60 + k * 9)) % (s.H + 100)) - 50;
        c.fillStyle = `rgba(57,255,122,${0.05 + 0.05 * ((r + k) % 3 === 0)})`; c.fillText(words[(r + k * 5) % Math.max(1, words.length)] || '01', x, y); } }
      c.fillStyle = '#123d22'; c.fillRect(0, 0, s.W, 54); c.fillStyle = '#39ff7a'; c.font = '30px "JetBrains Mono", monospace'; c.fillText(`[0] explain  ${new Array(Math.floor(s.t * 2) % 4 + 1).join('.')}`, 24, 38);
      c.fillStyle = '#123d22'; c.fillRect(0, s.H - 64, s.W, 64); c.fillStyle = '#39ff7a'; c.fillText(`-- INSERT --   ${ctx.i + 1}/${ctx.n}   utf-8`, 24, s.H - 22); }); }
  const { top, h, w } = s.safe; const u = U(s);
  // faint scanlines over the frame
  s.draw({ at: -1 }, (c) => { c.fillStyle = 'rgba(57,255,122,0.035)'; for (let y = 0; y < s.H; y += 6) c.fillRect(0, y, s.W, 2); });
  s.draw({ at: -1 }, (c) => { c.fillStyle = 'rgba(3,10,6,0.82)'; c.fillRect(0, top - u * 2, s.W, h * 0.36); });
  s.text(`> ${ctx.i + 1}/${ctx.n}  ${(sc.role || 'scene').toUpperCase()}`, { y: top + h * 0.05, size: u * 5.5, font: 'mono', color: 'muted', at: -1 });
  const head = s.text(L(s, sc.headline), { y: top + h * 0.2, size: u * 11, font: 'mono', maxWidth: w * 0.94, color: 'green', mark: 'yellow', enter: ctx.i === 0 ? 'none' : 'type', cps: 18, at: ctx.i === 0 ? -1 : 0.05 });
  // blinking block cursor under the headline
  s.draw({ at: 0.05 }, (c) => { if (Math.floor(s.t * 2.4) % 2 === 0) { c.fillStyle = '#39ff7a'; c.fillRect(s.cx - u * 3, head.bottom + u * 2, u * 6, u * 1.6); } });
  const lines = [{ cmd: `explain "${plain(L(s, sc.headline)).slice(0, 16)}"`, at: tv(s, 0.2) }];
  const its = items(s, sc);
  if (sc.stat) lines.push({ out: `${L(s, sc.stat.label) || 'value'} = ${statStr(s, sc.stat)}`, at: tv(s, 0.45), color: 'yellow' });
  its.forEach((t, k) => lines.push({ out: `[ok] ${t}`, at: tv(s, 0.35 + 0.5 * (k / Math.max(1, its.length))), color: 'green' }));
  if (lines.length === 1) lines.push({ out: plain(L(s, sc.narration)).slice(0, 40) + '…', at: tv(s, 0.5) });
  // vertical order: label + headline (on a dark backing so the code rain never runs through the words) -> terminal ->
  // karaoke captions (y ~1166, drawn by the compositor) -> icon in the picture zone
  const z = low(s); const isz = Math.min(z.h * 0.74, u * 70);
  s.icon(sc.icon || 'terminal', { y: z.y + u * 5, size: isz, color: 'green', weight: 1.5, at: tv(s, 0.1) });
  s.terminal(lines, { y: top + h * 0.6, w: Math.min(s.W - 60, w * 1.08), size: u * 4.7, title: 'bash — explain', rows: Math.max(4, lines.length + 1), at: tv(s, 0.15) });
}
