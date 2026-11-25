// 21. Retro pixel-art: the whole scene is drawn on a 180x320 canvas, quantised to a 16-colour palette and scaled 6x.
import React, { useEffect, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { useT, rand, plain, tv, statText } from '../lib/util';

const PAL = ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57'];
const RGB = PAL.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const near = (r: number, g: number, b: number) => { let bi = 0, bd = 1e9; RGB.forEach((c, i) => { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; bi = i; } }); return RGB[bi]; };
const PW = 180, PH = 320;
const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { t, f } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext('2d')!; c.imageSmoothingEnabled = false;
    // sky bands
    const sky = [['#29366f', '#3b5dc9', '#41a6f6'], ['#5d275d', '#b13e53', '#ef7d57'], ['#1a1c2c', '#333c57', '#566c86']][index % 3];
    sky.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 70, PW, 70); });
    c.fillStyle = sky[2]; c.fillRect(0, 210, PW, 110);
    // stars / clouds
    for (let i = 0; i < 18; i++) { c.fillStyle = '#f4f4f4'; if (rand(i + Math.floor(f / 8)) > 0.3) c.fillRect(Math.floor(rand(i) * PW), Math.floor(rand(i * 3) * 120), 1, 1); }
    const cx = ((t * 8) % (PW + 40)) - 20; c.fillStyle = '#f4f4f4'; c.fillRect(cx, 40, 22, 5); c.fillRect(cx + 4, 36, 12, 4);
    // mountains + ground
    c.fillStyle = '#257179'; for (let x = 0; x < PW; x++) { const h = 30 + Math.abs(((x + index * 30) % 60) - 30); c.fillRect(x, 230 - h, 1, h); }
    c.fillStyle = '#38b764'; c.fillRect(0, 230, PW, 90); c.fillStyle = '#a7f070'; for (let x = 0; x < PW; x += 6) c.fillRect(x, 230, 3, 2);
    for (let y = 262; y < PW * 2; y += 8) for (let x = ((y / 8) % 2) * 6; x < PW; x += 12) { c.fillStyle = y > 280 ? '#b13e53' : '#257179'; c.fillRect(x, y, 11, 7); c.fillStyle = '#5d275d'; c.fillRect(x, y + 7, 12, 1); }   // brick ground
    for (let i = 0; i < 9; i++) { const fx = Math.floor(rand(i * 5) * PW); c.fillStyle = ['#ffcd75', '#ef7d57', '#f4f4f4'][i % 3]; c.fillRect(fx, 244 + (i % 3) * 4, 2, 2); c.fillStyle = '#257179'; c.fillRect(fx, 246 + (i % 3) * 4, 1, 3); }
    for (let k = 0; k < 3; k++) { const cx2 = ((k * 70 + t * 4 * (k + 1)) % (PW + 40)) - 20; c.fillStyle = '#f4f4f4'; c.fillRect(cx2, 8 + k * 9, 18, 4); c.fillRect(cx2 + 4, 5 + k * 9, 9, 3); }
    // hero sprite: emoji drawn tiny, bobbing
    const bob = Math.round(Math.sin(t * 6) * 2); const jump = t > tv(scene, 0.4) && t < tv(scene, 0.4) + 0.5 ? -Math.round(Math.sin((t - tv(scene, 0.4)) / 0.5 * Math.PI) * 18) : 0;
    c.font = '40px "Apple Color Emoji"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(scene.emoji || '⭐', 90, 205 + bob + jump);
    // coin / stat block
    if (scene.stat) { c.fillStyle = '#ffcd75'; c.fillRect(130, 130, 22, 22); c.fillStyle = '#ef7d57'; c.fillRect(130, 150, 22, 2); c.fillStyle = '#1a1c2c'; c.font = 'bold 14px monospace'; c.fillText('?', 141, 142); }
    // quantise everything to the palette
    const img = c.getImageData(0, 0, PW, PH); const d = img.data;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 10) continue; const [r, g, b] = near(d[i], d[i + 1], d[i + 2]); d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    c.putImageData(img, 0, 0);
  });
  const full = plain(scene.headline);
  const shown = full.slice(0, Math.floor(t * 22));
  return (
    <AbsoluteFill style={{ background: '#1a1c2c' }}>
      <canvas ref={ref} width={PW} height={PH} style={{ width: 1080, height: 1920, imageRendering: 'pixelated' }} />
      {/* RPG dialogue box with pixel border */}
      <div style={{ position: 'absolute', left: 54, right: 54, top: 250, minHeight: 300, background: '#1a1c2c', border: '12px solid #f4f4f4', outline: '12px solid #1a1c2c', boxShadow: '0 0 0 24px #566c86',
        padding: '34px 40px', fontFamily: F.mono, fontWeight: 700, fontSize: 70, lineHeight: 1.25, color: '#f4f4f4', textTransform: 'uppercase', imageRendering: 'pixelated' }}>
        {shown}<span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0 }}>▼</span>
      </div>
      {scene.stat ? <div style={{ position: 'absolute', top: 650, right: 80, fontFamily: F.mono, fontWeight: 700, fontSize: 64, color: '#ffcd75', textShadow: '6px 6px 0 #1a1c2c', opacity: t > tv(scene, 0.4) ? 1 : 0 }}>+{statText(scene.stat)}</div> : null}
      <div style={{ position: 'absolute', top: 130, left: 60, fontFamily: F.mono, fontWeight: 700, fontSize: 44, color: '#ffcd75', textShadow: '4px 4px 0 #1a1c2c' }}>LV {index + 1}  ♥♥♥</div>
    </AbsoluteFill>
  );
};
export const pixelArt: StyleDef = { Scene, captions: { font: F.mono, weight: 700, size: 56, color: '#f4f4f4', key: '#ffcd75', bg: '#1a1c2c', radius: 0, y: 1560, upper: true } };
