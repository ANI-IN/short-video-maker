// 15. Particle / dot-matrix reveal: thousands of dots fly in from noise and lock into the headline and icon/emoji.
import React, { useEffect, useMemo, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { useT, rand, plain, clamp, tv } from '../lib/util';

type Pt = { x: number; y: number; c: string };
// Rasterise text/emoji to target dot positions (sampled on a grid).
const sample = (draw: (c: CanvasRenderingContext2D) => void, step: number, color: (x: number, y: number, d: Uint8ClampedArray, i: number) => string | null) => {
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920; const c = cv.getContext('2d')!; draw(c);
  const d = c.getImageData(0, 0, 1080, 1920).data; const pts: Pt[] = [];
  for (let y = 0; y < 1920; y += step) for (let x = 0; x < 1080; x += step) { const i = (y * 1080 + x) * 4; if (d[i + 3] > 128) { const col = color(x, y, d, i); if (col) pts.push({ x, y, c: col }); } }
  return pts;
};
const wrap = (c: CanvasRenderingContext2D, text: string, maxW: number) => { const words = text.split(' '); const lines: string[] = []; let cur = '';
  words.forEach((w) => { const tst = cur ? cur + ' ' + w : w; if (c.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }); if (cur) lines.push(cur); return lines; };

const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const pts = useMemo(() => {
    const keyWords = new Set((scene.headline.match(/\*([^*]+)\*/g) || []).join(' ').replace(/\*/g, '').split(' '));
    const text = sample((c) => {
      c.font = `900 124px ${F.heavy}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
      wrap(c, plain(scene.headline).toUpperCase(), 940).forEach((l, i) => c.fillText(l, 540, 380 + i * 135));
    }, 9, () => '#e9fbff');
    const pic = sample((c) => {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (scene.emoji) { c.font = '620px "Apple Color Emoji"'; c.fillText(scene.emoji, 540, 1030); }
      else { c.fillStyle = '#4cc9f0'; c.beginPath(); c.arc(540, 1000, 200, 0, 7); c.fill(); }
    }, 12, (x, y, d, i) => `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`);
    return { text, pic, keyWords };
  }, [scene.headline, scene.emoji]);
  useEffect(() => {
    const c = ref.current!.getContext('2d')!; c.clearRect(0, 0, 1080, 1920);
    // idle dot-matrix field
    for (let y = 20; y < 1920; y += 36) for (let x = 20; x < 1080; x += 36) { const w = 0.5 + 0.5 * Math.sin(x * 0.012 + y * 0.008 - t * 2.2); c.fillStyle = `rgba(76,201,240,${(y < 320 || y > 1560 ? 1.6 : 1) * (0.2 + 0.55 * w * w)})`; c.fillRect(x - 1, y - 1, 4 + 2 * w, 4 + 2 * w); }
    const draw = (arr: Pt[], start: number, dur: number, r: number, seed: number) => arr.forEach((p, i) => {
      const delay = rand(i * 1.3 + seed) * 0.5; const k = clamp((t - start - delay) / dur); const e = 1 - Math.pow(1 - k, 3);
      if (k <= 0) return;
      const sx = rand(i + seed) * 1080, sy = rand(i * 7 + seed) * 1920;
      const x = sx + (p.x - sx) * e + Math.sin(t * 3 + i) * (1 - e) * 30, y = sy + (p.y - sy) * e;
      c.globalAlpha = 0.25 + 0.75 * e; c.fillStyle = p.c; c.beginPath(); c.arc(x, y, r * (0.6 + 0.4 * e), 0, 7); c.fill();
    });
    // lower band: a dot-matrix "signal" wave that breathes with time, so the bottom third is part of the picture
    for (let x = 30; x < 1080; x += 26) {
      const amp = 70 + 50 * Math.sin(x * 0.006 + t * 0.9);
      const h = Math.abs(Math.sin(x * 0.021 + t * 2.4)) * amp + 16;
      for (let y = -h; y <= h; y += 22) { const a = 1 - Math.abs(y) / (h + 1); c.fillStyle = `rgba(76,201,240,${0.25 + 0.6 * a})`; c.beginPath(); c.arc(x, 1760 + y, 4.5, 0, 7); c.fill(); }
      const h2 = h * 0.55;   // a thinner echo of the wave across the top band (above the headline)
      for (let y = -h2; y <= h2; y += 22) { const a = 1 - Math.abs(y) / (h2 + 1); c.fillStyle = `rgba(76,201,240,${0.2 + 0.5 * a})`; c.beginPath(); c.arc(1080 - x, 150 + y, 4, 0, 7); c.fill(); }
    }
    draw(pts.text, index === 0 ? -2 : 0, 0.9, 4.2, index * 100);   // hook: already formed on frame 0 (thumbnail)
    draw(pts.pic, tv(scene, 0.15), 1.0, 5.4, index * 100 + 50);
    c.globalAlpha = 1;
  });
  return <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 45%, #0b2239 0%, #02060d 70%)' }}><canvas ref={ref} width={1080} height={1920} /></AbsoluteFill>;
};
export const particles: StyleDef = { Scene, captions: { font: F.mono, weight: 700, size: 58, color: '#e9fbff', key: '#4cc9f0', stroke: '#02060d', y: 1520 } };
