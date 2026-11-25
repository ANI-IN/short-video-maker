// documentary-history (explainroo part): the parchment MAP and TIMELINE inserts. Footage scenes and character
// reenactments are drawn by Remotion over this base; any other scene gets an engraved title card.
import { L, tv, U, spread, low, t0 } from './_lib.js';
import { STEP, LAT0, LON0, ROWS } from './worldmask.js';

const INK = '#2b2118', SEPIA = '#6b5a44', WAX = '#8b1e1e';

function paper(s) {   // clean parchment + a crisp engraved band top and bottom (no aging texture)
  s.draw({ at: -1 }, (c) => { c.strokeStyle = '#6b5a44'; c.lineWidth = 3;
    for (const y0 of [s.full.top + 70, s.full.bottom - 150]) { c.strokeRect(40, y0, s.W - 80, 80); c.beginPath();
      for (let x = 60; x < s.W - 60; x += 40) { c.moveTo(x, y0 + 60); c.lineTo(x, y0 + 20); c.lineTo(x + 28, y0 + 20); c.lineTo(x + 28, y0 + 48); c.lineTo(x + 12, y0 + 48); c.lineTo(x + 12, y0 + 34); } c.stroke(); } });
}
function title(s, sc, ctx) {
  const { top, w } = s.safe; const u = U(s);
  const t = s.text(L(s, sc.headline), { y: top + u * 4, valign: 'top', size: u * 11, font: 'display', maxWidth: w * 0.92, mark: 'red', at: t0(ctx) });
  s.line([[s.cx - u * 14, t.bottom + u * 3], [s.cx + u * 14, t.bottom + u * 3]], { color: WAX, width: 4, at: t0(ctx) });
  return t;
}

function map(s, sc, ctx) {
  const { top, h, w } = s.safe; const u = U(s);
  s.camera([]); paper(s);
  const head = title(s, sc, ctx);
  const places = sc.places || [];
  let lo0 = -170, lo1 = 190, la0 = -50, la1 = 75;
  if (places.length) {
    const lons = places.map((p) => p.lon), lats = places.map((p) => p.lat);
    const pad = Math.max(22, (Math.max(...lons) - Math.min(...lons)) * 0.6);   // wide enough to read as a map (a country), not a field of dots
    lo0 = Math.min(...lons) - pad; lo1 = Math.max(...lons) + pad; la0 = Math.min(...lats) - pad * 0.8; la1 = Math.max(...lats) + pad * 0.8;
  }
  const mapTop = head.bottom + u * 10, mapH = low(s).bottom - mapTop;
  const k0 = Math.min(w * 1.05 / (lo1 - lo0), mapH / (la1 - la0));
  const midLon = (lo0 + lo1) / 2, midLat = (la0 + la1) / 2, mx = s.cx, my = mapTop + mapH / 2;
  // slow push toward the places over the scene (a map "move", like a documentary)
  const z = 1 + 0.18 * s.ease.inOut(s.clamp(s.t / Math.max(1, s.dur), 0, 1));
  const P = (lon, lat) => [mx + (lon - midLon) * k0 * z, my - (lat - midLat) * k0 * z];
  const r = Math.min(u * 1.6, Math.max(2.2, STEP * k0 * z * 0.3));   // small dots: a fine dot-map, never a polka-dot field
  s.draw({ at: 0, enter: 'fade', dur: 0.5, box: { x: 0, y: 0, w: 2, h: 2 } }, (c) => {
    c.fillStyle = 'rgba(70,45,20,0.55)';
    ROWS.forEach((row, ri) => { const lat = LAT0 - ri * STEP - STEP / 2; for (let ci = 0; ci < row.length; ci++) { if (row[ci] !== '1') continue;
      const [x, y] = P(LON0 + ci * STEP + STEP / 2, lat); if (x < -20 || x > s.W + 20 || y < mapTop - u * 4 || y > s.H + 20) continue; /* edge to edge, but never over the headline */ c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } });
    c.strokeStyle = 'rgba(70,45,20,0.25)'; c.lineWidth = 2;      // engraved graticule
    for (let lon = -180; lon <= 180; lon += 10) { const [x0, y0] = P(lon, 80), [x1, y1] = P(lon, -60); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    for (let lat = -60; lat <= 80; lat += 10) { const [x0, y0] = P(-180, lat), [x1, y1] = P(180, lat); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  });
  const ts = spread(s, Math.max(1, places.length), 0.12, 0.7);
  // label placement: each name tries above / below / right / left of its pin and takes the first spot that doesn't collide
  // with an earlier label or pin (checked at the end of the map push, when pins are furthest apart... and closest to labels)
  const fs = Math.round(u * 7.5), lh = fs * 1.15;   // readable place names
  const Pend = (lon, lat) => [mx + (lon - midLon) * k0 * 1.18, my - (lat - midLat) * k0 * 1.18];
  const boxes = places.map((p) => { const [x, y] = Pend(p.lon, p.lat); return [x - u * 3, y - u * 3, u * 6, u * 6]; });
  const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  const offs = places.map((p, i) => {
    const tw = L(s, p.name).length * fs * 0.5, [x, y] = Pend(p.lon, p.lat);
    const cand = [[0, -u * 4.5 - lh / 2], [0, u * 4.5 + lh * 0.6], [u * 5 + tw / 2, 0], [-u * 5 - tw / 2, 0], [0, -u * 4.5 - lh * 1.6], [0, u * 4.5 + lh * 1.7]];
    for (const [dx, dy] of cand) {
      const bx = [x + dx - tw / 2, y + dy - lh / 2, tw, lh];
      if (bx[0] < 20 || bx[0] + bx[2] > s.W - 20) continue;
      if (!boxes.some((o, j) => j !== i && hit(bx, o))) { boxes.push(bx); return [dx, dy]; }
    }
    return [0, -u * 4.5 - lh / 2 - (i % 2) * lh * 1.2];
  });
  places.forEach((p, i) => {
    s.draw({ at: ts[i], dur: 0.5 }, (c, life) => { const [x, y] = P(p.lon, p.lat); const k = s.ease.outBack(life.p);
      c.fillStyle = WAX; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(x, y, u * 2.6 * k, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = `rgba(139,30,30,${0.6 - (life.local % 1.4) * 0.4})`; c.beginPath(); c.arc(x, y, u * (3 + (life.local % 1.4) * 4), 0, 7); c.stroke(); });
    s.draw({ at: ts[i] + 0.15, dur: 0.4, enter: 'fade' }, (c) => { const [x, y] = P(p.lon, p.lat);
      c.font = `italic ${fs}px "Instrument Serif", "Noto Sans Devanagari", serif`; c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tx = Math.max(24 + L(s, p.name).length * fs * 0.25, Math.min(s.W - 24 - L(s, p.name).length * fs * 0.25, x + offs[i][0]));
      c.fillText(L(s, p.name), tx, y + offs[i][1]); c.textBaseline = 'alphabetic'; });
  });
  if (places.length > 1) {   // route between places, drawn like an ink line on a campaign map
    s.draw({ at: ts[1] || ts[0], dur: 1.2 }, (c, life) => { c.strokeStyle = WAX; c.lineWidth = 4; c.setLineDash([12, 10]); c.beginPath();
      places.forEach((p, i) => { const [x, y] = P(p.lon, p.lat); if (i === 0) c.moveTo(x, y); else if (i <= Math.ceil(life.p * (places.length - 1))) c.lineTo(x, y); }); c.stroke(); c.setLineDash([]); });
  }
}

function timeline(s, sc, ctx) {
  const { top, h, w, left } = s.safe; const u = U(s);
  s.camera([]); paper(s);
  const head = title(s, sc, ctx);
  const steps = (sc.steps || []).map((x) => ({ date: L(s, x.date), label: L(s, x.label) }));
  const x0 = left + w * 0.26, y0 = head.bottom + u * 12, y1 = s.safe.bottom - u * 4;
  s.line([[x0, s.full.top], [x0, s.full.bottom]], { color: INK, width: 5, at: 0.05, dur: 1.0, overlap: true });   // the spine runs edge to edge
  for (let k = 0; k < 6; k++) { const yy = low(s).top + k * ((s.full.bottom - low(s).top) / 6); s.line([[x0 - u * 3, yy], [x0 + u * 3, yy]], { color: SEPIA, width: 3, at: 0.6, overlap: true }); }
  const ts = spread(s, Math.max(1, steps.length), 0.1, 0.8);
  s.draw({ at: -1 }, (c) => {   // the whole chronology is laid out (ghosted) from frame 0 so the frame is composed; each step inks in on its cue
    steps.forEach((st, i) => { const y = y0 + (y1 - y0) * ((i + 0.5) / steps.length);
      c.globalAlpha = 0.25; c.fillStyle = WAX; c.beginPath(); c.arc(x0, y, u * 3, 0, 7); c.fill();
      c.font = `${Math.round(u * 7)}px "Instrument Serif", "Noto Sans Devanagari", serif`; c.fillStyle = INK; c.textAlign = 'right'; c.fillText(st.date, x0 - u * 6, y + u * 2);
      c.textAlign = 'left'; c.font = `${Math.round(u * 6.5)}px "Instrument Serif", "Noto Sans Devanagari", serif`; c.fillText(st.label, x0 + u * 7, y + u * 2); });
    c.globalAlpha = 0.10; c.fillStyle = INK; c.textAlign = 'center'; c.font = `${Math.round(s.H * 0.16)}px "Instrument Serif", serif`;
    const big = steps.length ? steps[steps.length - 1].date : '';
    c.fillText(big, s.W / 2, low(s).y + s.H * 0.07); c.globalAlpha = 1; });
  steps.forEach((st, i) => {
    const y = y0 + (y1 - y0) * ((i + 0.5) / steps.length);
    s.circle({ x: x0, y, r: u * 3, fill: WAX, stroke: INK, at: ts[i], enter: 'pop' });
    s.text(st.date, { x: x0 - u * 6, y, size: u * 7, font: 'display', align: 'right', color: 'red', at: ts[i] });
    s.text(st.label, { x: x0 + u * 7, y, size: u * 6.5, font: 'display', align: 'left', maxWidth: w * 0.66, color: INK, at: ts[i] + 0.12 });
  });
}

function card(s, sc, ctx) {   // nothing to show literally: an engraved chapter card with the scene's icon
  const { top, h } = s.safe; const u = U(s);
  s.camera([]); paper(s);
  s.draw({ at: -1 }, (c) => { c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(36, 36, s.W - 72, s.H - 72); c.lineWidth = 1.5; c.strokeRect(54, 54, s.W - 108, s.H - 108);
    for (const [x, y] of [[54, 54], [s.W - 54, 54], [54, s.H - 54], [s.W - 54, s.H - 54]]) { c.beginPath(); c.arc(x, y, 18, 0, 7); c.stroke(); } });
  title(s, sc, ctx);
  // one engraved emblem (not the same icon twice), then the scene's label and number, all kept above the captions (y 1500):
  // the label sits between the emblem and the number (below the number it landed right on the caption line)
  s.icon(sc.icon || 'scroll', { y: top + h * 0.6, size: u * 42, color: INK, weight: 1.3, at: tv(s, 0.05) });
  const st = sc.stat, lz = low(s);
  if (st && st.value !== undefined) {
    s.text(`${L(s, st.prefix) || ''}${st.value}${L(s, st.suffix) || ''}`, { y: lz.top + u * 16, size: u * 17, font: 'display', color: SEPIA, at: tv(s, 0.25), overlap: true });
    if (L(s, st.label)) s.text(L(s, st.label), { y: lz.top - u * 2, size: u * 6, font: 'display', color: INK, maxWidth: s.safe.w * 0.8, at: tv(s, 0.35), overlap: true });
  } else {
    s.draw({ at: tv(s, 0.2), enter: 'fade', overlap: true }, (c) => { const y = lz.top + u * 14; c.strokeStyle = SEPIA; c.lineWidth = 2;
      c.beginPath(); c.moveTo(s.W * 0.22, y); c.lineTo(s.W * 0.42, y); c.moveTo(s.W * 0.58, y); c.lineTo(s.W * 0.78, y); c.stroke();
      c.beginPath(); c.moveTo(s.cx, y - 14); c.lineTo(s.cx + 14, y); c.lineTo(s.cx, y + 14); c.lineTo(s.cx - 14, y); c.closePath(); c.fillStyle = SEPIA; c.fill(); });
  }
}

export function scene(s, sc, ctx) {
  const v = sc.visual;
  if (v === 'map' && (sc.places || []).length) return map(s, sc, ctx);
  if (v === 'timeline' && (sc.steps || []).length) return timeline(s, sc, ctx);
  return card(s, sc, ctx);
}
