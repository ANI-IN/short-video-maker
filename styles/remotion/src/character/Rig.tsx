// 2D cutout puppet rig: separate SVG layers (far arm, far leg, torso, near leg, head, near arm, prop) with pivots at
// shoulder/elbow, hip/knee, neck and hip (lean). Facing right by default; `facing: -1` mirrors it.
import React from 'react';
import type { Design } from './design';
import type { Pose } from './poses';

const INK = '#1d1b18';
const SW = 4.5;     // cutout outline width
const L = { thigh: 112, shin: 106, upper: 98, fore: 90, torso: 196, headR: 58 };

const darken = (hex: string, k = 0.78) => {
  const n = hex.replace('#', ''); const v = [0, 2, 4].map((i) => Math.round(parseInt(n.slice(i, i + 2), 16) * k));
  return `rgb(${v.join(',')})`;
};
const rad = (d: number) => (d * Math.PI) / 180;
// rotate a hanging-down vector (0, len) by SVG rotate(-a)
const dirDown = (a: number, len: number) => [Math.sin(rad(a)) * len, Math.cos(rad(a)) * len];

export type RigState = { pose: Pose; blink: boolean; mouthOpen: number; t: number; speaking: boolean; propAtMouth?: boolean };

const Limb: React.FC<{ x: number; y: number; a1: number; a2: number; l1: number; l2: number; w1: number; w2: number; c1: string; c2: string; end?: React.ReactNode; knee?: boolean }> =
  ({ x, y, a1, a2, l1, l2, w1, w2, c1, c2, end, knee }) => (
    <g transform={`translate(${x},${y}) rotate(${-a1})`}>
      <rect x={-w1 / 2} y={-w1 / 2} width={w1} height={l1 + w1 / 2} rx={w1 / 2} fill={c1} stroke={INK} strokeWidth={SW} />
      <g transform={`translate(0,${l1}) rotate(${knee ? a2 : -a2})`}>
        <rect x={-w2 / 2} y={-w2 / 2} width={w2} height={l2 + w2 / 2} rx={w2 / 2} fill={c2} stroke={INK} strokeWidth={SW} />
        <circle cx={0} cy={0} r={w1 / 2 - 2} fill={c1} />
        <g transform={`translate(0,${l2})`}>{end}</g>
      </g>
    </g>
  );

const Prop: React.FC<{ d: Design; kind: string; t: number }> = ({ d, kind, t }) => {
  switch (kind) {
    case 'mace': return <g transform="rotate(-10)"><rect x={-5} y={-30} width={10} height={150} fill="#8d6e3f" stroke={INK} strokeWidth={SW} /><circle cx={0} cy={140} r={34} fill="#f2c94c" stroke={INK} strokeWidth={SW} /><circle cx={0} cy={140} r={14} fill="#d4a017" /></g>;
    case 'sword': return <g transform="rotate(170)"><rect x={-5} y={-10} width={10} height={30} fill="#6d4c2f" stroke={INK} strokeWidth={4} /><rect x={-22} y={18} width={44} height={9} rx={3} fill={d.trim} stroke={INK} strokeWidth={4} /><path d="M -8 27 L 8 27 L 4 175 L 0 190 L -4 175 Z" fill="#dee2e6" stroke={INK} strokeWidth={4} /></g>;
    case 'chakra': return <g transform={`translate(0,-120) rotate(${t * 360})`}><circle r={34} fill="#ffd43b" stroke={INK} strokeWidth={SW} />{[...Array(8)].map((_, i) => <path key={i} transform={`rotate(${i * 45})`} d="M 0 -34 L 7 -48 L -7 -48 Z" fill="#fab005" stroke={INK} strokeWidth={3} />)}<circle r={12} fill="#e8590c" stroke={INK} strokeWidth={3} /></g>;
    case 'dice': return <g transform="translate(0,4)"><rect x={-24} y={-8} width={22} height={22} rx={4} fill="#fff8e7" stroke={INK} strokeWidth={4} transform="rotate(-12)" /><rect x={2} y={-2} width={22} height={22} rx={4} fill="#fff8e7" stroke={INK} strokeWidth={4} transform="rotate(14)" /><circle cx={-13} cy={3} r={3} fill={INK} /><circle cx={13} cy={9} r={3} fill={INK} /></g>;
    case 'scroll': return <g transform="rotate(-80)"><rect x={-12} y={-46} width={24} height={92} rx={8} fill="#f1e3c3" stroke={INK} strokeWidth={4} /><rect x={-16} y={-50} width={32} height={10} rx={4} fill="#b08d57" stroke={INK} strokeWidth={3} /><rect x={-16} y={40} width={32} height={10} rx={4} fill="#b08d57" stroke={INK} strokeWidth={3} /></g>;
    case 'lotus': return <g transform="translate(0,-12)">{[-40, -15, 15, 40].map((a, i) => <ellipse key={i} cx={0} cy={-18} rx={10} ry={24} fill="#f783ac" stroke={INK} strokeWidth={3} transform={`rotate(${a})`} />)}<circle r={9} fill="#ffd43b" stroke={INK} strokeWidth={3} /></g>;
    case 'staff': return <rect x={-6} y={-160} width={12} height={330} rx={6} fill="#8d6e3f" stroke={INK} strokeWidth={SW} />;
    default: return null;
  }
};

const Bow: React.FC = () => (   // held vertically in the far hand
  <g><path d="M 6 -150 Q 70 0 6 150" fill="none" stroke="#7a4b24" strokeWidth={11} strokeLinecap="round" />
    <path d="M 6 -150 Q 70 0 6 150" fill="none" stroke={INK} strokeWidth={3} />
    <line x1={6} y1={-150} x2={6} y2={150} stroke="#f1e3c3" strokeWidth={2.5} /></g>
);

const Head: React.FC<{ d: Design; s: RigState }> = ({ d, s }) => {
  const R = L.headR; const brow = s.pose.brow ?? 0;
  const mouthKind = s.speaking ? 'talk' : s.pose.mouth;
  const eye = (cx: number) => d.blindfold ? null : (d.eyesClosed || s.blink)
    ? <path d={`M ${cx - 9} -6 Q ${cx} ${d.eyesClosed ? 0 : -2} ${cx + 9} -6`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
    : <g><ellipse cx={cx} cy={-6} rx={9.5} ry={11.5} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={cx + 2.5} cy={-5} r={5.2} fill={INK} /><circle cx={cx + 4} cy={-7} r={1.6} fill="#fff" /></g>;
  return (
    <g>
      {/* hair behind */}
      {d.headwear === 'long-hair' || d.headwear === 'veil' ? <path d={`M -48 -20 Q -70 70 -40 120 L 10 110 Q -10 40 -20 -10 Z`} fill={d.headwear === 'veil' ? d.sash : d.hair} stroke={INK} strokeWidth={SW} /> : null}
      <circle cx={-48} cy={4} r={13} fill={d.skin} stroke={INK} strokeWidth={SW} />
      <circle cx={0} cy={0} r={R} fill={d.skin} stroke={INK} strokeWidth={SW} />
      <path d={`M ${-R + 8} 20 A ${R} ${R} 0 0 0 ${R - 14} 32`} fill="none" stroke={d.skinShade} strokeWidth={8} opacity={0.5} />
      {d.jewelry ? <circle cx={-48} cy={22} r={7} fill="#ffd43b" stroke={INK} strokeWidth={2.5} /> : null}
      {/* face, 3/4 view looking right */}
      {eye(16)}{eye(42)}
      {d.blindfold ? <rect x={-52} y={-20} width={112} height={24} rx={8} fill={darken(d.sash, 0.6)} stroke={INK} strokeWidth={3} /> : null}
      <path d={`M 6 ${-24 - brow * 0.4} L 26 ${-26 + brow * 0.4}`} stroke={d.hair === '#e9ecef' ? '#adb5bd' : INK} strokeWidth={5} strokeLinecap="round" />
      <path d={`M 34 ${-26 + brow * 0.4} L 52 ${-24 - brow * 0.4}`} stroke={d.hair === '#e9ecef' ? '#adb5bd' : INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M 56 0 Q 66 12 56 16" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      {d.tilak ? <path d="M 24 -50 L 24 -34" stroke={d.skin === '#3f78d1' ? '#ffd43b' : '#e03131'} strokeWidth={5} strokeLinecap="round" /> : null}
      {mouthKind === 'talk' || mouthKind === 'open'
        ? <ellipse cx={38} cy={32} rx={11} ry={2 + 9 * (mouthKind === 'open' ? 0.8 : s.mouthOpen)} fill="#7a1f1f" stroke={INK} strokeWidth={3} />
        : mouthKind === 'smile' ? <path d="M 26 28 Q 38 40 50 28" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          : mouthKind === 'frown' ? <path d="M 27 36 Q 38 28 49 36" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
            : <path d="M 28 31 L 48 31" stroke={INK} strokeWidth={4} strokeLinecap="round" />}
      {d.mustache ? <path d="M 22 24 Q 38 16 54 24 Q 38 22 22 24 Z" fill={d.beard === 'white' ? '#e9ecef' : '#2b2118'} stroke={INK} strokeWidth={2.5} /> : null}
      {d.beard !== 'none' ? <path d={`M -30 22 Q -20 ${d.old ? 110 : 82} 30 ${d.old ? 104 : 74} Q 58 60 56 36 Q 42 52 22 46 Q 0 40 -30 22 Z`} fill={d.beard === 'white' ? '#f1f3f5' : '#2b2118'} stroke={INK} strokeWidth={SW} /> : null}
      {/* headwear */}
      {d.headwear === 'crown' || d.headwear === 'peacock-crown' ? <g>
        {d.headwear === 'peacock-crown' ? <g transform="translate(-30,-70) rotate(-28)"><path d="M 0 0 Q -14 -70 0 -110 Q 14 -70 0 0" fill="#2b8a3e" stroke={INK} strokeWidth={3} /><ellipse cx={0} cy={-92} rx={12} ry={15} fill="#1c7ed6" stroke={INK} strokeWidth={3} /><ellipse cx={0} cy={-90} rx={5} ry={7} fill="#5f3dc4" /></g> : null}
        {(() => {
          const v = [...d.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
          const metal = ['#f2c94c', '#f2c94c', '#ced4da', '#e8a87c'][v], band = ['#e0a800', '#d9480f', '#868e96', '#c2703d'][v];
          const shape = v === 1 ? 'M -48 -42 L -44 -84 Q -22 -70 -20 -96 Q 0 -122 20 -96 Q 22 -70 44 -84 L 48 -42 Z'          // tiered mukut
            : v === 2 ? 'M -52 -42 L -50 -66 Q 0 -80 50 -66 L 52 -42 Z'                                                         // circlet
              : v === 3 ? 'M -48 -42 L -40 -104 L -14 -76 L 0 -116 L 14 -76 L 40 -104 L 48 -42 Z'                             // tall rose-gold
                : 'M -50 -42 L -46 -96 L -26 -70 L -6 -108 L 14 -70 L 34 -100 L 48 -42 Z';
          return <><path d={shape} fill={metal} stroke={INK} strokeWidth={SW} strokeLinejoin="round" /><rect x={-52} y={-52} width={102} height={16} rx={5} fill={band} stroke={INK} strokeWidth={3.5} /></>;
        })()}
        <circle cx={0} cy={-44} r={7} fill="#e03131" stroke={INK} strokeWidth={2.5} /></g> : null}
      {d.headwear === 'turban' ? <g><path d="M -60 -30 Q -60 -92 0 -92 Q 62 -92 58 -30 Q 0 -48 -60 -30 Z" fill={d.sash} stroke={INK} strokeWidth={SW} /><path d="M -50 -50 Q 0 -70 52 -48" fill="none" stroke={darken(d.sash)} strokeWidth={5} /><circle cx={30} cy={-58} r={9} fill={d.trim} stroke={INK} strokeWidth={3} /></g> : null}
      {d.headwear === 'helmet' ? <g><path d="M -60 -18 Q -60 -98 0 -98 Q 60 -98 60 -18 Z" fill="#adb5bd" stroke={INK} strokeWidth={SW} /><path d="M -6 -98 L 0 -130 L 6 -98" fill={d.sash} stroke={INK} strokeWidth={3} /><rect x={-62} y={-26} width={124} height={12} rx={4} fill={d.trim} stroke={INK} strokeWidth={3} /></g> : null}
      {d.headwear === 'short-hair' || d.headwear === 'cap' ? <g>
        <path d={`M -58 -4 Q -64 -70 0 -66 Q 54 -66 58 -20 Q 34 -46 8 -40 Q -30 -48 -58 -4 Z`} fill={d.hair} stroke={INK} strokeWidth={SW} />
        {d.headwear === 'cap' ? <g><path d="M -58 -34 Q -58 -96 2 -96 Q 60 -96 58 -38 Z" fill={d.sash} stroke={INK} strokeWidth={SW} />
          <path d="M 50 -40 Q 92 -44 104 -30 Q 80 -24 46 -30 Z" fill={darken(d.sash)} stroke={INK} strokeWidth={3.5} /><circle cx={0} cy={-96} r={6} fill={darken(d.sash)} stroke={INK} strokeWidth={2.5} /></g> : null}</g> : null}
      {d.glasses ? <g fill="none" stroke={INK} strokeWidth={4}><circle cx={16} cy={-6} r={15} /><circle cx={44} cy={-6} r={15} /><path d="M 31 -8 L 29 -8" /><path d="M 1 -10 L -40 -14" /></g> : null}
      {d.headwear === 'hair-bun' || d.headwear === 'long-hair' || d.headwear === 'veil' ? <g>
        <path d={`M -58 -6 Q -62 -66 0 -62 Q 50 -62 56 -26 Q 20 -44 -10 -40 Q -40 -36 -58 -6 Z`} fill={d.headwear === 'veil' ? d.sash : d.hair} stroke={INK} strokeWidth={SW} />
        {d.headwear === 'hair-bun' ? <circle cx={-18} cy={-70} r={20} fill={d.hair} stroke={INK} strokeWidth={SW} /> : null}
        {d.headwear !== 'hair-bun' && d.jewelry ? <path d="M -10 -58 L 10 -58 L 0 -40 Z" fill="#ffd43b" stroke={INK} strokeWidth={2.5} /> : null}</g> : null}
    </g>
  );
};

export const Character: React.FC<{ d: Design; s: RigState; facing?: 1 | -1; scale?: number }> = ({ d, s, facing = 1, scale = 1 }) => {
  const p = s.pose; const b = d.build; const h = d.height;
  const breathe = Math.sin(s.t * 2.2) * 2.2;
  const hipY = -(L.thigh + L.shin) * h - 12 + p.drop;
  const neckY = -L.torso * h;
  const tw = 58 * b, ww = 44 * b;
  const limbW = [26 * b, 22 * b], legW = [32 * b, 26 * b];
  const skinFar = darken(d.skin, 0.85);
  const hand = (far: boolean) => <circle r={limbW[1] * 0.62} fill={far ? skinFar : d.skin} stroke={INK} strokeWidth={SW} />;
  const foot = (far: boolean) => <ellipse cx={14} cy={4} rx={22} ry={9} fill={far ? darken('#6d4c2f') : '#6d4c2f'} stroke={INK} strokeWidth={SW} />;
  const sleeve = d.armor ? '#adb5bd' : d.top;
  const nearHandProp = d.prop === 'flute' ? (s.propAtMouth ? null : <g transform="rotate(-70)"><rect x={-6} y={-70} width={12} height={140} rx={6} fill="#8d6e3f" stroke={INK} strokeWidth={3.5} /></g>)
    : d.prop !== 'bow' && d.prop !== 'none' ? <Prop d={d} kind={d.prop} t={s.t} /> : null;
  // female: long skirt that follows the legs loosely
  const kneeX = (hip: number) => Math.sin(rad(hip)) * L.thigh * h;
  return (
    <g transform={`scale(${facing * scale},${scale})`}>
      <ellipse cx={0} cy={6} rx={70 * b} ry={14} fill="rgba(0,0,0,0.22)" />
      <g transform={`translate(0,${breathe * 0.3})`}>
        {/* far arm + far leg (behind body) */}
        <g transform={`translate(0,${hipY}) rotate(${p.torso})`}>
          <Limb x={-tw * 0.35} y={neckY + 22} a1={p.lsh} a2={p.lel} l1={L.upper * h} l2={L.fore * h} w1={limbW[0]} w2={limbW[1]} c1={darken(sleeve, 0.85)} c2={skinFar}
            end={<g>{hand(true)}{d.prop === 'bow' ? <Bow /> : null}</g>} />
        </g>
        <Limb x={-14 * b} y={hipY} a1={p.lhip} a2={p.lknee} l1={L.thigh * h} l2={L.shin * h} w1={legW[0]} w2={legW[1]} c1={darken(d.bottom, 0.85)} c2={d.female ? darken(d.bottom, 0.85) : skinFar} knee end={foot(true)} />
        {/* torso */}
        <g transform={`translate(0,${hipY}) rotate(${p.torso})`}>
          <path d={`M ${-ww} 6 L ${-tw} ${neckY + 30} Q 0 ${neckY + 6} ${tw} ${neckY + 30} L ${ww} 6 Z`} fill={d.armor ? '#ced4da' : d.top} stroke={INK} strokeWidth={SW} strokeLinejoin="round" transform={`scale(1,${1 + breathe * 0.004})`} />
          {d.armor ? <path d={`M ${-ww + 8} -20 L ${-tw + 12} ${neckY + 44} Q 0 ${neckY + 30} ${tw - 12} ${neckY + 44} L ${ww - 8} -20 Z`} fill="none" stroke={d.trim} strokeWidth={6} /> : null}
          {d.modern ? <path d={`M ${-tw + 14} ${neckY + 30} L 0 ${neckY + 62} L ${tw - 14} ${neckY + 30}`} fill="none" stroke={darken(d.top, 0.75)} strokeWidth={8} strokeLinejoin="round" />   /* modern: a collar, no sash */
            : <><path d={`M ${tw - 10} ${neckY + 34} L ${-ww + 4} -6`} stroke={d.sash} strokeWidth={20 * b} strokeLinecap="round" />
              <path d={`M ${tw - 10} ${neckY + 34} L ${-ww + 4} -6`} stroke={INK} strokeWidth={2} opacity={0.35} /></>}
          <rect x={-ww - 4} y={-8} width={(ww + 4) * 2} height={18} rx={6} fill={d.trim} stroke={INK} strokeWidth={3.5} />
          {d.jewelry ? <path d={`M ${-26 * b} ${neckY + 22} Q 0 ${neckY + 62} ${26 * b} ${neckY + 22}`} fill="none" stroke="#ffd43b" strokeWidth={7} /> : null}
          {d.female ? <path d={`M ${-ww - 6} 0 L ${ww + 6} 0 L ${ww + 34 + kneeX(p.rhip) * 0.5} ${-hipY - 30} L ${-ww - 34 + kneeX(p.lhip) * 0.5} ${-hipY - 30} Z`}
            fill={d.bottom} stroke={INK} strokeWidth={SW} strokeLinejoin="round" transform={`rotate(${-p.torso})`} /> : null}
          {/* head */}
          <g transform={`translate(${6},${neckY - L.headR + 8}) rotate(${p.head + Math.sin(s.t * 1.3) * 1.2})`}>
            <rect x={-12} y={L.headR - 18} width={24} height={26} fill={d.skin} stroke={INK} strokeWidth={SW} />
            <Head d={d} s={s} />
            {d.prop === 'flute' && s.propAtMouth ? <g transform="translate(40,34) rotate(-8)"><rect x={-10} y={-6} width={150} height={12} rx={6} fill="#8d6e3f" stroke={INK} strokeWidth={3.5} />{[30, 55, 80, 105].map((x) => <circle key={x} cx={x} cy={0} r={2.6} fill={INK} />)}<rect x={120} y={-8} width={8} height={16} fill="#ffd43b" /></g> : null}
          </g>
        </g>
        {/* near leg, then near arm (in front) */}
        {d.female ? null : <Limb x={14 * b} y={hipY} a1={p.rhip} a2={p.rknee} l1={L.thigh * h} l2={L.shin * h} w1={legW[0]} w2={legW[1]} c1={d.bottom} c2={d.skin} knee end={foot(false)} />}
        {d.female ? <Limb x={14 * b} y={hipY} a1={p.rhip} a2={p.rknee} l1={L.thigh * h} l2={L.shin * h} w1={legW[0]} w2={legW[1]} c1={d.bottom} c2={d.bottom} knee end={foot(false)} /> : null}
        <g transform={`translate(0,${hipY}) rotate(${p.torso})`}>
          <Limb x={tw * 0.42} y={neckY + 22} a1={p.rsh} a2={p.rel} l1={L.upper * h} l2={L.fore * h} w1={limbW[0]} w2={limbW[1]} c1={sleeve} c2={d.skin}
            end={<g>{nearHandProp}{hand(false)}{d.jewelry ? <rect x={-12} y={-24} width={24} height={7} rx={3} fill="#ffd43b" stroke={INK} strokeWidth={2} /> : null}</g>} />
        </g>
      </g>
    </g>
  );
};
