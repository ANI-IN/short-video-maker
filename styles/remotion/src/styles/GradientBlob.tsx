// 13. Gradient blob morphing background: blurred colour blobs drift and morph behind a frosted-glass card.
import React from 'react';
import { AbsoluteFill, spring } from 'remotion';
import type { SceneProps, StyleDef, VideoProps } from '../lib/types';
import { F } from '../lib/fonts';
import { useT, Headline, statText, tv, Icon } from '../lib/util';

const blobPath = (cx: number, cy: number, r: number, t: number, seed: number) => {
  const n = 8; const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; const rr = r * (1 + 0.18 * Math.sin(t * 1.3 + i * 1.7 + seed) + 0.1 * Math.cos(t * 2.1 + i * 2.3 + seed)); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; });
  let d = `M ${(pts[0][0] + pts[1][0]) / 2} ${(pts[0][1] + pts[1][1]) / 2}`;
  for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[(i + 1) % n]; d += ` Q ${p[0]} ${p[1]} ${(p[0] + q[0]) / 2} ${(p[1] + q[1]) / 2}`; }
  return d + ' Z';
};
const Background: React.FC<{ props: VideoProps }> = () => {
  const { t } = useT();
  const B = [['#845ef7', 820, 120, 330], ['#ff5f6d', 240, 420, 320], ['#ffc371', 860, 820, 300], ['#22d3ee', 260, 1240, 340], ['#ffc371', 820, 1560, 300], ['#845ef7', 220, 1860, 300]] as const;
  return <AbsoluteFill style={{ background: '#120b2e' }}>
    <svg width={1080} height={1920} style={{ position: 'absolute' }}>   {/* crisp liquid shapes (no blur): gradient fills give the depth */}
      <defs>{B.map(([c], i) => <radialGradient key={i} id={`bl${i}`} cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#ffffff" stopOpacity={0.55} /><stop offset="0.35" stopColor={c} /><stop offset="1" stopColor={c} stopOpacity={0.75} /></radialGradient>)}</defs>
      {B.map(([c, x, y, r], i) => <path key={i} d={blobPath(x + Math.sin(t * 0.6 + i) * 140, y + Math.cos(t * 0.5 + i * 2) * 160, r, t, i * 3)} fill={`url(#bl${i})`} stroke="rgba(255,255,255,0.35)" strokeWidth={3} />)}
    </svg>
  </AbsoluteFill>;
};
const Scene: React.FC<SceneProps> = ({ scene }) => {
  const { f, fps } = useT();
  const s = spring({ frame: f, fps, config: { damping: 15, stiffness: 110 } });
  const s2 = spring({ frame: f - Math.round(tv(scene, 0.3) * fps), fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 330, padding: '70px 50px', borderRadius: 56, background: 'rgba(20,12,46,0.55)', border: '2px solid rgba(255,255,255,0.45)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.25)', transform: `translateY(${(1 - s) * 120}px) scale(${0.9 + 0.1 * s})`, opacity: s }}>
        <Headline text={scene.headline} style={{ fontFamily: F.heavy, fontWeight: 800, fontSize: 104, lineHeight: 1.05, color: '#fff' }} keyStyle={{ background: 'linear-gradient(90deg,#ffc371,#ff5f6d)', WebkitBackgroundClip: 'text', color: 'transparent' }} />
      </div>
      <div style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${s2})` }}>
        {scene.stat ? <div style={{ fontFamily: F.heavy, fontWeight: 900, fontSize: 200, color: '#fff', textShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>{statText(scene.stat, Math.min(1, s2 * 1.05))}</div>
          : <div style={{ width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={scene.icon} size={200} color="#fff" /></div>}
      </div>
      {scene.stat?.label ? <div style={{ position: 'absolute', top: 960, left: 0, right: 0, textAlign: 'center', fontFamily: F.sans, fontSize: 60, color: '#fff', opacity: s2 }}>{scene.stat.label}</div> : null}
    </AbsoluteFill>
  );
};
export const gradientBlob: StyleDef = { Scene, Background, transition: 'fade', captions: { font: F.heavy, size: 66, color: '#fff', key: '#ffc371', bg: 'rgba(0,0,0,0.25)', y: 1500 } };
