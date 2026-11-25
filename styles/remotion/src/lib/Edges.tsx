// Edge-to-edge composition bands: every style fills the top band (~0-260 px) and the bottom band (~1560-1920 px) with
// visuals that belong to its look and to the scene (its words, emoji, palette) — never text the viewer must read
// (that stays in the safe zone) and never a flat empty area. All crisp: no blur, no grain.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { F } from './fonts';
import { rand } from './util';

const useSec = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return f / fps; };

// Giant outline words drifting sideways (kinetic type, glitch): uses the scene's own words.
export const Marquee: React.FC<{ y: number; size: number; words: string[]; color: string; speed?: number; dir?: 1 | -1; fill?: boolean; font?: string; opacity?: number }> =
  ({ y, size, words, color, speed = 60, dir = 1, fill, font = F.heavy, opacity = 0.9 }) => {
    const t = useSec();
    const text = (words.join('  •  ') + '  •  ').repeat(4).toUpperCase();
    return <div style={{ position: 'absolute', top: y, left: 0, whiteSpace: 'nowrap', fontFamily: font, fontWeight: 900, fontSize: size, lineHeight: 1, opacity,
      color: fill ? color : 'transparent', WebkitTextStroke: fill ? undefined : `3px ${color}`, transform: `translateX(${(dir > 0 ? -1 : 1) * ((t * speed) % (size * 8)) - size * 4}px)` }}>{text}</div>;
  };

export const SmpteBars: React.FC<{ y: number; h: number }> = ({ y, h }) => {
  const t = useSec(); const f = useCurrentFrame();
  const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  const g = rand(Math.floor(f / 3)) > 0.8 ? (rand(f) - 0.5) * 60 : 0;
  return <div style={{ position: 'absolute', top: y, left: 0, width: 1080, height: h, display: 'flex', transform: `translateX(${g}px)` }}>
    {cols.map((c, i) => <div key={i} style={{ flex: 1, background: c, opacity: 0.85 - 0.25 * Math.abs(Math.sin(t * 2 + i)) }} />)}</div>;
};

export const NeonSkyline: React.FC<{ y: number; color: string; color2: string }> = ({ y, color, color2 }) => {
  const t = useSec();
  let d = `M 0 ${y + 200}`; let x = 0; let i = 0;
  while (x < 1080) { const w = 60 + rand(i) * 90, h = 60 + rand(i * 3) * 220; d += ` L ${x} ${y + 200 - h} L ${x + w} ${y + 200 - h}`; x += w; i++; }
  d += ` L 1080 ${y + 200}`;
  const flick = 0.75 + 0.25 * Math.abs(Math.sin(t * 7.1));
  return <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: flick }}>
    <path d={d} fill="none" stroke={color} strokeWidth={5} style={{ filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 22px ${color})` }} />
    {[...Array(14)].map((_, k) => <rect key={k} x={40 + rand(k * 7) * 1000} y={y + 40 + rand(k * 11) * 140} width={10} height={14} fill={color2} opacity={rand(Math.floor(t * 2) + k) > 0.4 ? 0.9 : 0.15} />)}
    <line x1={0} x2={1080} y1={y + 204} y2={y + 204} stroke={color2} strokeWidth={4} style={{ filter: `drop-shadow(0 0 10px ${color2})` }} />
  </svg>;
};

export const TornBand: React.FC<{ y: number; h: number; color: string; top?: boolean; seed?: number }> = ({ y, h, color, top, seed = 1 }) => {
  const pts: string[] = []; const n = 24;
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${top ? 100 - rand(seed + i) * 18 : rand(seed + i) * 18}%`);
  const poly = top ? `polygon(0 0, 100% 0, ${pts.reverse().join(',')})` : `polygon(${pts.join(',')}, 100% 100%, 0 100%)`;
  return <div style={{ position: 'absolute', top: y, left: -10, width: 1100, height: h, background: color, clipPath: poly, filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.25))' }} />;
};

export const ShapesBand: React.FC<{ y: number; h: number; colors: string[]; seed?: number }> = ({ y, h, colors, seed = 3 }) => {
  const t = useSec();
  return <div style={{ position: 'absolute', top: y, left: 0, width: 1080, height: h, overflow: 'hidden' }}>
    {[...Array(9)].map((_, i) => { const s = 60 + rand(seed + i) * 110; const x = ((i * 140 + t * (20 + rand(i) * 30)) % 1300) - 150; const kind = i % 3;
      const st: React.CSSProperties = { position: 'absolute', left: x, top: h * (0.15 + rand(seed * 2 + i) * 0.5), width: s, height: s, background: colors[i % colors.length], transform: `rotate(${t * 25 * (i % 2 ? 1 : -1)}deg)` };
      return kind === 0 ? <div key={i} style={{ ...st, borderRadius: '50%' }} /> : kind === 1 ? <div key={i} style={{ ...st, borderRadius: 18 }} />
        : <div key={i} style={{ ...st, background: 'transparent', width: 0, height: 0, borderLeft: `${s / 2}px solid transparent`, borderRight: `${s / 2}px solid transparent`, borderBottom: `${s}px solid ${colors[i % colors.length]}` }} />; })}
  </div>;
};

export const StickerRow: React.FC<{ y: number; emojis: string[]; size: number; dir?: 1 | -1 }> = ({ y, emojis, size, dir = 1 }) => {
  const t = useSec();
  const sticker = 'drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(6px 8px 0 rgba(0,0,0,0.18))';
  return <div style={{ position: 'absolute', top: y, left: 0, width: 1080, height: size * 1.4, overflow: 'visible' }}>
    {[...Array(7)].map((_, i) => { const x = ((i * 190 + dir * t * 50) % 1330 + 1330) % 1330 - 150;
      return <div key={i} style={{ position: 'absolute', left: x, top: Math.sin(t * 2 + i) * 10, fontSize: size, filter: sticker, transform: `rotate(${Math.sin(t * 1.5 + i) * 14}deg)` }}>{emojis[i % emojis.length]}</div>; })}
  </div>;
};

export const SoftControls: React.FC<{ y: number; bg: string; accent: string }> = ({ y, bg, accent }) => {
  const t = useSec();
  const out = '10px 10px 20px #b8c0cc, -10px -10px 20px #ffffff', inn = 'inset 8px 8px 16px #b8c0cc, inset -8px -8px 16px #ffffff';
  const v = (Math.sin(t * 1.2) + 1) / 2;
  return <div style={{ position: 'absolute', top: y, left: 70, right: 70, height: 150, display: 'flex', alignItems: 'center', gap: 40 }}>
    <div style={{ width: 120, height: 120, borderRadius: '50%', background: bg, boxShadow: out, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 8, height: 40, background: accent, borderRadius: 4, transform: `rotate(${-120 + v * 240}deg) translateY(-18px)` }} /></div>
    <div style={{ flex: 1, height: 44, borderRadius: 22, boxShadow: inn, position: 'relative' }}><div style={{ position: 'absolute', left: `calc(${v * 85}% )`, top: -12, width: 68, height: 68, borderRadius: '50%', background: bg, boxShadow: out }} /></div>
    <div style={{ width: 150, height: 76, borderRadius: 38, boxShadow: v > 0.5 ? inn : out, position: 'relative', background: bg }}><div style={{ position: 'absolute', top: 10, left: v > 0.5 ? 84 : 10, width: 56, height: 56, borderRadius: '50%', background: v > 0.5 ? accent : '#cfd6e0' }} /></div>
  </div>;
};

export const DecoBand: React.FC<{ y: number; color: string; flip?: boolean }> = ({ y, color, flip }) => (   // crisp art-deco ornament (no aging)
  <svg width={1080} height={220} style={{ position: 'absolute', left: 0, top: y, transform: flip ? 'scaleY(-1)' : undefined }}>
    <line x1={60} x2={1020} y1={40} y2={40} stroke={color} strokeWidth={3} /><line x1={90} x2={990} y1={58} y2={58} stroke={color} strokeWidth={1.5} />
    {[...Array(9)].map((_, i) => <g key={i} transform={`translate(${140 + i * 100},110)`}><path d="M 0 -40 L 18 0 L 0 40 L -18 0 Z" fill="none" stroke={color} strokeWidth={2.5} /><circle r={5} fill={color} /></g>)}
    <path d="M 540 150 L 600 190 L 540 210 L 480 190 Z" fill={color} opacity={0.8} /><line x1={60} x2={1020} y1={180} y2={180} stroke={color} strokeWidth={3} />
  </svg>
);
