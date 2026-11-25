// 11. Flat 2D icon motion: pastel field, big geometric shapes slide in, icon bounces in a circle, chips orbit.
import React from 'react';
import { AbsoluteFill, spring, interpolate } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { ShapesBand } from '../lib/Edges';
import { useT, Icon, Headline, tv, statText } from '../lib/util';

const PAL = [['#ffe8d6', '#ff7b54', '#2b2d42', '#ffd166'], ['#e0f4ff', '#3a86ff', '#1d3557', '#8ecae6'], ['#eafbea', '#2a9d8f', '#264653', '#e9c46a']];
const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { f, fps, t } = useT();
  const [bg, main, ink, acc] = PAL[index % PAL.length];
  const sp = (d: number, cfg: any = { damping: 10, stiffness: 120 }) => spring({ frame: f - Math.round(d * fps), fps, config: cfg });
  const ic = sp(tv(scene, 0.05), { damping: 7, stiffness: 160 });
  const chips = scene.items || (scene.stat ? [statText(scene.stat), scene.stat.label || ''] : []);
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: acc, left: -300 + (1 - sp(0)) * -400, top: 1100 }} />
      <div style={{ position: 'absolute', width: 420, height: 420, background: main, opacity: 0.25, right: -80, top: 120 + (1 - sp(0.1)) * -500, transform: `rotate(${20 + t * 12}deg)`, borderRadius: 40 }} />
      <div style={{ position: 'absolute', width: 0, height: 0, borderLeft: '120px solid transparent', borderRight: '120px solid transparent', borderBottom: `200px solid ${ink}`, opacity: 0.15, left: 80, top: 1000, transform: `rotate(${-t * 20}deg)` }} />
      <Headline text={scene.headline} style={{ position: 'absolute', top: 270, left: 70, right: 70, fontFamily: F.heavy, fontWeight: 800, fontSize: 100, lineHeight: 1.05, color: ink }}
        keyStyle={{ color: main }} wordStyle={(i) => ({ transform: `translateY(${(1 - sp(i * 0.06)) * 80}px)`, opacity: sp(i * 0.06) })} />
      <div style={{ position: 'absolute', left: 540 - 300, top: 640, width: 600, height: 600, borderRadius: '50%', background: main, transform: `scale(${ic})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 30px 0 ${ink}22` }}>
        <Icon name={scene.icon} size={330} color="#fff" stroke={2.2} style={{ transform: `rotate(${interpolate(ic, [0, 1], [-30, 0])}deg)` }} />
      </div>
      {/* chips orbit inside y 525-1335 (a 3-line chip included): never into the caption zone, which starts ~1450 */}
      {chips.filter(Boolean).slice(0, 3).map((c, i) => {
        const s = sp(tv(scene, 0.3 + i * 0.2));
        const ang = (-90 + i * 120 + t * 10) * Math.PI / 180;
        return <div key={i} style={{ position: 'absolute', left: 540 + Math.cos(ang) * 380 - 180, top: 900 + Math.sin(ang) * 330 - 45, width: 360, transform: `scale(${s})`, background: '#fff', color: ink, borderRadius: 999, padding: '18px 10px', textAlign: 'center', fontFamily: F.sans, fontSize: 44, boxShadow: '0 10px 0 rgba(0,0,0,0.1)' }}>{c}</div>;
      })}
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><ShapesBand y={0} h={260} colors={[['#ff7b54','#ffd166','#2b2d42'],['#3a86ff','#8ecae6','#1d3557'],['#2a9d8f','#e9c46a','#264653']][p.index % 3]} seed={p.index + 2} /><ShapesBand y={1580} h={340} colors={[['#ffd166','#ff7b54','#2b2d42'],['#8ecae6','#3a86ff','#1d3557'],['#e9c46a','#2a9d8f','#264653']][p.index % 3]} seed={p.index + 9} /></AbsoluteFill>);
};
export const flatIcons: StyleDef = { Scene: Framed, captions: { font: F.heavy, size: 68, color: '#fff', key: '#ffd166', stroke: '#2b2d42', y: 1520 } };
