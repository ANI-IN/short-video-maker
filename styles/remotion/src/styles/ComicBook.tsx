// 5. Comic-book panels: halftone page, panels slam in, yellow caption boxes, speech bubble, a POW burst.
import React from 'react';
import { AbsoluteFill, spring } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { useT, Icon, tokens, statText, tv, plain } from '../lib/util';

const SFX = ['POW!', 'BAM!', 'ZAP!', 'WOW!', 'BOOM!'];
const Panel: React.FC<{ x: number; y: number; w: number; h: number; at: number; bg: string; children?: React.ReactNode; rot?: number }> = ({ x, y, w, h, at, bg, children, rot = 0 }) => {
  const { f, fps } = useT();
  const s = at < 0 ? 1 : spring({ frame: f - Math.round(at * fps), fps, config: { damping: 11, stiffness: 180 } });
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: bg, border: '10px solid #111', boxShadow: '14px 14px 0 #111', overflow: 'hidden',
    transform: `scale(${0.6 + 0.4 * s}) rotate(${rot}deg)`, opacity: s > 0.02 ? 1 : 0 }}>{children}</div>;
};
const Burst: React.FC<{ text: string; at: number; x: number; y: number; scale?: number }> = ({ text, at, x, y, scale = 1 }) => {
  const { f, fps } = useT();
  const s = spring({ frame: f - Math.round(at * fps), fps, config: { damping: 8, stiffness: 200 } });
  const pts = Array.from({ length: 24 }, (_, i) => { const r = i % 2 ? 120 : 200; const a = (i / 24) * Math.PI * 2; return `${200 + r * Math.cos(a)},${200 + r * Math.sin(a)}`; }).join(' ');
  return <div style={{ position: 'absolute', left: x - 200, top: y - 200, width: 400, height: 400, transform: `scale(${s * scale}) rotate(-12deg)` }}>
    <svg width={400} height={400}><polygon points={pts} fill="#ffdd00" stroke="#111" strokeWidth={8} /></svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.impact, fontSize: 96, color: '#e5383b', WebkitTextStroke: '5px #111', paintOrder: 'stroke fill' }}>{text}</div>
  </div>;
};
const DEVA = /[\u0900-\u097F]/;
const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { t, f, fps } = useT();
  const hi = DEVA.test(scene.headline);
  // slow push-in + a small camera bump on each beat keeps long scenes moving
  const beats = [0.15, 0.35, 0.45, 0.7].map((k) => tv(scene, k));
  const bump = beats.reduce((a, b) => a + Math.max(0, 1 - Math.abs(t - b) / 0.18) * 0.025, 0);
  const zoom = 1 + Math.min(1, t / Math.max(1, scene.dur)) * 0.06 + bump;
  const half = 'radial-gradient(#00000022 22%, transparent 24%) 0 0/22px 22px';
  return (
    <AbsoluteFill style={{ background: `${half}, #f6f0dc`, transform: `scale(${zoom})`, transformOrigin: '50% 40%' }}>
      <Panel x={60} y={200} w={960} h={380} at={index === 0 ? -1 : 0} bg="#fff">
        <div style={{ position: 'absolute', left: 0, top: 0, background: '#ffe14d', borderRight: '8px solid #111', borderBottom: '8px solid #111', padding: '10px 22px', fontFamily: F.comic, fontWeight: 700, fontSize: 40, textTransform: 'uppercase' }}>
          {index === 0 ? 'Meanwhile…' : `Part ${index + 1}`}
        </div>
        <div style={{ position: 'absolute', top: 90, left: 30, right: 30, display: 'flex', flexWrap: 'wrap', gap: '0 18px', justifyContent: 'center' }}>
          {tokens(scene.headline).map((w, i) => <span key={i} style={{ fontFamily: F.impact, fontWeight: hi ? 700 : 400, fontSize: hi ? 96 : 104, lineHeight: 1.08, textTransform: 'uppercase', color: w.k ? '#e5383b' : '#111', WebkitTextStroke: w.k ? '3px #111' : undefined }}>{w.t}</span>)}
        </div>
      </Panel>
      <Panel x={60} y={640} w={560} h={560} at={tv(scene, 0.15)} bg="#4dabf7" rot={-1.5}>
        <AbsoluteFill style={{ background: 'repeating-conic-gradient(from 0deg at 50% 50%, #ffffff55 0deg 6deg, transparent 6deg 18deg)' }} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          {scene.emoji ? <div style={{ fontSize: 300 }}>{scene.emoji}</div> : <Icon name={scene.icon} size={300} color="#111" stroke={2.5} />}
        </AbsoluteFill>
      </Panel>
      <Panel x={660} y={640} w={360} h={560} at={tv(scene, 0.35)} bg="#ff8787" rot={1.5}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', border: '6px solid #111', borderRadius: 40, padding: '24px 20px', fontFamily: F.comic, fontWeight: 700, fontSize: 52, textAlign: 'center', lineHeight: 1.15 }}>
            {scene.stat ? <>{statText(scene.stat)}{scene.stat.label ? <div style={{ fontSize: 40, marginTop: 10, opacity: t > tv(scene, 0.7) ? 1 : 0 }}>{scene.stat.label}</div> : null}</>
              : scene.items ? scene.items.slice(0, 3).map((it, k) => <div key={k} style={{ opacity: t > tv(scene, 0.35 + k * 0.3) ? 1 : 0, marginTop: k ? 12 : 0 }}>{it}</div>)
              : plain(scene.headline).split(' ').slice(-2).join(' ') + '!'}
          </div>
        </AbsoluteFill>
      </Panel>
      <Burst text={SFX[index % SFX.length]} at={tv(scene, 0.45)} x={880} y={1190} scale={0.7} />
    </AbsoluteFill>
  );
};
export const comic: StyleDef = { Scene, captions: { font: F.comic, weight: 700, size: 60, color: '#111', key: '#e5383b', bg: '#ffe14d', radius: 0, y: 1400, upper: true } };
