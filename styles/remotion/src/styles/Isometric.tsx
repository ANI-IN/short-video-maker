// 12. Isometric icon animation: an iso grid floor, blocks rise out of it, the icon sits on the top face.
import React from 'react';
import { AbsoluteFill, spring } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { useT, Icon, Headline, tv, statText } from '../lib/util';

const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
const iso = (x: number, y: number, z: number, ox: number, oy: number) => [ox + (x - y) * C30, oy + (x + y) * S30 - z];
const Block: React.FC<{ gx: number; gy: number; size: number; h: number; color: string[]; ox: number; oy: number }> = ({ gx, gy, size: s, h, color, ox, oy }) => {
  const P = (x: number, y: number, z: number) => iso(gx + x, gy + y, z, ox, oy).join(',');
  return <g>
    <polygon points={[P(0, s, 0), P(s, s, 0), P(s, s, h), P(0, s, h)].join(' ')} fill={color[1]} />
    <polygon points={[P(s, 0, 0), P(s, s, 0), P(s, s, h), P(s, 0, h)].join(' ')} fill={color[2]} />
    <polygon points={[P(0, 0, h), P(s, 0, h), P(s, s, h), P(0, s, h)].join(' ')} fill={color[0]} />
  </g>;
};
const COL = [['#7ee0ff', '#3aa6d8', '#1f6f96'], ['#ffd27e', '#e09a3a', '#a8661c'], ['#b4f08a', '#6bbf44', '#3f8a24'], ['#ff9ec7', '#e05a93', '#a32d63']];
const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { f, fps } = useT();
  const sp = (d: number) => spring({ frame: f - Math.round(d * fps), fps, config: { damping: 14, stiffness: 90 } });
  const ox = 540, oy = 930;
  const vals = scene.chart?.items?.map((x) => x.value) || (scene.items ? scene.items.map((_, i) => 60 + i * 50) : [80, 140, 110]);
  const mx = Math.max(...vals);
  const grid: JSX.Element[] = [];
  for (let i = -16; i <= 16; i++) { const a = iso(i * 90, -1440, 0, ox, oy), b = iso(i * 90, 1440, 0, ox, oy), c = iso(-1440, i * 90, 0, ox, oy), d = iso(1440, i * 90, 0, ox, oy);   // grid runs edge to edge
    grid.push(<line key={'a' + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#ffffff40" strokeWidth={2} />, <line key={'b' + i} x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} stroke="#ffffff40" strokeWidth={2} />); }
  const main = sp(tv(scene, 0.05));
  const top = iso(-80 + 80, -80 + 80, 230 * main, ox, oy);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1b1f3b 0%, #2d3561 100%)' }}>
      <svg width={1080} height={1920} style={{ position: 'absolute' }}>
        {grid}
        {[0, 1, 2, 3].map((k) => <Block key={'f' + k} gx={-60} gy={-60} size={70} h={70} color={COL[(k + 2) % 4]} ox={130 + k * 270} oy={150 + Math.sin(f / 30 + k) * 16 + (k % 2) * 40} />)}
        {[0, 1, 2, 3].map((k) => <Block key={'m' + k} gx={-40} gy={-40} size={80} h={30 + ((k * 37) % 90)} color={COL[(k + 1) % 4]} ox={150 + k * 250} oy={1400 + (k % 2) * 60} />)}
        {[0, 1, 2].map((k) => <Block key={'b' + k} gx={-50} gy={-50} size={90} h={40 + k * 30} color={COL[k % 4]} ox={200 + k * 340} oy={1760} />)}
        {vals.slice(0, 4).map((v, i) => { const s = sp(tv(scene, 0.3 + i * 0.15)); return <Block key={i} gx={-360 + i * 0} gy={-340 + i * 170} size={110} h={Math.max(2, (v / mx) * 260 * s)} color={COL[(i + 1) % 4]} ox={ox + 340} oy={oy + 60} />; })}
        <Block gx={-80} gy={-80} size={160} h={Math.max(2, 230 * main)} color={COL[index % 4]} ox={ox} oy={oy} />
      </svg>
      {/* icon lies on the top face via an iso transform */}
      <div style={{ position: 'absolute', left: top[0] - 110, top: top[1] - 110 + 0, width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: main,
        transform: 'rotateX(60deg) rotateZ(45deg)', transformOrigin: 'center' }}>
        <Icon name={scene.icon} size={150} color="#ffffff" stroke={2.4} />
      </div>
      <Headline text={scene.headline} style={{ position: 'absolute', top: 260, left: 60, right: 60, fontFamily: F.heavy, fontWeight: 800, fontSize: 96, color: '#fff', lineHeight: 1.05 }} keyStyle={{ color: '#7ee0ff' }} />
      {scene.stat ? <div style={{ position: 'absolute', top: 1330, left: 80, fontFamily: F.sans, fontSize: 84, color: '#ffd27e' }}>{statText(scene.stat)} <span style={{ fontSize: 48, color: '#fff' }}>{scene.stat.label}</span></div> : null}
    </AbsoluteFill>
  );
};
export const isometric: StyleDef = { Scene, captions: { font: F.heavy, size: 64, color: '#fff', key: '#7ee0ff', stroke: '#11142a', y: 1560 } };
