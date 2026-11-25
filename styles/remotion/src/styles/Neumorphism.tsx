// 14. Neumorphism / soft-UI: grey-blue soft cards with dual shadows; items "press in" on cue; inset progress ring.
import React from 'react';
import { AbsoluteFill, spring, interpolate } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { SoftControls } from '../lib/Edges';
import { useT, Icon, Headline, tv, statText, clamp } from '../lib/util';

const BG = '#e3e9f2';
const out = (k = 1) => `${18 * k}px ${18 * k}px ${36 * k}px #b8c0cc, ${-18 * k}px ${-18 * k}px ${36 * k}px #ffffff`;
const inn = (k = 1) => `inset ${12 * k}px ${12 * k}px ${24 * k}px #b8c0cc, inset ${-12 * k}px ${-12 * k}px ${24 * k}px #ffffff`;
const Scene: React.FC<SceneProps> = ({ scene }) => {
  const { f, fps, t } = useT();
  const sp = (d: number) => spring({ frame: f - Math.round(d * fps), fps, config: { damping: 16, stiffness: 100 } });
  const prog = clamp(t / Math.max(0.5, scene.dur - 0.3));
  const items = scene.items || (scene.steps ? scene.steps.map((s) => s.label) : []);
  const R = 190, C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <div style={{ position: 'absolute', left: 70, right: 70, top: 260, padding: '50px 40px', borderRadius: 60, boxShadow: out(), opacity: sp(0) }}>
        <Headline text={scene.headline} style={{ fontFamily: F.heavy, fontWeight: 700, fontSize: 88, lineHeight: 1.1, color: '#4a5568' }} keyStyle={{ color: '#5b7cfa' }} />
      </div>
      <div style={{ position: 'absolute', left: 540 - 290, top: 540, width: 580, height: 580, borderRadius: '50%', boxShadow: out(1.1), display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.85 + 0.15 * sp(0.15)})` }}>
        <div style={{ width: 370, height: 370, borderRadius: '50%', boxShadow: inn(), display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg width={460} height={460} style={{ position: 'absolute', left: -45, top: -45, transform: 'rotate(-90deg)' }}>
            <circle cx={230} cy={230} r={R} fill="none" stroke="#5b7cfa" strokeWidth={14} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - prog)} opacity={0.85} />
          </svg>
          {scene.stat ? <div style={{ fontFamily: F.heavy, fontWeight: 800, fontSize: 110, color: '#4a5568' }}>{statText(scene.stat, clamp(sp(tv(scene, 0.2))))}</div>
            : <Icon name={scene.icon} size={200} color="#5b7cfa" stroke={2} />}
        </div>
      </div>
      {items.slice(0, 3).map((it, i) => {
        const at = tv(scene, 0.35 + i * 0.2);
        const pressed = t > at;
        const s = sp(at - 0.3);
        return <div key={i} style={{ position: 'absolute', left: 110, right: 110, top: 1320 + i * 140, height: 110, borderRadius: 40, boxShadow: pressed ? inn(0.7) : out(0.7), opacity: s,
          display: 'flex', alignItems: 'center', gap: 26, padding: '0 40px', fontFamily: F.sans, fontSize: 48, color: pressed ? '#5b7cfa' : '#4a5568' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', boxShadow: pressed ? inn(0.3) : out(0.3), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pressed ? <Icon name="check" size={30} color="#5b7cfa" stroke={3} /> : null}</div>{it}
        </div>;
      })}
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><SoftControls y={70} bg="#e3e9f2" accent="#5b7cfa" />{!(sc.items && sc.items.length) ? <SoftControls y={1400} bg="#e3e9f2" accent="#5b7cfa" /> : null}<SoftControls y={1720} bg="#e3e9f2" accent="#5b7cfa" /></AbsoluteFill>);
};
export const neumorphism: StyleDef = { Scene: Framed, transition: 'fade', captions: { font: F.heavy, weight: 700, size: 60, color: '#4a5568', key: '#5b7cfa', bg: '#e3e9f2', y: 1250 } };
