// 1. Kinetic typography: the narration itself, word by word, huge and punchy. Colour blocks flip per scene.
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { Marquee } from '../lib/Edges';
import { useT, tokens, rand, clamp } from '../lib/util';

const PAL = [['#111111', '#ffffff', '#ffd400'], ['#ffd400', '#111111', '#e5383b'], ['#e5383b', '#ffffff', '#111111'], ['#1d3fff', '#ffffff', '#ffd400']];
const keyset = (h: string) => new Set(tokens(h).filter((x) => x.k).map((x) => x.t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')));

const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { t } = useT();
  const [bg, fg, ac] = PAL[index % PAL.length];
  const keys = keyset(scene.headline);
  // group words into lines of <= 3 words; show the line containing the current word
  const lines: number[][] = []; let cur: number[] = [];
  scene.words.forEach((w, i) => { cur.push(i); if (cur.length === 3 || /[.,!?।]$/.test(w.w) || i === scene.words.length - 1) { lines.push(cur); cur = []; } });
  let li = 0; lines.forEach((l, k) => { if (t >= scene.words[l[0]].s - 0.02) li = k; });
  const line = lines[li] || [];
  const lineStart = scene.words[line[0]]?.s ?? 0;
  const pop = interpolate(t - lineStart, [0, 0.18], [1.12, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3) });
  const lineIn = interpolate(t - lineStart, [0, 0.16], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
      {/* ghost of previous line, big and faint */}
      <div style={{ position: 'absolute', top: 260, left: 40, right: 40, fontFamily: F.heavy, fontWeight: 900, fontSize: 110, color: fg, opacity: 0.16, textTransform: 'uppercase', lineHeight: 1 }}>
        {(lines[li - 1] || []).map((i) => scene.words[i].w).join(' ')}
      </div>
      <div style={{ width: 960, marginTop: -260, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', transform: `scale(${pop}) rotate(${(rand(index * 7 + li) - 0.5) * 6}deg) translateY(${(1 - lineIn) * 40}px)`, opacity: index === 0 && li === 0 ? 1 : 0.2 + 0.8 * lineIn }}>
        {line.map((i) => {
          const w = scene.words[i]; const on = t >= w.s - 0.02 || (index === 0 && li === 0); // first frame = hook, for thumbnails
          const clean = w.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
          const isKey = keys.has(clean);
          const p = index === 0 && li === 0 ? 1 : clamp((t - w.s) / 0.15);
          const len = w.w.length;
          const size = Math.min(230, 1500 / Math.max(3, len));
          return (
            <div key={i} style={{ fontFamily: F.heavy, fontWeight: 900, fontSize: size, lineHeight: 0.98, textTransform: 'uppercase', letterSpacing: -2,
              color: isKey ? bg : fg, background: isKey ? ac : 'transparent', padding: isKey ? '0 18px' : 0, opacity: on ? 1 : 0,
              transform: `translateY(${(1 - p) * 60}px)` }}>{w.w.replace(/[,.!?।]+$/, '')}</div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 360, left: 0, right: 0, height: 14, background: ac, transformOrigin: 'left', transform: `scaleX(${clamp(t / scene.dur)})` }} />
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><Marquee y={40} size={150} words={words.slice(0, 8)} color={['#ffffff','#111111','#ffffff','#ffffff'][p.index % 4]} opacity={0.3} speed={70} /><Marquee y={1460} size={90} words={words.slice(0, 6)} color={['#ffd400','#e5383b','#111111','#ffd400'][p.index % 4]} opacity={0.35} speed={50} /><Marquee y={1330} size={120} words={words.slice(-8)} color={['#ffffff','#111111','#ffffff','#ffffff'][p.index % 4]} opacity={0.3} dir={-1} speed={40} /><Marquee y={1660} size={180} words={head} color={['#ffd400','#e5383b','#111111','#ffd400'][p.index % 4]} opacity={0.5} dir={-1} speed={55} /></AbsoluteFill>);
};
export const kinetic: StyleDef = { Scene: Framed, captions: false };
