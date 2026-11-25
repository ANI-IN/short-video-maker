// Extra original sets + in-world text props for documentary reenactments (modern history: cinema, film studio, office,
// city). Same flat-shaded, ink-outlined look as Backgrounds.tsx, plus light: glows, bulb chases, light cones.
// All text on screen lives INSIDE the world (marquee, signs, scoreboard, script pages), like a film's set dressing.
import React from 'react';
import { rand } from '../lib/util';
import { F } from '../lib/fonts';
import { litBackdrop, litPiece } from './Lit';

const INK = '#1d1b18';
export const FLOOR2 = 1340;
type Layers = { sky: React.ReactNode; far: React.ReactNode; mid: React.ReactNode; floor: React.ReactNode; tint?: string; top?: React.ReactNode; front?: React.ReactNode };

const Glow = ({ id, c, r = 18 }: { id: string; c: string; r?: number }) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={r} result="b" /><feFlood floodColor={c} /><feComposite in2="b" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
);
const sky = (id: string, a: string, b: string) => (
  <g><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="0.7" stopColor={b} /></linearGradient></defs>
    <rect x={-200} y={0} width={1480} height={1920} fill={`url(#${id})`} /></g>
);
const Stars = ({ n = 40, t }: { n?: number; t: number }) => <g>{[...Array(n)].map((_, i) => <circle key={i} cx={rand(i * 3) * 1300 - 100} cy={rand(i * 7) * 700} r={1.5 + rand(i) * 2.5} fill="#fff" opacity={0.4 + 0.5 * Math.abs(Math.sin(t * 0.8 + i))} />)}</g>;
const Skyline = ({ y, c, lit, seed, t }: { y: number; c: string; lit: string; seed: number; t: number }) => (
  <g>{[...Array(11)].map((_, i) => {
    const w = 90 + rand(seed + i) * 90, h = 260 + rand(seed + i * 5) * 520, x = -160 + i * 135;
    return <g key={i}><rect x={x} y={y - h} width={w} height={h + 400} fill={c} stroke={INK} strokeWidth={4} />
      {[...Array(Math.floor(h / 70))].map((_, r) => [0, 1, 2].map((k) => rand(seed + i * 31 + r * 7 + k) > 0.45 ?
        <rect key={r + '-' + k} x={x + 14 + k * (w - 28) / 3} y={y - h + 26 + r * 70} width={(w - 28) / 3 - 12} height={34} fill={lit} opacity={0.55 + 0.35 * Math.abs(Math.sin(t * 0.3 + i + r))} /> : null))}</g>;
  })}</g>
);
const Bulbs = ({ x, y, w, h, t, c = '#ffd166' }: { x: number; y: number; w: number; h: number; t: number; c?: string }) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 14; i++) { pts.push([x + (w * i) / 14, y]); pts.push([x + (w * i) / 14, y + h]); }
  for (let i = 1; i < 5; i++) { pts.push([x, y + (h * i) / 5]); pts.push([x + w, y + (h * i) / 5]); }
  return <g>{pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={9} fill={c} opacity={((i + Math.floor(t * 8)) % 3 === 0) ? 1 : 0.45} filter="url(#glow-amber)" />)}</g>;
};


// floor detail below the actors' feet down to the frame bottom (the bottom band was flat colour: balance QC)
const FloorLines = ({ c, kind }: { c: string; kind: 'road' | 'pave' | 'boards' | 'tape' }) => (
  <g>
    {kind !== 'tape' ? [...Array(13)].map((_, i) => <line key={'v' + i} x1={540 + (i - 6) * 100} y1={FLOOR2} x2={540 + (i - 6) * 300} y2={1920} stroke={c} strokeWidth={6} opacity={0.9} />) : null}
    {[0, 1, 2, 3, 4, 5].map((i) => <line key={'h' + i} x1={-200} y1={FLOOR2 + 40 + i * i * 22} x2={1280} y2={FLOOR2 + 40 + i * i * 22} stroke={c} strokeWidth={6} opacity={0.9} />)}
    {kind === 'road' ? [0, 1, 2, 3].map((i) => <rect key={'d' + i} x={500 - i * 20} y={FLOOR2 + 120 + i * i * 60} width={80 + i * 40} height={18 + i * 8} fill="#ffd166" opacity={0.8} />) : null}
    {kind === 'road' || kind === 'pave' ? [150, 930].map((x, i) => <g key={x}><ellipse cx={x} cy={1820} rx={130} ry={26} fill="#ffd166" opacity={0.22} />
      <rect x={x - 22} y={1660} width={44} height={300} fill="#2b2d42" stroke={INK} strokeWidth={5} /><rect x={x - 40} y={1650} width={80} height={24} rx={6} fill="#3d405b" stroke={INK} strokeWidth={4} /></g>) : null}
    {kind === 'boards' ? <rect x={160} y={1700} width={760} height={260} rx={20} fill="#9d2b2b" stroke={INK} strokeWidth={6} opacity={0.85} /> : null}
    {kind === 'tape' ? <g><path d={`M -100 1760 C 200 1700 500 1860 1200 1740`} fill="none" stroke="#111" strokeWidth={12} />
      <path d={`M -100 1820 C 300 1780 600 1900 1200 1810`} fill="none" stroke="#222" strokeWidth={9} />
      {[[220, 1660], [820, 1700], [520, 1840]].map(([x, y], i) => <path key={i} d={`M ${x - 34} ${y} l 68 0 m -34 -34 l 0 68`} stroke="#ffd166" strokeWidth={10} />)}</g> : null}
  </g>
);

export function extraBackdrop(kind: string, t: number, p: any = {}): Layers | null {
  switch (kind) {
    case 'cinema-street': return {
      top: <g>{[...Array(14)].map((_, i) => <circle key={i} cx={-40 + i * 90} cy={150 + Math.sin(i * 0.9) * 26} r={11} fill={['#ffd166', '#ef476f', '#06d6a0', '#118ab2'][i % 4]} opacity={0.7 + 0.3 * Math.sin(t * 3 + i)} filter="url(#glow-amber)" />)}
        <path d="M -60 140 Q 120 190 300 150 Q 480 110 660 160 Q 840 200 1140 150" fill="none" stroke="#1d1b18" strokeWidth={4} /></g>,

      sky: <g>{sky('sk-cin', '#0b1030', '#2a2a6a')}<defs><Glow id="glow-amber" c="#ffb703" r={10} /><Glow id="glow-white" c="#fff3b0" r={22} /></defs><Stars t={t} /></g>,
      far: <Skyline y={FLOOR2 - 420} c="#1e2152" lit="#ffd166" seed={4} t={t} />,
      mid: <g>
        <rect x={110} y={FLOOR2 - 1180} width={860} height={1180} fill="#7b2d3b" stroke={INK} strokeWidth={6} />
        <rect x={110} y={FLOOR2 - 1180} width={860} height={60} fill="#5a1f2b" stroke={INK} strokeWidth={6} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={170 + i * 200} y={FLOOR2 - 840} width={140} height={150} fill="#ffd166" opacity={0.25} stroke={INK} strokeWidth={4} />)}
        {/* marquee sits ABOVE the actors' heads (they stand ~y 330-500 at full size) */}
        <rect x={160} y={FLOOR2 - 1110} width={760} height={210} rx={16} fill="#111" stroke={INK} strokeWidth={6} />
        <Bulbs x={160} y={FLOOR2 - 1110} w={760} h={210} t={t} />
        <text x={540} y={FLOOR2 - 1045} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={46} fill="#ffd166" filter="url(#glow-amber)">{(p.marquee || 'TONIGHT').toUpperCase()}</text>
        <text x={540} y={FLOOR2 - 960} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={70} fill="#fff3b0" filter="url(#glow-white)">{(p.marquee2 || 'HOUSEFULL').toUpperCase()}</text>
        <rect x={360} y={FLOOR2 - 420} width={360} height={420} fill="#ffcf70" stroke={INK} strokeWidth={6} />
        <rect x={360} y={FLOOR2 - 420} width={360} height={420} fill="url(#door-light)" />
        <defs><radialGradient id="door-light" cx="0.5" cy="0.6" r="0.7"><stop offset="0" stopColor="#fff6d6" /><stop offset="1" stopColor="#d98e04" /></radialGradient></defs>
        <line x1={540} y1={FLOOR2 - 420} x2={540} y2={FLOOR2} stroke={INK} strokeWidth={6} />
        {[150, 930].map((x) => <g key={x}><rect x={x - 70} y={FLOOR2 - 460} width={140} height={210} fill="#f2e8cf" stroke={INK} strokeWidth={5} /><rect x={x - 55} y={FLOOR2 - 445} width={110} height={120} fill={x < 500 ? '#3a86ff' : '#ef476f'} opacity={0.8} /><circle cx={x} cy={FLOOR2 - 390} r={30} fill="#ffd166" opacity={0.85} /></g>)}
      </g>,
      floor: <g><rect x={-200} y={FLOOR2 - 6} width={1480} height={700} fill="#3b3f58" stroke={INK} strokeWidth={4} /><FloorLines c="#5b6080" kind="pave" />
        <ellipse cx={540} cy={FLOOR2 + 120} rx={520} ry={90} fill="#ffd166" opacity={0.18} /></g>,
      front: <g>{[60, 1020].map((x) => <g key={x}><rect x={x - 10} y={FLOOR2 + 30} width={20} height={130} fill="#c9a227" stroke={INK} strokeWidth={4} /><circle cx={x} cy={FLOOR2 + 30} r={16} fill="#f2c94c" stroke={INK} strokeWidth={4} /></g>)}
        <path d={`M 60 ${FLOOR2 + 50} Q 540 ${FLOOR2 + 120} 1020 ${FLOOR2 + 50}`} fill="none" stroke="#c1121f" strokeWidth={14} /></g>,
    };
    case 'cinema-hall': return {
      top: <g>{[150, 420, 660, 930].map((x, i) => <g key={x}><rect x={x - 40} y={60} width={80} height={36} rx={8} fill="#2b2d42" stroke={INK} strokeWidth={4} /><path d={`M ${x - 26} 96 L ${x - 90} 240 L ${x + 90} 240 L ${x + 26} 96 Z`} fill="#fff3b0" opacity={0.12 + 0.05 * Math.sin(t * 2 + i)} /></g>)}</g>,

      sky: <g>{sky('sk-hall', '#07070f', '#14142a')}<defs><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dff6ff" stopOpacity="0.55" /><stop offset="1" stopColor="#dff6ff" stopOpacity="0" /></linearGradient><Glow id="glow-screen" c="#bde0fe" r={40} /></defs></g>,
      far: <g><rect x={70} y={260} width={940} height={470} rx={10} fill="#e9f5ff" filter="url(#glow-screen)" opacity={0.85 + 0.1 * Math.sin(t * 6)} />
        <rect x={70} y={260} width={940} height={470} rx={10} fill="none" stroke={INK} strokeWidth={6} />
        {p.screen ? <text x={540} y={430} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={84} fill="#1b263b">{p.screen}</text> : null}
        <path d={`M 470 1900 L 70 730 L 1010 730 L 610 1900 Z`} fill="url(#beam)" opacity={0.35} /></g>,
      mid: <g>{[0, 1, 2].map((r) => <g key={r}>{[...Array(9)].map((_, i) => <g key={i}><rect x={-40 + i * 135 + (r % 2) * 60} y={FLOOR2 - 300 + r * 150} width={120} height={150} rx={30} fill={['#7b1e2b', '#8e2433', '#a52a3a'][r]} stroke={INK} strokeWidth={4} />
        {rand(r * 13 + i) > 0.35 ? <circle cx={20 + i * 135 + (r % 2) * 60} cy={FLOOR2 - 330 + r * 150} r={42} fill={['#2b2d42', '#3d405b', '#1d3557'][(i + r) % 3]} stroke={INK} strokeWidth={4} /> : null}</g>)}</g>)}</g>,
      floor: <rect x={-200} y={FLOOR2 + 150} width={1480} height={600} fill="#1a1a2e" stroke={INK} strokeWidth={4} />,
      front: <g>{[...Array(9)].map((_, i) => <g key={i}><rect x={-60 + i * 140} y={1700} width={130} height={260} rx={34} fill="#5a1520" stroke={INK} strokeWidth={5} />
        {rand(i * 17) > 0.4 ? <circle cx={5 + i * 140} cy={1690} r={50} fill="#14142a" stroke={INK} strokeWidth={4} /> : null}</g>)}</g>,
      tint: 'rgba(10,10,40,0.12)',
    };
    case 'film-studio': return {
      top: <g><rect x={-100} y={90} width={1280} height={26} fill="#2b2d42" stroke={INK} strokeWidth={4} />{[...Array(8)].map((_, i) => <g key={i}><line x1={20 + i * 150} y1={116} x2={20 + i * 150} y2={170} stroke={INK} strokeWidth={6} /><rect x={-6 + i * 150} y={170} width={52} height={40} rx={8} fill={i % 2 ? '#fff9e6' : '#ffd166'} stroke={INK} strokeWidth={4} /></g>)}</g>,

      sky: <g>{sky('sk-stu', '#2b2f3a', '#3c4250')}<defs><Glow id="glow-soft" c="#fff9e6" r={30} /></defs></g>,
      far: <g><rect x={120} y={FLOOR2 - 980} width={840} height={980} fill="#2bb673" stroke={INK} strokeWidth={6} />
        <rect x={120} y={FLOOR2 - 980} width={840} height={980} fill="url(#gs)" /><defs><linearGradient id="gs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#000" stopOpacity="0.25" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.08" /><stop offset="1" stopColor="#000" stopOpacity="0.25" /></linearGradient></defs>
        {[...Array(6)].map((_, i) => <line key={i} x1={160 + i * 150} y1={FLOOR2 - 980} x2={160 + i * 150} y2={FLOOR2} stroke="#1f8f5a" strokeWidth={3} />)}</g>,
      mid: <g>{[70, 1010].map((x, k) => <g key={x}><line x1={x} y1={FLOOR2} x2={x} y2={FLOOR2 - 760} stroke={INK} strokeWidth={10} />
        <path d={`M ${x} ${FLOOR2} l -70 0 M ${x} ${FLOOR2} l 70 0`} stroke={INK} strokeWidth={8} />
        <rect x={x - 110} y={FLOOR2 - 940} width={220} height={180} rx={14} fill="#fff9e6" stroke={INK} strokeWidth={6} filter="url(#glow-soft)" transform={`rotate(${k ? -12 : 12} ${x} ${FLOOR2 - 850})`} /></g>)}
        <path d={`M -100 ${FLOOR2 - 20} C 200 ${FLOOR2 - 80} 400 ${FLOOR2 + 10} 700 ${FLOOR2 - 30}`} fill="none" stroke="#111" strokeWidth={8} /></g>,
      floor: <g><rect x={-200} y={FLOOR2 - 6} width={1480} height={700} fill="#4a4e5a" stroke={INK} strokeWidth={4} /><FloorLines c="#6b7080" kind="tape" />
        <path d={`M 360 ${FLOOR2 + 60} l 40 0 m -20 -20 l 0 40 M 680 ${FLOOR2 + 90} l 40 0 m -20 -20 l 0 40`} stroke="#ffd166" strokeWidth={6} /></g>,
    };
    case 'writers-room': case 'office': return {
      top: <g><line x1={300} y1={0} x2={300} y2={150} stroke={INK} strokeWidth={6} /><path d="M 230 150 L 370 150 L 340 210 L 260 210 Z" fill="#e9c46a" stroke={INK} strokeWidth={5} /><ellipse cx={300} cy={230} rx={150} ry={30} fill="#fff3b0" opacity={0.25} /></g>,

      sky: <g>{sky('sk-off', '#f4e3c3', '#e9cfa2')}</g>,
      far: <g><rect x={640} y={300} width={360} height={460} fill="#7ab6e8" stroke={INK} strokeWidth={6} />
        <Skyline y={760} c="#4d7aa6" lit="#fff3b0" seed={9} t={t} />
        <rect x={640} y={300} width={360} height={460} fill="none" stroke="#6d4c2f" strokeWidth={18} /><line x1={820} y1={300} x2={820} y2={760} stroke="#6d4c2f" strokeWidth={10} /></g>,
      mid: <g><rect x={60} y={320} width={460} height={340} fill="#c49a6c" stroke={INK} strokeWidth={6} />
        {[0, 1, 2, 3, 4, 5].map((i) => <g key={i} transform={`translate(${100 + (i % 3) * 140},${360 + Math.floor(i / 3) * 150}) rotate(${(rand(i) - 0.5) * 10})`}><rect width={110} height={120} fill="#fffaf0" stroke={INK} strokeWidth={4} />
          {[0, 1, 2].map((k) => <rect key={k} x={14} y={18 + k * 30} width={82} height={14} fill={k === 1 ? INK : '#9aa'} />)}<circle cx={55} cy={8} r={8} fill="#e63946" /></g>)}
        <rect x={-100} y={FLOOR2 - 240} width={1280} height={60} fill="#8d5a2b" stroke={INK} strokeWidth={6} />
        <rect x={-100} y={FLOOR2 - 180} width={1280} height={180} fill="#6d4423" stroke={INK} strokeWidth={6} /></g>,
      floor: <g><rect x={-200} y={FLOOR2 - 6} width={1480} height={700} fill="#b5835a" stroke={INK} strokeWidth={4} /><FloorLines c="#8d5a2b" kind="boards" /></g>,
    };
    case 'city-night': return {
      top: <g><circle cx={850} cy={190} r={70} fill="#fff6d6" filter="url(#glow-white)" />{[0, 1].map((k) => <path key={k} d={`M ${200 + k * 650} 1300 L ${80 + k * 650 + Math.sin(t * 0.6 + k) * 260} 0 L ${200 + k * 650 + Math.sin(t * 0.6 + k) * 260} 0 Z`} fill="#bde0fe" opacity={0.12} />)}</g>,

      sky: <g>{sky('sk-city', '#0a0f2c', '#3a2a6a')}<defs><Glow id="glow-amber" c="#ffb703" r={10} /><Glow id="glow-white" c="#fff3b0" r={22} /></defs><Stars t={t} n={60} /></g>,
      far: <Skyline y={FLOOR2 - 200} c="#1b1f4a" lit="#ffd166" seed={21} t={t} />,
      mid: <Skyline y={FLOOR2 + 40} c="#262a63" lit="#ffe8a3" seed={37} t={t} />,
      floor: <g><rect x={-200} y={FLOOR2 - 6} width={1480} height={700} fill="#15182f" stroke={INK} strokeWidth={4} /><FloorLines c="#3a3f6a" kind="road" /></g>,
    };
    default: return litBackdrop(kind, t, p);
  }
}

// In-world props. p = the storyboard set entry (text, value, color, h)
export function extraPiece(kind: string, t: number, p: any = {}): React.ReactNode | null {
  const txt = (p.text || '').toString();
  switch (kind) {
    case 'sign': return <g><rect x={-12} y={-300} width={24} height={300} fill="#6d4c2f" stroke={INK} strokeWidth={4} />
      <rect x={-150} y={-460} width={300} height={170} rx={14} fill={p.color || '#fff3d6'} stroke={INK} strokeWidth={6} />
      <text x={0} y={-355} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={txt.length > 8 ? 44 : 60} fill="#c1121f">{txt.toUpperCase()}</text></g>;
    case 'scoreboard': {
      const v = Number(p.value || 0), k = p.count === false ? 1 : Math.min(1, t / 0.9), shown = v * (0.35 + 0.65 * (1 - Math.pow(1 - k, 3)));   // never a $0.0 frame
      const s = p.format === 'money' ? `$${shown.toFixed(p.decimals ?? 1)}${p.unit || ' BN'}` : `${Math.round(shown)}${p.unit || ''}`;
      return <g><rect x={-290} y={-620} width={580} height={300} rx={18} fill="#0d1321" stroke={INK} strokeWidth={8} />
        <rect x={-270} y={-600} width={540} height={260} rx={10} fill="#111a2e" />
        <text x={0} y={-430} textAnchor="middle" fontFamily={F.mono || F.heavy} fontWeight={800} fontSize={108} fill="#ffd166" filter="url(#glow-amber)">{s}</text>
        <text x={0} y={-362} textAnchor="middle" fontFamily={F.heavy} fontWeight={800} fontSize={40} fill="#e0e1dd">{txt.toUpperCase()}</text>
        <rect x={-14} y={-320} width={28} height={320} fill="#444" stroke={INK} strokeWidth={4} /></g>;
    }
    case 'script': return <g transform={`rotate(${-4 + Math.sin(t * 1.3) * 1.5})`}><rect x={-170} y={-520} width={340} height={440} fill="#fffaf0" stroke={INK} strokeWidth={6} />
      {[...Array(9)].map((_, i) => <rect key={i} x={-140} y={-480 + i * 40} width={i % 3 === 1 ? 160 : 280} height={18} fill={i % 2 ? INK : '#9aa'} />)}
      <g transform="translate(40,-180) rotate(-16)"><rect x={-150} y={-44} width={300} height={88} rx={10} fill="none" stroke="#e63946" strokeWidth={8} />
        <text x={0} y={18} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={txt.length > 10 ? 40 : 50} fill="#e63946">{(txt || 'CONFIDENTIAL').toUpperCase()}</text></g></g>;
    case 'clapper': return <g><line x1={0} y1={-330} x2={0} y2={0} stroke={INK} strokeWidth={10} /><path d="M -70 0 L 0 -40 L 70 0" fill="none" stroke={INK} strokeWidth={8} /><g transform={`translate(0,-560)`}><rect x={-170} y={0} width={340} height={210} fill="#111" stroke={INK} strokeWidth={6} />
      <g transform={`rotate(${-18 + Math.max(0, Math.sin(t * 2)) * 18} -170 0)`}><rect x={-170} y={-50} width={340} height={50} fill="#fff" stroke={INK} strokeWidth={6} />
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M ${-150 + i * 70} -50 l 34 0 l -24 50 l -34 0 Z`} fill="#111" />)}</g>
      <text x={0} y={90} textAnchor="middle" fontFamily={F.heavy} fontWeight={800} fontSize={40} fill="#fff">{(txt || 'SCENE 1').toUpperCase()}</text>
      <text x={0} y={160} textAnchor="middle" fontFamily={F.heavy} fontWeight={800} fontSize={34} fill="#bbb">{(p.sub || 'TAKE 1').toUpperCase()}</text></g></g>;   /* on a stand: its text sits above the caption band in medium shots */
    case 'film-camera': return <g><path d="M -60 0 L 0 -260 L 60 0" fill="none" stroke={INK} strokeWidth={10} /><rect x={-150} y={-400} width={260} height={150} rx={14} fill="#2b2d42" stroke={INK} strokeWidth={6} />
      <circle cx={-90} cy={-450} r={60} fill="#3d405b" stroke={INK} strokeWidth={6} /><circle cx={30} cy={-450} r={60} fill="#3d405b" stroke={INK} strokeWidth={6} />
      {[-90, 30].map((x) => <line key={x} x1={x} y1={-450} x2={x + 50 * Math.cos(t * 4)} y2={-450 + 50 * Math.sin(t * 4)} stroke="#8d99ae" strokeWidth={6} />)}
      <rect x={110} y={-360} width={90} height={70} fill="#8d99ae" stroke={INK} strokeWidth={6} /><circle cx={-130} cy={-370} r={10} fill="#e63946" opacity={Math.sin(t * 6) > 0 ? 1 : 0.3} /></g>;
    case 'ticket-counter': return <g><rect x={-260} y={-420} width={520} height={420} fill="#9d0208" stroke={INK} strokeWidth={6} />
      <rect x={-200} y={-380} width={400} height={170} rx={80} fill="#ffe8a3" stroke={INK} strokeWidth={6} />
      <text x={0} y={-460} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={58} fill="#ffd166" filter="url(#glow-amber)">{(txt || 'TICKETS').toUpperCase()}</text>
      <rect x={-280} y={-200} width={560} height={30} fill="#6a040f" stroke={INK} strokeWidth={5} /></g>;
    case 'tower': {   // box-office tower: grows to h (0-1) of 900 px, labelled
      const g = Math.min(1, t / 2.2), h = 900 * (p.h ?? 1) * (1 - Math.pow(1 - g, 3));
      return <g><rect x={-110} y={-h} width={220} height={h} fill={p.color || '#3a86ff'} stroke={INK} strokeWidth={6} />
        {[...Array(Math.floor(h / 60))].map((_, i) => <line key={i} x1={-110} y1={-30 - i * 60} x2={110} y2={-30 - i * 60} stroke="rgba(0,0,0,0.25)" strokeWidth={4} />)}
        <rect x={-150} y={-h - 120} width={300} height={100} rx={14} fill="#fff" stroke={INK} strokeWidth={6} />
        <text x={0} y={-h - 52} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={txt.length > 9 ? 36 : 46} fill={INK}>{txt.toUpperCase()}</text></g>;
    }
    case 'confetti': return <g>{[...Array(60)].map((_, i) => { const x = rand(i) * 1100 - 550, y = ((t * (220 + rand(i * 3) * 200)) + rand(i * 5) * 1600) % 1600 - 1500;
      return <rect key={i} x={x} y={y} width={18} height={30} fill={['#ffd166', '#ef476f', '#06d6a0', '#118ab2'][i % 4]} transform={`rotate(${(t * 200 + i * 40) % 360} ${x} ${y})`} />; })}</g>;
    default: return litPiece(kind, t, p);
  }
}
