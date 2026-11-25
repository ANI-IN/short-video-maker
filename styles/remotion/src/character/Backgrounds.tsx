// Original layered SVG backdrops for story scenes. Each returns sky / far / mid / floor layers; the director moves
// them at different speeds (parallax) under the camera. Canvas 1080x1920; the stage floor line is y = FLOOR.
import React from 'react';
import { rand } from '../lib/util';
import { extraBackdrop, extraPiece } from './Sets';

export const FLOOR = 1340;     // characters stand here; the caption band sits on the floor below them
const INK = '#1d1b18';
type Layers = { sky: React.ReactNode; far: React.ReactNode; mid: React.ReactNode; floor: React.ReactNode; tint?: string; top?: React.ReactNode; front?: React.ReactNode };

const Sky = ({ a, b }: { a: string; b: string }) => <rect width={1400} height={1920} x={-160} fill={`url(#sky-${a.slice(1)}${b.slice(1)})`} />;
const grad = (a: string, b: string) => <linearGradient id={`sky-${a.slice(1)}${b.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="0.62" stopColor={b} /></linearGradient>;

const Pillar = ({ x, h, c = '#e9d8b6', w = 70 }: { x: number; h: number; c?: string; w?: number }) => (
  <g><rect x={x - w / 2 - 14} y={FLOOR - 26} width={w + 28} height={26} fill={c} stroke={INK} strokeWidth={4} />
    <rect x={x - w / 2} y={FLOOR - h} width={w} height={h - 26} fill={c} stroke={INK} strokeWidth={4} />
    {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={x - w / 2 + w * k} y1={FLOOR - h + 30} x2={x - w / 2 + w * k} y2={FLOOR - 40} stroke="rgba(0,0,0,0.12)" strokeWidth={4} />)}
    <rect x={x - w / 2 - 18} y={FLOOR - h - 24} width={w + 36} height={28} fill={c} stroke={INK} strokeWidth={4} /></g>
);
const Arch = ({ x, w, top, c }: { x: number; w: number; top: number; c: string }) => (
  <path d={`M ${x - w / 2} ${FLOOR} L ${x - w / 2} ${top + w / 2} Q ${x - w / 2} ${top} ${x} ${top - 40} Q ${x + w / 2} ${top} ${x + w / 2} ${top + w / 2} L ${x + w / 2} ${FLOOR} Z`} fill={c} stroke={INK} strokeWidth={4} />
);
const Tree = ({ x, s, c }: { x: number; s: number; c: string }) => (
  <g transform={`translate(${x},${FLOOR}) scale(${s})`}><rect x={-16} y={-260} width={32} height={260} fill="#6d4c2f" stroke={INK} strokeWidth={4} />
    <circle cx={0} cy={-300} r={110} fill={c} stroke={INK} strokeWidth={4} /><circle cx={-80} cy={-250} r={70} fill={c} stroke={INK} strokeWidth={4} /><circle cx={80} cy={-240} r={74} fill={c} stroke={INK} strokeWidth={4} /></g>
);
const Hut = ({ x, s }: { x: number; s: number }) => (
  <g transform={`translate(${x},${FLOOR}) scale(${s})`}><rect x={-90} y={-150} width={180} height={150} fill="#c9a26b" stroke={INK} strokeWidth={4} />
    <path d="M -120 -140 L 0 -250 L 120 -140 Z" fill="#8d6e3f" stroke={INK} strokeWidth={4} /><rect x={-26} y={-90} width={52} height={90} fill="#5c3d22" stroke={INK} strokeWidth={4} /></g>
);
const Flag = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <g><line x1={x} y1={y} x2={x} y2={y + 220} stroke={INK} strokeWidth={6} /><path d={`M ${x} ${y} L ${x + 70} ${y + 22} L ${x} ${y + 46} Z`} fill={c} stroke={INK} strokeWidth={4} /></g>
);
const Hills = ({ y, c, seed }: { y: number; c: string; seed: number }) => {
  let d = `M -200 1920 L -200 ${y}`;
  for (let i = 0; i <= 12; i++) d += ` Q ${-200 + i * 130 + 65} ${y - 60 - rand(seed + i) * 120} ${-200 + (i + 1) * 130} ${y - rand(seed + i * 3) * 40}`;
  return <path d={d + ' L 1400 1920 Z'} fill={c} stroke={INK} strokeWidth={4} />;
};
const Floor = ({ c, line, pattern }: { c: string; line?: string; pattern?: 'tiles' | 'grass' | 'dust' | 'water' }) => (
  <g><rect x={-200} y={FLOOR - 6} width={1480} height={1920 - FLOOR + 6} fill={c} stroke={INK} strokeWidth={4} />
    {pattern === 'tiles' ? [...Array(9)].map((_, i) => <line key={i} x1={540 + (i - 4) * 140} y1={FLOOR} x2={540 + (i - 4) * 420} y2={1920} stroke={line} strokeWidth={5} opacity={0.8} />) : null}
    {pattern === 'tiles' ? <g><path d={`M 300 ${FLOOR + 80} L 780 ${FLOOR + 80} L 900 ${FLOOR + 380} L 180 ${FLOOR + 380} Z`} fill="#a61e4d" stroke={INK} strokeWidth={4} opacity={0.9} />
      <path d={`M 330 ${FLOOR + 100} L 750 ${FLOOR + 100} L 860 ${FLOOR + 360} L 220 ${FLOOR + 360} Z`} fill="none" stroke="#f2c94c" strokeWidth={5} />
      {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={300 + k * 120} cy={FLOOR + 230} r={16} fill="#f2c94c" stroke={INK} strokeWidth={3} />)}</g> : null}
    {pattern === 'tiles' ? [[540, FLOOR + 230, 150], [150, FLOOR + 300, 110], [930, FLOOR + 300, 110]].map(([x, y, r], i) => <g key={'m' + i}><ellipse cx={x} cy={y} rx={r} ry={r * 0.32} fill="none" stroke={line} strokeWidth={6} /><ellipse cx={x} cy={y} rx={r * 0.6} ry={r * 0.19} fill={line} opacity={0.35} /></g>) : null}
    {pattern === 'tiles' ? [0, 1, 2, 3].map((i) => <line key={'h' + i} x1={-200} y1={FLOOR + 60 + i * i * 70} x2={1280} y2={FLOOR + 60 + i * i * 70} stroke={line} strokeWidth={5} opacity={0.75} />) : null}
    {pattern === 'grass' ? [...Array(40)].map((_, i) => <path key={i} d={`M ${rand(i) * 1280 - 100} ${FLOOR + 30 + rand(i * 7) * 700} l 8 -24 l 8 24`} fill="none" stroke={line} strokeWidth={4} />) : null}
    {pattern === 'dust' ? [...Array(26)].map((_, i) => <ellipse key={i} cx={rand(i * 3) * 1280 - 100} cy={FLOOR + 40 + rand(i * 5) * 700} rx={30 + rand(i) * 60} ry={8} fill={line} opacity={0.45} />) : null}
  </g>
);

export const SetPiece: React.FC<{ kind: string; t: number; p?: any }> = ({ kind, t, p }) => {
  switch (kind) {
    case 'throne': return <g><rect x={-120} y={-330} width={240} height={330} rx={20} fill="#c92a2a" stroke={INK} strokeWidth={5} /><path d="M -140 -330 Q 0 -440 140 -330 Z" fill="#f2c94c" stroke={INK} strokeWidth={5} />
      <rect x={-150} y={-150} width={300} height={60} rx={10} fill="#f2c94c" stroke={INK} strokeWidth={5} /><rect x={-150} y={-90} width={34} height={90} fill="#e0a800" stroke={INK} strokeWidth={4} /><rect x={116} y={-90} width={34} height={90} fill="#e0a800" stroke={INK} strokeWidth={4} /></g>;
    case 'dice-board': return <g><path d="M -230 -10 L 230 -10 L 280 40 L -280 40 Z" fill="#8f1d1d" stroke={INK} strokeWidth={5} />
      {[-1, 0, 1].map((i) => <rect key={i} x={-36 + i * 140} y={-8} width={72} height={46} fill="#f2c94c" opacity={0.75} />)}
      <g transform={`translate(${-30 + Math.sin(t * 3) * 3},-30) rotate(${12 + Math.sin(t * 2) * 4})`}><rect x={-20} y={-20} width={40} height={40} rx={6} fill="#fff8e7" stroke={INK} strokeWidth={4} /><circle r={5} fill={INK} /></g>
      <g transform="translate(40,-26) rotate(-18)"><rect x={-20} y={-20} width={40} height={40} rx={6} fill="#fff8e7" stroke={INK} strokeWidth={4} /><circle cx={-8} cy={-8} r={4.5} fill={INK} /><circle cx={8} cy={8} r={4.5} fill={INK} /></g></g>;
    case 'chariot': return <g><path d="M -200 -150 L 160 -150 L 200 -60 L -200 -60 Z" fill="#c0a062" stroke={INK} strokeWidth={5} /><circle cx={-120} cy={-40} r={60} fill="none" stroke={INK} strokeWidth={10} />
      {[0, 45, 90, 135].map((a) => <line key={a} x1={-120} y1={-40} x2={-120 + 60 * Math.cos((a + t * 40) * Math.PI / 180)} y2={-40 + 60 * Math.sin((a + t * 40) * Math.PI / 180)} stroke={INK} strokeWidth={6} />)}
      <Flag x={150} y={-420} c="#e8590c" /></g>;
    case 'campfire': return <g>{[0, 1, 2].map((i) => <path key={i} d={`M ${-30 + i * 30} 0 Q ${-40 + i * 30 + Math.sin(t * 8 + i) * 8} ${-70 - i * 10} ${-15 + i * 30} ${-110 - (i % 2) * 30} Q ${10 + i * 20} -60 ${10 + i * 30} 0 Z`} fill={['#e8590c', '#fab005', '#ffd43b'][i]} stroke={INK} strokeWidth={3} />)}
      <rect x={-60} y={-10} width={120} height={18} rx={8} fill="#6d4c2f" stroke={INK} strokeWidth={4} /></g>;
    case 'arrow-bed': return <g>{[...Array(22)].map((_, i) => { const x = -300 + i * 28; const lean = (i % 3 - 1) * 8;
        return <g key={i} transform={`translate(${x},0) rotate(${lean})`}><line x1={0} y1={0} x2={0} y2={-170 - (i % 4) * 10} stroke="#6d4c2f" strokeWidth={6} />
          <path d={`M -9 ${-160 - (i % 4) * 10} L 0 ${-186 - (i % 4) * 10} L 9 ${-160 - (i % 4) * 10} Z`} fill="#adb5bd" stroke={INK} strokeWidth={2.5} />
          <path d={`M -7 -14 L 0 -2 L 7 -14 L 0 -30 Z`} fill="#e8590c" stroke={INK} strokeWidth={2} /></g>; })}</g>;
    case 'lamp': return <g><rect x={-8} y={-160} width={16} height={160} fill="#c0a062" stroke={INK} strokeWidth={4} /><ellipse cx={0} cy={-160} rx={30} ry={10} fill="#f2c94c" stroke={INK} strokeWidth={4} /><path d={`M 0 -168 Q ${-8 + Math.sin(t * 9) * 3} -190 0 -210 Q 8 -190 0 -168`} fill="#ffd43b" /></g>;
    case 'brahmastra': {
      // a blazing divine missile: flies from the piece's origin along an arc (p.from..p.to seconds, p.dx/p.dy px), bursts on arrival
      const t0 = p?.from ?? 1.5, t1 = p?.to ?? 4.0, dx = p?.dx ?? 620, dy = p?.dy ?? -40, h = p?.arc ?? 380;
      const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      if (t < t0) return null;
      const pos = (u: number) => ({ x: dx * u, y: -520 + dy * u - h * 4 * u * (1 - u) });
      const head = pos(k), burst = t > t1 ? Math.min(1, (t - t1) / 0.6) : 0;
      return <g>
        {k < 1 ? [...Array(14)].map((_, i) => { const u = Math.max(0, k - i * 0.022); const q = pos(u);
          return <circle key={i} cx={q.x} cy={q.y} r={34 - i * 2.1} fill={['#fff3bf', '#ffd43b', '#fab005', '#f76707', '#e8590c'][Math.min(4, Math.floor(i / 3))]} opacity={0.95 - i * 0.06} />; }) : null}
        {k < 1 ? <g transform={`translate(${head.x},${head.y})`}><circle r={46} fill="#fff9db" opacity={0.55} /><circle r={22} fill="#ffffff" /></g> : null}
        {burst > 0 && burst < 1 ? <g transform={`translate(${head.x},${head.y})`}>
          <circle r={60 + burst * 340} fill="#ffd43b" opacity={0.55 * (1 - burst)} />
          {[...Array(12)].map((_, i) => { const a = i * Math.PI / 6; return <line key={i} x1={Math.cos(a) * 40} y1={Math.sin(a) * 40} x2={Math.cos(a) * (90 + burst * 300)} y2={Math.sin(a) * (90 + burst * 300)} stroke="#fff3bf" strokeWidth={10} opacity={1 - burst} strokeLinecap="round" />; })}
        </g> : null}
      </g>;
    }
    case 'divine-shield': {
      // Krishna's protection: a golden dome of light that fades in from p.from seconds and keeps pulsing
      const t0 = p?.from ?? 3.5, r = p?.r ?? 300;
      const a = Math.min(1, Math.max(0, (t - t0) / 0.6));
      if (a <= 0) return null;
      const pulse = 1 + Math.sin(t * 4) * 0.03;
      return <g opacity={a}>
        <defs><radialGradient id="shieldg" cx="50%" cy="60%" r="60%"><stop offset="0%" stopColor="#fff3bf" stopOpacity={0.55} /><stop offset="70%" stopColor="#ffd43b" stopOpacity={0.25} /><stop offset="100%" stopColor="#fab005" stopOpacity={0} /></radialGradient></defs>
        <ellipse cx={0} cy={-r * 0.75} rx={r * pulse} ry={r * 1.05 * pulse} fill="url(#shieldg)" />
        <path d={`M ${-r} 0 A ${r} ${r * 1.3} 0 0 1 ${r} 0`} fill="none" stroke="#ffe066" strokeWidth={8} opacity={0.85} transform={`scale(${pulse})`} />
        {[...Array(10)].map((_, i) => { const ang = Math.PI + (i + 0.5) * Math.PI / 10; const rr = r * 1.08 * pulse;
          return <line key={i} x1={Math.cos(ang) * rr} y1={Math.sin(ang) * rr * 1.3} x2={Math.cos(ang) * (rr + 60)} y2={Math.sin(ang) * (rr + 60) * 1.3} stroke="#ffe066" strokeWidth={6} opacity={0.6 + Math.sin(t * 6 + i) * 0.3} strokeLinecap="round" />; })}
      </g>;
    }
    default: return <>{extraPiece(kind, t, p)}</>;
  }
};

// set dressing that fills the top band and the foreground band (below the actors' feet), per set
const Lantern = ({ x, y, c }: { x: number; y: number; c: string }) => <g><line x1={x} y1={0} x2={x} y2={y} stroke={INK} strokeWidth={4} /><path d={`M ${x - 26} ${y} Q ${x} ${y - 20} ${x + 26} ${y} L ${x + 20} ${y + 70} Q ${x} ${y + 84} ${x - 20} ${y + 70} Z`} fill={c} stroke={INK} strokeWidth={4} /><circle cx={x} cy={y + 40} r={10} fill="#fff3bf" /></g>;
const Bird = ({ x, y, t, k }: { x: number; y: number; t: number; k: number }) => { const w = Math.sin(t * 7 + k) * 10; return <path d={`M ${x - 24} ${y + w} Q ${x - 10} ${y - 8} ${x} ${y} Q ${x + 10} ${y - 8} ${x + 24} ${y + w}`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />; };
const Fern = ({ x, s, c }: { x: number; s: number; c: string }) => <g transform={`translate(${x},1920) scale(${s})`}>{[-50, -25, 0, 25, 50].map((a, i) => <path key={i} d="M 0 0 Q 20 -160 0 -300 Q -20 -160 0 0" fill={c} stroke={INK} strokeWidth={4} transform={`rotate(${a})`} />)}</g>;
function dressing(kind: string, t: number): { top: React.ReactNode; front: React.ReactNode } {
  switch (kind) {
    case 'court': case 'palace': return {
      top: <g>{[120, 360, 720, 960].map((x, i) => <Lantern key={x} x={x} y={90 + (i % 2) * 50} c={i % 2 ? '#e8590c' : '#c92a2a'} />)}<path d="M 0 30 Q 270 110 540 30 Q 810 110 1080 30" fill="none" stroke="#f2c94c" strokeWidth={10} /></g>,
      front: <g><rect x={-20} y={1660} width={1120} height={60} fill="#a61e4d" stroke={INK} strokeWidth={4} />{[...Array(12)].map((_, i) => <path key={i} d={`M ${i * 95} 1660 l 47 30 l 47 -30`} fill="none" stroke="#f2c94c" strokeWidth={5} />)}
        {[90, 990].map((x) => <g key={x} transform={`translate(${x},1880)`}><rect x={-34} y={-150} width={68} height={150} fill="#c0a062" stroke={INK} strokeWidth={4} /><ellipse cx={0} cy={-150} rx={54} ry={16} fill="#f2c94c" stroke={INK} strokeWidth={4} /><path d={`M 0 -160 Q ${-10 + Math.sin(t * 9) * 4} -190 0 -220 Q 10 -190 0 -160`} fill="#ffd43b" /></g>)}</g> };
    case 'throne-room': return {
      top: <g><path d="M 0 0 L 1080 0 L 1080 120 Q 810 230 540 120 Q 270 230 0 120 Z" fill="#a61e4d" stroke={INK} strokeWidth={4} /><g transform="translate(540,40)"><line x1={0} y1={0} x2={0} y2={90} stroke={INK} strokeWidth={4} /><path d="M -110 90 L 110 90 L 70 150 L -70 150 Z" fill="#f2c94c" stroke={INK} strokeWidth={4} />{[-80, -40, 0, 40, 80].map((x) => <circle key={x} cx={x} cy={170} r={10} fill="#ffd43b" opacity={0.6 + 0.4 * Math.sin(t * 4 + x)} />)}</g></g>,
      front: <g>{[0, 1, 2].map((i) => <rect key={i} x={-20} y={1600 + i * 100} width={1120} height={100} fill={['#8b5a2b', '#7a4b24', '#6d4c2f'][i]} stroke={INK} strokeWidth={4} />)}</g> };
    case 'battlefield': return {
      top: <g>{[0, 1, 2, 3, 4].map((k) => <Bird key={k} x={((k * 230 + t * 40) % 1300) - 100} y={120 + (k % 3) * 50} t={t} k={k} />)}{[150, 930].map((x, i) => <g key={x}><line x1={x} y1={0} x2={x} y2={200} stroke={INK} strokeWidth={6} /><path d={`M ${x} 140 L ${x + (i ? -90 : 90)} ${170 + Math.sin(t * 3) * 6} L ${x} 200 Z`} fill={i ? '#1971c2' : '#e8590c'} stroke={INK} strokeWidth={4} /></g>)}</g>,
      front: <g>{[120, 340, 560, 780, 990].map((x, i) => <g key={'a' + i} transform={`translate(${x},${1470 + (i % 2) * 70}) rotate(${(i % 2 ? 18 : -14)})`}><line x1={0} y1={0} x2={0} y2={-90} stroke="#6d4c2f" strokeWidth={6} /><path d="M -8 -84 L 0 -104 L 8 -84 Z" fill="#adb5bd" stroke={INK} strokeWidth={2} /></g>)}{[200, 680, 900].map((x) => <ellipse key={'s' + x} cx={x} cy={1560} rx={50} ry={20} fill="#8c6239" stroke={INK} strokeWidth={3} />)}{[60, 300, 620, 880].map((x, i) => <g key={x} transform={`translate(${x},${1760 + (i % 2) * 60}) rotate(${(i % 2 ? 1 : -1) * 22})`}><line x1={-120} y1={0} x2={120} y2={0} stroke="#6d4c2f" strokeWidth={9} /><path d="M 120 -10 L 150 0 L 120 10 Z" fill="#adb5bd" stroke={INK} strokeWidth={3} /></g>)}
        {[440, 980].map((x) => <circle key={x} cx={x} cy={1840} r={64} fill="#c0a062" stroke={INK} strokeWidth={5} />)}</g> };
    case 'forest': return {
      top: <g>{[...Array(9)].map((_, i) => <ellipse key={i} cx={i * 135} cy={30 + (i % 2) * 40} rx={120} ry={90} fill={i % 2 ? '#2f9e44' : '#37b24d'} stroke={INK} strokeWidth={4} />)}</g>,
      front: <g><Fern x={80} s={1} c="#2b8a3e" /><Fern x={1000} s={1.1} c="#2f9e44" /><Fern x={520} s={0.6} c="#40c057" /><ellipse cx={300} cy={1880} rx={120} ry={60} fill="#868e96" stroke={INK} strokeWidth={4} /><ellipse cx={760} cy={1900} rx={150} ry={70} fill="#adb5bd" stroke={INK} strokeWidth={4} /></g> };
    case 'river': return {
      top: <g>{[0, 1, 2].map((k) => <Bird key={k} x={((k * 330 + t * 30) % 1300) - 100} y={150 + k * 40} t={t} k={k} />)}{[200, 760].map((x, i) => <g key={x} transform={`translate(${(x + t * 10) % 1200 - 60},${80 + i * 40})`}><ellipse rx={110} ry={40} fill="#fff" stroke={INK} strokeWidth={4} /><ellipse cx={-50} cy={-20} rx={60} ry={34} fill="#fff" stroke={INK} strokeWidth={4} /></g>)}</g>,
      front: <g>{[...Array(14)].map((_, i) => <path key={i} d={`M ${i * 80 + 10} 1920 Q ${i * 80 + 20 + Math.sin(t * 2 + i) * 8} 1760 ${i * 80 + 4} ${1620 + (i % 3) * 40}`} fill="none" stroke="#2b8a3e" strokeWidth={9} strokeLinecap="round" />)}
        <path d="M 600 1800 Q 760 1880 940 1800 L 900 1850 Q 760 1900 640 1850 Z" fill="#8d6e3f" stroke={INK} strokeWidth={5} /></g> };
    case 'village': return {
      top: <g transform={`translate(${820 + Math.sin(t) * 20},${130 + Math.cos(t * 1.3) * 14}) rotate(20)`}><path d="M 0 -60 L 45 0 L 0 60 L -45 0 Z" fill="#e8590c" stroke={INK} strokeWidth={4} /><path d="M 0 60 Q -40 140 -140 200" fill="none" stroke={INK} strokeWidth={3} /></g>,
      front: <g>{[...Array(12)].map((_, i) => <rect key={i} x={i * 92 + 10} y={1620} width={22} height={180} fill="#c9a26b" stroke={INK} strokeWidth={4} />)}<rect x={-10} y={1660} width={1100} height={18} fill="#a27b45" stroke={INK} strokeWidth={4} /><rect x={-10} y={1740} width={1100} height={18} fill="#a27b45" stroke={INK} strokeWidth={4} />
        <circle cx={880} cy={1860} r={70} fill="none" stroke="#6d4c2f" strokeWidth={14} /></g> };
    case 'night': case 'night-sky': return {
      top: <g><circle cx={800} cy={360} r={130} fill="#fff9db" opacity={0.12} />{[...Array(24)].map((_, i) => <path key={i} d={`M ${rand(i * 9) * 1080} ${20 + rand(i * 4) * 220} l 0 -10 l 3 7 l 7 3 l -7 3 l -3 7 l -3 -7 l -7 -3 l 7 -3 z`} fill="#fff" opacity={0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i))} />)}</g>,
      front: <g>{[...Array(18)].map((_, i) => <path key={i} d={`M ${i * 62} 1920 l 14 -${90 + (i % 4) * 30} l 14 ${90 + (i % 4) * 30}`} fill="#14163a" stroke="#0b0d24" strokeWidth={3} />)}{[...Array(8)].map((_, i) => <circle key={'f' + i} cx={(rand(i) * 1080 + Math.sin(t + i) * 30)} cy={1650 + rand(i * 3) * 220 + Math.cos(t * 1.4 + i) * 20} r={5} fill="#ffe066" opacity={0.5 + 0.5 * Math.sin(t * 5 + i)} />)}</g> };
    default: return { top: null, front: null };
  }
}

export function backdrop(kind: string, t: number, p: any = {}): Layers {
  const extra = extraBackdrop(kind, t, p);       // modern sets (cinema, studio, office, city): Sets.tsx
  if (extra) return { top: null, front: null, ...extra };
  return { ...backdropBase(kind, t), ...dressing(kind, t) };
}

function backdropBase(kind: string, t: number): Layers {
  switch (kind) {
    case 'court': case 'palace': return {
      sky: <g>{grad('#f7e3b5', '#e8c88c')}<Sky a="#f7e3b5" b="#e8c88c" /></g>,
      far: <g>{[-60, 340, 740, 1140].map((x, i) => <Arch key={i} x={x} w={300} top={420} c="#f1d9a8" />)}
        {[140, 540, 940].map((x, i) => <path key={i} d={`M ${x - 120} 300 Q ${x} 420 ${x + 120} 300 L ${x + 120} 260 L ${x - 120} 260 Z`} fill="#c92a2a" stroke={INK} strokeWidth={4} />)}</g>,
      mid: <g>{[-120, 160, 920, 1200].map((x) => <Pillar key={x} x={x} h={820} />)}</g>,
      floor: <Floor c="#d9b77e" line="#a27b45" pattern="tiles" />,
    };
    case 'throne-room': return {
      sky: <g>{grad('#3b1f2b', '#6b2d3c')}<Sky a="#3b1f2b" b="#6b2d3c" /></g>,
      far: <g><path d="M 340 1090 L 340 380 Q 540 220 740 380 L 740 1090 Z" fill="#4a2333" stroke={INK} strokeWidth={4} />{[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={140 + i * 160} cy={250} r={10} fill="#ffd43b" opacity={0.7 + 0.3 * Math.sin(t * 3 + i)} />)}</g>,
      mid: <g>{[-80, 200, 880, 1160].map((x) => <Pillar key={x} x={x} h={880} c="#c9a26b" />)}<rect x={400} y={FLOOR - 40} width={280} height={40} fill="#b8860b" stroke={INK} strokeWidth={4} /></g>,
      floor: <g><Floor c="#5c2a2a" line="#3a1616" pattern="tiles" /><path d={`M 380 ${FLOOR} L 700 ${FLOOR} L 900 1920 L 180 1920 Z`} fill="#a61e4d" stroke={INK} strokeWidth={4} /></g>,
    };
    case 'battlefield': return {
      sky: <g>{grad('#f4a261', '#e9c46a')}<Sky a="#f4a261" b="#e9c46a" /><circle cx={820} cy={420} r={90} fill="#fff3bf" opacity={0.85} /></g>,
      far: <g><Hills y={860} c="#c08552" seed={3} />{[60, 260, 470, 690, 900].map((x, i) => <Flag key={i} x={x} y={700 + (i % 2) * 40} c={['#e8590c', '#1971c2', '#e8590c', '#2b8a3e', '#c92a2a'][i]} />)}</g>,
      mid: <g>{[...Array(5)].map((_, i) => <ellipse key={i} cx={(i * 260 + t * 30) % 1500 - 200} cy={960 - i * 20} rx={200} ry={40} fill="#e9c46a" opacity={0.45} />)}</g>,
      floor: <Floor c="#b5835a" line="#8c6239" pattern="dust" />, tint: 'rgba(233,196,106,0.10)',
    };
    case 'forest': return {
      sky: <g>{grad('#a5d8ff', '#d3f9d8')}<Sky a="#a5d8ff" b="#d3f9d8" /></g>,
      far: <g><Hills y={880} c="#69db7c" seed={9} />{[-40, 180, 420, 660, 900, 1120].map((x, i) => <Tree key={x} x={x} s={0.7 + rand(i) * 0.2} c="#40c057" />)}</g>,
      mid: <g>{[-100, 1180].map((x, i) => <Tree key={x} x={x} s={1.5} c="#2f9e44" />)}</g>,
      floor: <Floor c="#8ce99a" line="#2b8a3e" pattern="grass" />,
    };
    case 'river': return {
      sky: <g>{grad('#ffd8a8', '#a5d8ff')}<Sky a="#ffd8a8" b="#a5d8ff" /><circle cx={260} cy={520} r={70} fill="#fff3bf" /></g>,
      far: <g><Hills y={820} c="#74c0fc" seed={5} /><rect x={-200} y={900} width={1480} height={200} fill="#4dabf7" stroke={INK} strokeWidth={4} />
        {[...Array(8)].map((_, i) => <path key={i} d={`M ${((i * 180 + t * 40) % 1400) - 200} ${940 + (i % 3) * 40} q 30 -12 60 0`} fill="none" stroke="#e7f5ff" strokeWidth={5} />)}</g>,
      mid: <g>{[0, 1, 2, 3].map((i) => <rect key={i} x={-200} y={FLOOR - 30 - i * 30} width={1480} height={30} fill={i % 2 ? '#d6b884' : '#c9a26b'} stroke={INK} strokeWidth={3} />)}</g>,
      floor: <Floor c="#c9a26b" line="#a27b45" />,
    };
    case 'village': return {
      sky: <g>{grad('#bde0fe', '#fff1d6')}<Sky a="#bde0fe" b="#fff1d6" /></g>,
      far: <g><Hills y={900} c="#94d82d" seed={11} />{[60, 380, 760].map((x, i) => <Hut key={x} x={x} s={0.6 + i * 0.08} />)}</g>,
      mid: <g><Tree x={1120} s={1.3} c="#5c940d" /><Hut x={-60} s={1.2} /></g>,
      floor: <Floor c="#e0c08a" line="#b08d57" pattern="dust" />,
    };
    case 'night': case 'night-sky': return {
      sky: <g>{grad('#0b1026', '#2b2d6e')}<Sky a="#0b1026" b="#2b2d6e" />{[...Array(70)].map((_, i) => <circle key={i} cx={rand(i) * 1300 - 100} cy={rand(i * 3) * 900} r={1.5 + rand(i * 5) * 2.5} fill="#fff" opacity={0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + rand(i)) + i))} />)}
        <circle cx={800} cy={360} r={80} fill="#fff9db" /><circle cx={830} cy={345} r={80} fill="#0b1026" opacity={0.0} /></g>,
      far: <Hills y={900} c="#1b1f4b" seed={7} />,
      mid: <g><Tree x={-60} s={1.3} c="#1e2a5a" /><Tree x={1150} s={1.1} c="#1e2a5a" /></g>,
      floor: <Floor c="#272a52" line="#14163a" pattern="grass" />, tint: 'rgba(20,24,70,0.18)',
    };
    default: return backdropBase('court', t);
  }
}
