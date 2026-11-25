// Map / geo pin animation: a dot-matrix world map that pushes in on the places, pins drop on cue.
import { L, tv, U, spread, low } from './_lib.js';
import { STEP, LAT0, LON0, ROWS } from './worldmask.js';
// video.json settings for this style live in config.json
export function scene(s, sc, ctx) {
  const { top, h, w, left } = s.safe; const u = U(s);
  s.short.backdrop({ color: '#0a1830', color2: '#050b18', glow: '#1c7ed6', pattern: 'none' });
  const places = (sc.places && sc.places.length ? sc.places : (ctx.board.places || []));
  // view box in degrees around the places (whole world if none)
  let lo0 = -170, lo1 = 190, la0 = -50, la1 = 75;
  if (places.length) {
    const lons = places.map((p) => p.lon), lats = places.map((p) => p.lat);
    lo0 = Math.min(...lons) - 25; lo1 = Math.max(...lons) + 25; la0 = Math.min(...lats) - 20; la1 = Math.max(...lats) + 20;
  }
  const mapTop = top + h * 0.3, mapH = s.safe.bottom - mapTop - u * 6;
  const sc0 = Math.min(w / (lo1 - lo0), mapH / (la1 - la0)) * 0.9;
  const midLon = (lo0 + lo1) / 2, midLat = (la0 + la1) / 2, mx = s.cx, my = mapTop + mapH / 2;
  const P = (lon, lat) => [mx + (lon - midLon) * sc0, my - (lat - midLat) * sc0];
  const r = Math.max(2.5, STEP * sc0 * 0.32);
  s.draw({ at: 0, enter: 'fade', dur: 0.4, box: { x: 0, y: 0, w: 2, h: 2 } }, (c) => {
    c.fillStyle = 'rgba(120,180,255,0.55)';
    ROWS.forEach((row, ri) => { const lat = LAT0 - ri * STEP - STEP / 2; for (let ci = 0; ci < row.length; ci++) { if (row[ci] !== '1') continue;
      const [x, y] = P(LON0 + ci * STEP + STEP / 2, lat); if (x < -10 || x > s.W + 10 || y < -10 || y > s.H + 10) continue; /* edge to edge */ c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } });
  });
  s.draw({ at: -1 }, (c) => { c.strokeStyle = 'rgba(120,180,255,0.4)'; c.lineWidth = 2;
    c.save(); c.strokeStyle = 'rgba(120,180,255,0.25)'; for (let y = 30; y < s.H; y += 70) { c.beginPath(); for (let x = 0; x <= s.W; x += 20) c.lineTo(x, y + Math.sin(x * 0.03 + y + s.t * 1.5) * 6); c.stroke(); } c.restore();
    for (let lon = -180; lon <= 180; lon += 15) { const [x0] = P(lon, 0); c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, s.H); c.stroke(); }
    for (let lat = -75; lat <= 85; lat += 15) { const [, y0] = P(0, lat); c.beginPath(); c.moveTo(0, y0); c.lineTo(s.W, y0); c.stroke(); }
    const cx = s.W - 170, cy = s.H - 420, R0 = 110; c.strokeStyle = 'rgba(160,200,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R0, 0, 7); c.stroke();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3 * Math.sin(s.t); c.fillStyle = k ? 'rgba(160,200,255,0.6)' : '#ff6b6b'; c.beginPath(); c.moveTo(cx + Math.cos(a) * R0 * 0.9, cy + Math.sin(a) * R0 * 0.9); c.lineTo(cx + Math.cos(a + 1.4) * 16, cy + Math.sin(a + 1.4) * 16); c.lineTo(cx + Math.cos(a - 1.4) * 16, cy + Math.sin(a - 1.4) * 16); c.fill(); } });
  s.short.hook(L(s, sc.headline), { y: top + h * 0.1, style: 'slab' });
  const times = spread(s, Math.max(1, places.length), 0.15, 0.75);
  places.forEach((p, k) => {
    const [x, y] = P(p.lon, p.lat);
    s.draw({ at: times[k], dur: 0.6 }, (c, life) => { const R = u * 3 + life.local * u * 8 % (u * 8); c.strokeStyle = `rgba(255,107,107,${0.8 - (life.local * 0.8 % 0.8)})`; c.lineWidth = 4; c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke(); });
    s.icon('map-pin', { x, y: y - u * 6, size: u * 12, color: 'red', at: times[k], enter: 'drop' });
    s.text(L(s, p.name), { x, y: y + u * 6, size: u * 5.5, bold: true, color: '#ffffff', bg: 'rgba(10,24,48,0.75)', padding: 10, radius: 10, at: times[k] + 0.15 });
  });
}
