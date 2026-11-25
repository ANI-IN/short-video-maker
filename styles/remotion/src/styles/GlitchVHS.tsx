// 3. Glitch / VHS: RGB-split text, slice displacement on glitch frames, scanlines, tracking noise, a REC/PLAY OSD.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SceneProps, StyleDef, VideoProps } from '../lib/types';
import { F } from '../lib/fonts';
import { Marquee, SmpteBars } from '../lib/Edges';
import { useT, rand, plain, Icon, statText } from '../lib/util';

const Split: React.FC<{ text: string; size: number; t: number; seed: number; font?: string }> = ({ text, size, t, seed, font = F.impact }) => {
  const g = rand(Math.floor(t * 12) + seed) > 0.78; // glitch frame?
  const dx = g ? 10 + rand(t * 99) * 18 : 4;
  const base: React.CSSProperties = { position: 'absolute', inset: 0, fontFamily: font, fontSize: size, lineHeight: 1, textTransform: 'uppercase', textAlign: 'center', mixBlendMode: 'screen' };
  return (
    <div style={{ position: 'relative', width: '100%', height: size * 2.3 }}>
      <div style={{ ...base, color: '#ff004c', transform: `translateX(${-dx}px)` }}>{text}</div>
      <div style={{ ...base, color: '#00f0ff', transform: `translateX(${dx}px)` }}>{text}</div>
      <div style={{ ...base, color: '#ffffff', mixBlendMode: 'normal', clipPath: g ? `inset(${rand(t * 7) * 60}% 0 ${rand(t * 3) * 30}% 0)` : undefined, transform: g ? `translateX(${(rand(t * 5) - 0.5) * 40}px)` : undefined }}>{text}</div>
    </div>
  );
};

const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { t } = useT();
  const shake = rand(Math.floor(t * 12) + index * 31) > 0.85 ? (rand(t) - 0.5) * 30 : 0;
  const glitchIn = t < 0.25;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, #1a1030 0%, #05020a 75%)', transform: `translateX(${shake}px)`, filter: glitchIn ? 'hue-rotate(90deg) saturate(3)' : undefined }}>
      <div style={{ position: 'absolute', top: 300, left: 40, right: 40 }}>
        <Split text={plain(scene.headline)} size={plain(scene.headline).length > 18 ? 118 : 150} t={t} seed={index * 13} />
      </div>
      <div style={{ position: 'absolute', top: 520, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', filter: 'drop-shadow(10px 0 0 #ff004c) drop-shadow(-10px 0 0 #00f0ff)' }}>
          {scene.emoji ? <div style={{ fontSize: 420 }}>{scene.emoji}</div> : <Icon name={scene.icon} size={420} color="#fff" />}
        </div>
      </div>
      {/* audio scope across the lower middle: a VHS-era waveform that jitters with the narration */}
      <svg width={1080} height={260} style={{ position: 'absolute', top: 1250, left: 0 }}>
        {[0, 1].map((k) => <path key={k} d={'M 0 130 ' + Array.from({ length: 72 }, (_, i) => { const x = i * 15 + 15; const a = Math.sin(i * 0.55 + t * 9 + k) * Math.sin(i * 0.13 + t * 2) * (scene.words.some((w) => t >= w.s && t < w.e) ? 95 : 25); return `L ${x} ${130 + a}`; }).join(' ')}
          fill="none" stroke={k ? '#ff004c' : '#00f0ff'} strokeWidth={4} opacity={0.85} transform={`translate(${k ? 5 : -5},0)`} />)}
        <line x1={0} x2={1080} y1={130} y2={130} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
      </svg>
      {scene.stat ? <div style={{ position: 'absolute', top: 1050, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 64, color: '#00f0ff' }}>{`> ${statText(scene.stat)} ${scene.stat.label || ''}`}</div> : null}
    </AbsoluteFill>
  );
};

const Overlay: React.FC<{ props: VideoProps }> = () => {
  const { t, f } = useT();
  const band = (t * 260) % 2200 - 200;
  const secs = Math.floor(t); const ss = String(secs % 60).padStart(2, '0');
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 5px)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: band, height: 70, background: 'linear-gradient(transparent, rgba(255,255,255,0.13), transparent)', filter: 'blur(2px)' }} />
      {Array.from({ length: 40 }).map((_, i) => <div key={i} style={{ position: 'absolute', left: rand(f * 3 + i) * 1080, top: rand(f * 7 + i * 3) * 1920, width: 2 + rand(i + f) * 40, height: 2, background: 'rgba(255,255,255,0.5)' }} />)}
      <div style={{ position: 'absolute', top: 120, left: 70, fontFamily: F.mono, fontSize: 46, color: '#fff', textShadow: '3px 0 #ff004c, -3px 0 #00f0ff' }}>PLAY ▶</div>
      <div style={{ position: 'absolute', top: 120, right: 70, fontFamily: F.mono, fontSize: 46, color: '#fff' }}>
        <span style={{ color: '#ff2a2a', opacity: Math.floor(t * 2) % 2 ? 1 : 0.2 }}>●</span> REC
      </div>
      <div style={{ position: 'absolute', bottom: 300, left: 70, fontFamily: F.mono, fontSize: 40, color: '#fff', opacity: 0.85 }}>SP  0:00:{ss}</div>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)' }} />
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><Marquee y={200} size={46} words={words} color="#00f0ff" fill opacity={0.45} speed={120} font={F.mono} /><SmpteBars y={1690} h={230} /><Marquee y={1600} size={60} words={head} color="#ff004c" fill opacity={0.6} dir={-1} speed={90} font={F.mono} /></AbsoluteFill>);
};
export const glitch: StyleDef = { Scene: Framed, Overlay, captions: { font: F.mono, weight: 700, size: 64, color: '#fff', key: '#00f0ff', stroke: '#000', upper: true } };
