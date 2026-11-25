// 4. Neon glow: tube-light text that flickers on, a neon frame that draws itself, glowing outline icon on a dark brick wall.
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { NeonSkyline, Marquee } from '../lib/Edges';
import { useT, rand, Icon, tokens, statText, tv } from '../lib/util';

const COLS = [['#ff2bd6', '#2bf3ff'], ['#2bf3ff', '#fff22b'], ['#7cff2b', '#ff2bd6']];
const glow = (c: string, k = 1) => `0 0 ${6 * k}px #fff, 0 0 ${14 * k}px ${c}, 0 0 ${30 * k}px ${c}, 0 0 ${60 * k}px ${c}, 0 0 ${100 * k}px ${c}`;

const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { t } = useT();
  const [a, b] = COLS[index % COLS.length];
  // flicker on at start
  const flick = t < 0.6 ? (rand(Math.floor(t * 30) + index) > 0.45 ? 1 : 0.15) : (rand(Math.floor(t * 10) + 5) > 0.97 ? 0.4 : 1);
  const draw = interpolate(t, [0, 1.0], [0, 1], { extrapolateRight: 'clamp' });
  const per = 2 * (900 + 980);
  const iconOn = t > tv(scene, 0.2);
  return (
    <AbsoluteFill style={{ background: '#0b0710' }}>
      <AbsoluteFill style={{ opacity: 0.22, backgroundImage: 'linear-gradient(#000 4px, transparent 4px), linear-gradient(90deg, #000 4px, transparent 4px)', backgroundSize: '120px 60px', backgroundColor: '#3a1f2a' }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${a}33, transparent 60%)` }} />
      <svg width={1080} height={1920} style={{ position: 'absolute' }}>
        <rect x={90} y={230} width={900} height={980} rx={40} fill="none" stroke={b} strokeWidth={8} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} style={{ filter: `drop-shadow(0 0 12px ${b}) drop-shadow(0 0 30px ${b})` }} />
      </svg>
      <div style={{ position: 'absolute', top: 300, left: 120, right: 120, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 24px', opacity: flick }}>
        {tokens(scene.headline).map((w, i) => (
          <span key={i} style={{ fontFamily: F.hand, fontWeight: 700, fontSize: 118, lineHeight: 1.1, color: '#fff', textShadow: glow(w.k ? b : a) }}>{w.t}</span>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: iconOn ? 1 : 0, filter: `drop-shadow(0 0 8px ${a}) drop-shadow(0 0 24px ${a}) drop-shadow(0 0 50px ${a})` }}>
        <Icon name={scene.icon} size={360} color="#ffe9fb" stroke={1.6} />
      </div>
      {scene.stat ? <div style={{ position: 'absolute', top: 1260, left: 0, right: 0, textAlign: 'center', fontFamily: F.sans, fontSize: 80, color: '#fff', textShadow: glow(b, 0.8), opacity: t > tv(scene, 0.5) ? 1 : 0 }}>{statText(scene.stat)}</div> : null}
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><NeonSkyline y={1640} color={['#ff2bd6','#2bf3ff','#7cff2b'][p.index % 3]} color2={['#2bf3ff','#fff22b','#ff2bd6'][p.index % 3]} /><Marquee y={70} size={110} words={head} color={['#2bf3ff','#fff22b','#ff2bd6'][p.index % 3]} opacity={0.35} speed={40} /></AbsoluteFill>);
};
export const neon: StyleDef = { Scene: Framed, transition: 'fade', captions: { font: F.sans, size: 66, color: '#fff', key: '#2bf3ff', stroke: '#2a0a33', y: 1480 } };
