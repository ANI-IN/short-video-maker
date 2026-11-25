// 10. Paper cutout / collage: kraft board, torn-paper scraps, ransom-note words, tape, stop-motion (12 fps) movement.
import React from 'react';
import { AbsoluteFill, spring } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { TornBand } from '../lib/Edges';
import { useT, rand, tokens, Icon, statText, tv } from '../lib/util';

const torn = (seed: number) => { const pts: string[] = []; const n = 14;
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${rand(seed + i) * 5}%`);
  for (let i = 0; i <= n; i++) pts.push(`${100 - rand(seed + 40 + i) * 4}% ${(i / n) * 100}%`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n) * 100}% ${100 - rand(seed + 80 + i) * 5}%`);
  for (let i = n; i >= 0; i--) pts.push(`${rand(seed + 120 + i) * 4}% ${(i / n) * 100}%`);
  return `polygon(${pts.join(',')})`; };
const PAPERS = ['#fffdf5', '#ffd6a5', '#caffbf', '#9bf6ff', '#ffc6ff', '#fdffb6'];
const FONTS = [F.serif, F.impact, F.typewriter, F.hand, F.heavy];
const useStop = () => { const { f, fps } = useT(); const sf = Math.floor(f / 2) * 2; return { sf, fps, st: sf / fps }; };
const Scrap: React.FC<{ at: number; seed: number; style: React.CSSProperties; children?: React.ReactNode; from?: number }> = ({ at, seed, style, children, from = 1 }) => {
  const { sf, fps } = useStop();
  const s = spring({ frame: sf - Math.round(at * fps), fps, config: { damping: 14, stiffness: 120 } });
  const wob = (rand(Math.floor(sf / 4) + seed) - 0.5) * 1.6; // stop-motion jitter
  return <div style={{ position: 'absolute', clipPath: torn(seed), filter: 'drop-shadow(6px 8px 0 rgba(0,0,0,0.25))', opacity: s > 0.02 ? 1 : 0,
    transform: `translate(${(1 - s) * 700 * from}px, ${(1 - s) * -80}px) rotate(${(rand(seed) - 0.5) * 8 + wob}deg)`, ...style }}>{children}</div>;
};
const Tape: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => <div style={{ position: 'absolute', left: x, top: y, width: 170, height: 52, background: 'rgba(255,244,200,0.75)', transform: `rotate(${r}deg)`, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />;

const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const toks = tokens(scene.headline);
  return (
    <AbsoluteFill style={{ background: '#c69c6d', backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '7px 7px, 11px 11px' }}>
      <div style={{ position: 'absolute', top: 250, left: 50, right: 50, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18 }}>
        {toks.map((w, i) => (
          <Scrap key={i} at={0.05 + i * 0.12} seed={index * 50 + i} from={i % 2 ? 1 : -1} style={{ position: 'relative', background: w.k ? '#e63946' : PAPERS[(i + index) % PAPERS.length], padding: '14px 26px' }}>
            <span style={{ fontFamily: FONTS[(i + index) % FONTS.length], fontWeight: 800, fontSize: 96, color: w.k ? '#fff' : '#1b1b1b', textTransform: i % 3 === 1 ? 'uppercase' : 'none' }}>{w.t}</span>
          </Scrap>
        ))}
      </div>
      <Scrap at={tv(scene, 0.15)} seed={index * 9 + 300} style={{ left: 110, top: 620, width: 860, height: 760, background: '#fffdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {scene.emoji ? <div style={{ fontSize: 440 }}>{scene.emoji}</div> : <Icon name={scene.icon} size={340} color="#1b1b1b" />}
      </Scrap>
      <Tape x={100} y={600} r={-18} /><Tape x={840} y={610} r={14} />
      {scene.stat ? <Scrap at={tv(scene, 0.45)} seed={index + 700} style={{ left: 600, top: 1400, background: '#fdffb6', padding: '16px 34px' }}>
        <span style={{ fontFamily: F.typewriter, fontSize: 78, fontWeight: 700 }}>{statText(scene.stat)}</span></Scrap> : null}
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><TornBand y={0} h={230} color="#fdffb6" top seed={p.index * 7 + 2} /><TornBand y={1440} h={110} color="#ffd6a5" seed={p.index * 11 + 1} /><TornBand y={1590} h={340} color="#80b918" seed={p.index * 5 + 9} /><TornBand y={1700} h={240} color="#2b9348" seed={p.index * 3 + 4} /></AbsoluteFill>);
};
export const paperCutout: StyleDef = { Scene: Framed, captions: { font: F.typewriter, weight: 700, size: 60, color: '#1b1b1b', key: '#e63946', bg: '#fffdf5', radius: 4, y: 1560 } };
