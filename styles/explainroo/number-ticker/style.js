// Number-ticker / counter reveal: a giant number counts up inside a filling ring, confetti on landing.
import { L, tv, U, low , statStr , bands, scatter } from './_lib.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  const { top, h, w } = s.safe; const u = U(s);
  s.short.backdrop({ color: '#14082e', color2: '#05030d', glow: '#7048e8', pattern: 'rays' });
  { const st0 = sc.stat; s.draw({ at: -1 }, (c) => { for (let i = 0; i < 220; i++) { c.fillStyle = ['#ffd43b', '#7048e8', '#ff6b6b', '#4dabf7'][i % 4]; c.globalAlpha = 0.55; const y = (s.rand(i * 3) * s.H + s.t * (40 + s.rand(i) * 80)) % s.H; c.fillRect(s.rand(i) * s.W, y, 10, 18); } c.globalAlpha = 1;
      // odometer tapes in the top and bottom bands: rolling digit strips (the scene's own number when there is one), so the
      // edges of the frame are part of the picture. Digits only, no words.
      const tape = st0 ? String(st0.value).replace(/[^0-9]/g, '') || '0123456789' : '0123456789';
      c.font = `900 ${Math.round(s.H * 0.07)}px "Space Grotesk", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const cell = s.H * 0.07 * 0.78, n = Math.ceil(s.W / cell) + 2;
      [[s.full.top + 150, 1], [s.H - 150, -1]].forEach(([y, dir]) => {
        c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, y - cell * 0.75, s.W, cell * 1.5);
        const off = ((s.t * 70 * dir) % cell + cell) % cell;
        for (let k = -1; k < n; k++) { const ch = tape[(k + 1000) % tape.length]; c.fillStyle = k % 2 ? 'rgba(255,212,59,0.55)' : 'rgba(255,255,255,0.32)'; c.fillText(ch, k * cell + off, y); }
      }); c.textBaseline = 'alphabetic'; }); }
  s.short.hook(L(s, sc.headline), { y: top + h * 0.1, style: 'stroke' });
  const st = sc.stat; // never invent numbers: without a stat the ring holds the scene icon
  const at = tv(s, 0.1), dur = Math.min(1.8, Math.max(0.8, s.dur * 0.4));
  const cy = top + h * 0.64, R = u * 26;
  s.draw({ at, overlap: true, box: { x: s.cx, y: cy, w: R * 2.2, h: R * 2.2, round: true } }, (c) => {
    const p = s.ease.out(s.clamp((s.t - at) / dur, 0, 1));
    c.lineWidth = u * 3; c.strokeStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(s.cx, cy, R, 0, 7); c.stroke();
    c.strokeStyle = '#ffd43b'; c.lineCap = 'round'; c.beginPath(); c.arc(s.cx, cy, R, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.stroke();
  });
  if (st) {
    const chars = statStr(s, st).length;
    s.number(st.value, { y: cy, size: Math.min(u * 19, (R * 1.7) / (chars * 0.58)), bold: true, overlap: true, prefix: L(s, st.prefix), suffix: L(s, st.suffix), decimals: st.decimals || 0, color: '#ffffff', at, dur });
    if (L(s, st.label)) s.text(L(s, st.label), { y: cy + R + u * 6, size: u * 6.5, color: '#ffd43b', bold: true, at: at + dur * 0.7 });
  } else {
    s.icon(sc.icon || 'star', { y: cy, size: R * 1.1, color: '#ffffff', at, enter: 'pop', overlap: true });
  }
  const z = low(s); s.icon(st ? (sc.icon || 'sparkles') : 'sparkles', { y: z.y, size: Math.min(z.h * 0.65, u * 52), color: 'yellow', at: at + dur * 0.8, enter: 'pop' });
  s.burst({ x: s.cx, y: cy, at: at + dur, count: 60 });
}
