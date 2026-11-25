// "Toon" rig: the documentary look upgrade (reference: big-headed, soft-shaded 2D characters on lit sets).
// Same pose angles and pivots as Rig.tsx (so every pose / walk / gesture keeps working), but:
//  - chunky proportions: head radius 92 (was 58), short thick limbs, pear torso
//  - soft volume shading: every part gets a lit-to-shade gradient (light from the upper left), coloured outlines
//    instead of black ink, a cast shadow under the feet
//  - expressive face: big eyes with two highlights, eyelids (blink / half-lid), thick brows, nose, cheeks, mouth with teeth
//  - wardrobe: jacket + shirt, hoodie, sweater, suit with tie, skirt; chunky shoes with soles; hair with a highlight band
import React from 'react';
import type { Design } from './design';
import type { RigState } from './Rig';

export const TOON = { thigh: 92, shin: 86, upper: 84, fore: 78, torso: 168, headR: 92 };
export const TOON_HEAD_Y = 436;   // head centre above the floor (rig units) - the director frames close-ups on this

const hx = (c: string) => { const n = c.replace('#', ''); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)); };
const shade = (c: string, k: number) => {
  if (!c.startsWith('#') || c.length !== 7) return c;
  const v = hx(c).map((x) => Math.round(k >= 1 ? x + (255 - x) * (k - 1) : x * k));
  return `rgb(${v.map((x) => Math.max(0, Math.min(255, x))).join(',')})`;
};
const line = (c: string) => shade(c, 0.5);
const rad = (d: number) => (d * Math.PI) / 180;
const gid = (c: string) => `tg${c.replace(/[^0-9a-z]/gi, '')}`;
const fill = (c: string) => (c.startsWith('#') && c.length === 7 ? `url(#${gid(c)})` : c);

// one gradient per colour used (ids are colour-derived, so repeats across characters are identical and harmless)
const Grads: React.FC<{ cols: string[] }> = ({ cols }) => (
  <defs>{[...new Set(cols.filter((c) => c && c.startsWith('#') && c.length === 7))].map((c) => (
    <linearGradient key={c} id={gid(c)} x1="0" y1="0" x2="1" y2="0.55">
      <stop offset="0" stopColor={shade(c, 1.16)} /><stop offset="0.42" stopColor={c} /><stop offset="1" stopColor={shade(c, 0.74)} />
    </linearGradient>))}
    <radialGradient id="toon-shadow"><stop offset="0" stopColor="rgba(0,0,0,0.38)" /><stop offset="1" stopColor="rgba(0,0,0,0)" /></radialGradient>
  </defs>
);

const Seg: React.FC<{ w0: number; w1: number; len: number; c: string }> = ({ w0, w1, len, c }) => (
  // tapered capsule hanging down from the joint
  <path d={`M ${-w0 / 2} 0 A ${w0 / 2} ${w0 / 2} 0 0 1 ${w0 / 2} 0 L ${w1 / 2} ${len} A ${w1 / 2} ${w1 / 2} 0 0 1 ${-w1 / 2} ${len} Z`}
    fill={fill(c)} stroke={line(c)} strokeWidth={3} strokeLinejoin="round" />
);

const Limb: React.FC<{ x: number; y: number; a1: number; a2: number; l1: number; l2: number; w: [number, number, number]; c1: string; c2: string; end?: React.ReactNode; knee?: boolean; cuff?: string }> =
  ({ x, y, a1, a2, l1, l2, w, c1, c2, end, knee, cuff }) => (
    <g transform={`translate(${x},${y}) rotate(${-a1})`}>
      <Seg w0={w[0]} w1={w[1]} len={l1} c={c1} />
      <g transform={`translate(0,${l1}) rotate(${knee ? a2 : -a2})`}>
        <Seg w0={w[1]} w1={w[2]} len={l2} c={c2} />
        <circle r={w[1] / 2 - 1.5} fill={c1 === c2 ? fill(c1) : fill(c1)} />
        {cuff ? <rect x={-w[2] / 2 - 2} y={l2 - 8} width={w[2] + 4} height={12} rx={5} fill={cuff} stroke={line(cuff)} strokeWidth={2.5} /> : null}
        <g transform={`translate(0,${l2})`}>{end}</g>
      </g>
    </g>
  );

const Hand: React.FC<{ c: string; r: number }> = ({ c, r }) => (
  <g><ellipse cx={0} cy={r * 0.35} rx={r * 0.95} ry={r * 1.05} fill={fill(c)} stroke={line(c)} strokeWidth={3} />
    <ellipse cx={r * 0.78} cy={r * 0.05} rx={r * 0.36} ry={r * 0.55} fill={fill(c)} stroke={line(c)} strokeWidth={2.5} transform={`rotate(-25 ${r * 0.78} ${r * 0.05})`} /></g>
);
const Shoe: React.FC<{ c: string; far?: boolean }> = ({ c, far }) => (
  <g><path d="M -20 -10 Q -22 -26 0 -26 Q 16 -26 22 -14 Q 44 -10 46 6 L -22 6 Z" fill={fill(far ? shade(c, 0.8) : c)} stroke={line(c)} strokeWidth={3} strokeLinejoin="round" />
    <rect x={-24} y={2} width={72} height={10} rx={5} fill={far ? '#c9c4bb' : '#efe9df'} stroke={line('#9a948a')} strokeWidth={2.5} /></g>
);

const Face: React.FC<{ d: Design; s: RigState; R: number }> = ({ d, s, R }) => {
  const brow = s.pose.brow ?? 0;
  const mouthKind = s.speaking ? 'talk' : s.pose.mouth || 'closed';
  const ex = [R * 0.12, R * 0.56], ey = -R * 0.08, erx = R * 0.2, ery = R * 0.25;
  const lid = d.eyesClosed || s.blink ? 1 : brow > 8 ? 0.28 : brow < -6 ? 0.22 : 0.08;     // worried / angry eyes are half-lidded
  const look = Math.sin(s.t * 0.7) * 2.5;
  const skinL = line(d.skin);
  return (
    <g>
      {/* eyes */}
      {ex.map((cx, i) => (
        <g key={i}>
          <clipPath id={`eye-${d.id}-${i}`}><ellipse cx={cx} cy={ey} rx={erx} ry={ery} /></clipPath>
          <ellipse cx={cx} cy={ey} rx={erx} ry={ery} fill="#fffdf8" />
          <g clipPath={`url(#eye-${d.id}-${i})`}>
            <circle cx={cx + erx * 0.28 + look} cy={ey + 2} r={erx * 0.55} fill="#3b2a1e" />
            <circle cx={cx + erx * 0.28 + look} cy={ey + 2} r={erx * 0.32} fill="#0e0b09" />
            <circle cx={cx + erx * 0.12 + look} cy={ey - ery * 0.22} r={erx * 0.2} fill="#fff" />
            <circle cx={cx + erx * 0.5 + look} cy={ey + ery * 0.2} r={erx * 0.09} fill="#fff" />
            <rect x={cx - erx - 2} y={ey - ery - 2} width={erx * 2 + 4} height={(ery * 2 + 4) * lid} fill={d.skin} />
            {lid > 0.5 ? <path d={`M ${cx - erx} ${ey + 2} Q ${cx} ${ey + 8} ${cx + erx} ${ey + 2}`} fill="none" stroke={skinL} strokeWidth={3.5} strokeLinecap="round" /> : null}
          </g>
          <ellipse cx={cx} cy={ey} rx={erx} ry={ery} fill="none" stroke={skinL} strokeWidth={3} />
          {d.female && lid < 0.5 ? <path d={`M ${cx + erx * 0.7} ${ey - ery * 0.75} l 9 -9 M ${cx + erx * 0.95} ${ey - ery * 0.45} l 11 -5`} stroke="#2a1d16" strokeWidth={3.5} strokeLinecap="round" /> : null}
          {lid < 0.5 ? <line x1={cx - erx * 0.95} y1={ey - ery + (ery * 2) * lid} x2={cx + erx * 0.95} y2={ey - ery + (ery * 2) * lid} stroke={skinL} strokeWidth={3} strokeLinecap="round" /> : null}
        </g>
      ))}
      {/* brows: thick, rounded, they tilt with the pose (brow > 0 worried, < 0 angry) */}
      {ex.map((cx, i) => {
        const inner = i === 0 ? 1 : -1, tilt = brow * 0.7 * inner;
        return <path key={'b' + i} d={`M ${cx - erx} ${ey - ery - 12 - tilt * -0.5} Q ${cx} ${ey - ery - 22} ${cx + erx} ${ey - ery - 12 + tilt * -0.5}`}
          fill="none" stroke={d.old ? '#d9d4cc' : shade(d.hair, 0.9)} strokeWidth={9} strokeLinecap="round" />;
      })}
      {/* nose (3/4 view, on the face edge), cheeks */}
      <path d={`M ${R * 0.78} ${R * 0.02} Q ${R * 1.02} ${R * 0.16} ${R * 0.8} ${R * 0.3}`} fill={fill(d.skin)} stroke={skinL} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={R * 0.08} cy={R * 0.3} rx={R * 0.16} ry={R * 0.09} fill="#e8846b" opacity={0.28} />
      <ellipse cx={R * 0.72} cy={R * 0.34} rx={R * 0.1} ry={R * 0.07} fill="#e8846b" opacity={0.22} />
      {/* mouth */}
      {mouthKind === 'talk' || mouthKind === 'open' ? (() => {
        const o = mouthKind === 'open' ? 0.85 : s.mouthOpen, h = 4 + 22 * o;
        return <g><path d={`M ${R * 0.24} ${R * 0.5} Q ${R * 0.45} ${R * 0.5 + h * 1.25} ${R * 0.66} ${R * 0.5} Z`} fill="#6b1f24" stroke={skinL} strokeWidth={3} strokeLinejoin="round" />
          {h > 9 ? <path d={`M ${R * 0.28} ${R * 0.51} L ${R * 0.62} ${R * 0.51} L ${R * 0.6} ${R * 0.51 + 6} L ${R * 0.3} ${R * 0.51 + 6} Z`} fill="#fff" /> : null}
          {h > 14 ? <ellipse cx={R * 0.45} cy={R * 0.5 + h * 0.85} rx={R * 0.1} ry={h * 0.18} fill="#d9606a" /> : null}</g>;
      })()
        : mouthKind === 'smile' ? <g><path d={`M ${R * 0.22} ${R * 0.46} Q ${R * 0.45} ${R * 0.72} ${R * 0.68} ${R * 0.46} Z`} fill="#6b1f24" stroke={skinL} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M ${R * 0.26} ${R * 0.48} L ${R * 0.64} ${R * 0.48} L ${R * 0.6} ${R * 0.54} L ${R * 0.3} ${R * 0.54} Z`} fill="#fff" /></g>
          : mouthKind === 'frown' ? <path d={`M ${R * 0.28} ${R * 0.58} Q ${R * 0.45} ${R * 0.46} ${R * 0.62} ${R * 0.58}`} fill="none" stroke={skinL} strokeWidth={5} strokeLinecap="round" />
            : <path d={`M ${R * 0.3} ${R * 0.52} Q ${R * 0.45} ${R * 0.57} ${R * 0.6} ${R * 0.5}`} fill="none" stroke={d.female ? '#b8485a' : skinL} strokeWidth={d.female ? 6 : 5} strokeLinecap="round" />}
      {d.mustache ? <path d={`M ${R * 0.2} ${R * 0.42} Q ${R * 0.45} ${R * 0.3} ${R * 0.72} ${R * 0.42} Q ${R * 0.45} ${R * 0.4} ${R * 0.2} ${R * 0.42} Z`} fill={d.beard === 'white' ? '#ece8e1' : '#2b2118'} />
        : null}
    </g>
  );
};

const Hair: React.FC<{ d: Design; R: number; back?: boolean }> = ({ d, R, back }) => {
  const c = d.old ? '#d9d4cc' : d.hair, l = line(c);
  const hw = d.headwear;
  if (back) {
    if (hw === 'cap' && d.female) return <path d={`M ${-R * 0.85} ${-R * 0.3} Q ${-R * 1.35} ${R * 0.4} ${-R * 1.05} ${R * 1.1} Q ${-R * 0.8} ${R * 0.7} ${-R * 0.5} ${-R * 0.1} Z`} fill={fill(c)} stroke={l} strokeWidth={3} />;   // ponytail under the cap
    return hw === 'long-hair' || hw === 'veil' ? <path d={`M ${-R * 0.95} ${-R * 0.2} Q ${-R * 1.2} ${R * 0.9} ${-R * 0.7} ${R * 1.45} L ${R * 0.05} ${R * 1.3} Q ${-R * 0.25} ${R * 0.6} ${-R * 0.2} ${-R * 0.1} Z`}
      fill={fill(hw === 'veil' ? d.sash : c)} stroke={l} strokeWidth={3} /> : null;
  }
  if (hw === 'bald') return <path d={`M ${-R * 0.98} ${R * 0.05} Q ${-R} ${-R * 0.3} ${-R * 0.7} ${-R * 0.45}`} fill="none" stroke={c} strokeWidth={12} strokeLinecap="round" />;
  const crown = <g>
    <path d={`M ${-R * 1.02} ${R * 0.12} Q ${-R * 1.12} ${-R * 1.02} ${R * 0.05} ${-R * 1.06} Q ${R * 0.92} ${-R * 1.02} ${R * 0.98} ${-R * 0.3}
      Q ${R * 0.7} ${-R * 0.58} ${R * 0.3} ${-R * 0.5} Q ${R * 0.12} ${-R * 0.72} ${-R * 0.2} ${-R * 0.52} Q ${-R * 0.55} ${-R * 0.45} ${-R * 0.62} ${-R * 0.05} Z`}
      fill={fill(c)} stroke={l} strokeWidth={3} strokeLinejoin="round" />
    <path d={`M ${-R * 0.7} ${-R * 0.72} Q ${-R * 0.1} ${-R * 1.0} ${R * 0.5} ${-R * 0.84}`} fill="none" stroke={shade(c, 1.6)} strokeWidth={9} strokeLinecap="round" opacity={0.45} />
  </g>;
  return <g>
    {crown}
    {hw === 'hair-bun' ? <circle cx={-R * 0.45} cy={-R * 1.02} r={R * 0.34} fill={fill(c)} stroke={l} strokeWidth={3} /> : null}
    {hw === 'cap' ? <g><path d={`M ${-R * 1.0} ${-R * 0.32} Q ${-R * 1.02} ${-R * 1.12} ${R * 0.02} ${-R * 1.12} Q ${R * 0.98} ${-R * 1.1} ${R * 0.96} ${-R * 0.36} Z`} fill={fill(d.sash)} stroke={line(d.sash)} strokeWidth={3} />
      <path d={`M ${R * 0.86} ${-R * 0.4} Q ${R * 1.5} ${-R * 0.44} ${R * 1.62} ${-R * 0.26} Q ${R * 1.2} ${-R * 0.18} ${R * 0.8} ${-R * 0.28} Z`} fill={fill(shade(d.sash, 0.8))} stroke={line(d.sash)} strokeWidth={3} />
      <circle cx={R * 0.02} cy={-R * 1.12} r={7} fill={shade(d.sash, 0.7)} /></g> : null}
    {hw === 'helmet' ? <path d={`M ${-R * 1.05} ${-R * 0.1} Q ${-R * 1.05} ${-R * 1.15} 0 ${-R * 1.15} Q ${R * 1.05} ${-R * 1.15} ${R * 1.05} ${-R * 0.1} Z`} fill={fill('#aab2bb')} stroke={line('#aab2bb')} strokeWidth={3} /> : null}
    {hw === 'crown' || hw === 'peacock-crown' ? <path d={`M ${-R * 0.8} ${-R * 0.7} L ${-R * 0.74} ${-R * 1.3} L ${-R * 0.36} ${-R * 1.0} L 0 ${-R * 1.42} L ${R * 0.36} ${-R * 1.0} L ${R * 0.74} ${-R * 1.3} L ${R * 0.8} ${-R * 0.7} Z`} fill={fill('#f2c94c')} stroke={line('#f2c94c')} strokeWidth={3} /> : null}
    {hw === 'turban' ? <path d={`M ${-R * 1.08} ${-R * 0.25} Q ${-R * 1.1} ${-R * 1.25} 0 ${-R * 1.25} Q ${R * 1.1} ${-R * 1.25} ${R * 1.02} ${-R * 0.3} Q 0 ${-R * 0.6} ${-R * 1.08} ${-R * 0.25} Z`} fill={fill(d.sash)} stroke={line(d.sash)} strokeWidth={3} /> : null}
  </g>;
};

export const ToonCharacter: React.FC<{ d: Design; s: RigState; facing?: 1 | -1; scale?: number }> = ({ d, s, facing = 1, scale = 1 }) => {
  const L = TOON, R = L.headR, p = s.pose, b = d.build, h = d.height;
  const breathe = Math.sin(s.t * 2.2);
  const hipY = -(L.thigh + L.shin) * h - 14 + p.drop;
  const neckY = -L.torso * h;
  const tw = 80 * b, ww = 64 * b;
  const armW: [number, number, number] = [40 * b, 34 * b, 30 * b], legW: [number, number, number] = [50 * b, 42 * b, 36 * b];
  const skinFar = shade(d.skin, 0.86);
  // wardrobe: modern people get a jacket (or hoodie/sweater by id hash) over a shirt; others keep their palette
  const kind = (d as any).outfit || (d.modern ? (['jacket', 'hoodie', 'sweater', 'suit'] as const)[[...d.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4] : 'tunic');
  const top = d.armor ? '#aab2bb' : d.top, inner = kind === 'suit' ? '#f4f1ea' : d.sash;
  const hsh = [...d.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  // modern wardrobe: real trouser colours (denim, charcoal, khaki, navy) instead of the story palette's bright bottoms
  const pants = d.modern ? ['#34507a', '#3b3d46', '#7a6a52', '#243556', '#5a4a6e'][hsh % 5] : d.bottom;
  const cols = [d.skin, skinFar, top, shade(top, 0.85), inner, pants, shade(pants, 0.85), d.hair, d.old ? '#d9d4cc' : d.hair, d.sash, shade(d.sash, 0.8), '#2f2a26', '#f2c94c', '#aab2bb'];
  const kneeX = (hip: number) => Math.sin(rad(hip)) * L.thigh * h;
  const torsoPath = `M ${-ww} 8 Q ${-ww - 6} ${neckY * 0.45} ${-tw} ${neckY + 34} Q ${-tw + 4} ${neckY + 4} ${-tw * 0.55} ${neckY} L ${tw * 0.55} ${neckY} Q ${tw - 4} ${neckY + 4} ${tw} ${neckY + 34} Q ${ww + 6} ${neckY * 0.45} ${ww} 8 Z`;
  const shoeC = d.modern ? '#3a3f4a' : '#6d4c2f';
  return (
    <g transform={`scale(${facing * scale},${scale})`}>
      <Grads cols={cols} />
      <ellipse cx={0} cy={6} rx={92 * b} ry={18} fill="url(#toon-shadow)" />
      <g transform={`translate(0,${breathe * 0.8})`}>
        {/* far arm, far leg */}
        <g transform={`translate(0,${hipY}) rotate(${p.torso})`}>
          <Limb x={-tw * 0.62} y={neckY + 30} a1={p.lsh} a2={p.lel} l1={L.upper * h} l2={L.fore * h} w={armW} c1={shade(top, 0.85)} c2={shade(top, 0.85)} cuff={kind === 'suit' ? '#e9e4da' : undefined}
            end={<Hand c={skinFar} r={armW[2] * 0.62} />} />
        </g>
        <Limb x={-18 * b} y={hipY} a1={p.lhip} a2={p.lknee} l1={L.thigh * h} l2={L.shin * h} w={legW} c1={shade(pants, 0.85)} c2={shade(pants, 0.85)} knee end={<Shoe c={shoeC} far />} />
        {/* torso */}
        <g transform={`translate(0,${hipY}) rotate(${p.torso})`}>
          <g transform={`scale(1,${1 + breathe * 0.006})`}>
            {d.female && kind !== 'hoodie' ? null : null}
            <path d={torsoPath} fill={fill(kind === 'tunic' ? top : inner)} stroke={line(top)} strokeWidth={3} strokeLinejoin="round" />
            {kind === 'jacket' || kind === 'suit' ? <g>
              {/* open jacket: two front panels leave a V of shirt; lapels */}
              <path d={`M ${-ww} 8 Q ${-ww - 6} ${neckY * 0.45} ${-tw} ${neckY + 34} Q ${-tw + 4} ${neckY + 4} ${-tw * 0.55} ${neckY} L ${-8} ${neckY + 96} L ${-4} 8 Z`} fill={fill(top)} stroke={line(top)} strokeWidth={3} strokeLinejoin="round" />
              <path d={`M ${ww} 8 Q ${ww + 6} ${neckY * 0.45} ${tw} ${neckY + 34} Q ${tw - 4} ${neckY + 4} ${tw * 0.55} ${neckY} L ${14} ${neckY + 96} L ${12} 8 Z`} fill={fill(top)} stroke={line(top)} strokeWidth={3} strokeLinejoin="round" />
              <path d={`M ${-tw * 0.55} ${neckY} L ${-tw * 0.3} ${neckY + 40} L ${-8} ${neckY + 96}`} fill="none" stroke={line(top)} strokeWidth={3} />
              <path d={`M ${tw * 0.55} ${neckY} L ${tw * 0.3} ${neckY + 40} L ${14} ${neckY + 96}`} fill="none" stroke={line(top)} strokeWidth={3} />
              {kind === 'suit' ? <path d={`M 0 ${neckY + 6} L 10 ${neckY + 6} L 14 ${neckY + 70} L 5 ${neckY + 92} L -4 ${neckY + 70} Z`} fill={d.sash} stroke={line(d.sash)} strokeWidth={2.5} /> : null}
              <circle cx={22} cy={neckY + 120} r={4.5} fill={shade(top, 0.6)} />
              <rect x={ww * 0.3} y={-46} width={ww * 0.5} height={6} rx={3} fill={shade(top, 0.7)} />
            </g> : null}
            {kind === 'hoodie' ? <g>
              <path d={torsoPath} fill={fill(top)} stroke={line(top)} strokeWidth={3} strokeLinejoin="round" />
              <path d={`M ${-tw * 0.7} ${neckY + 10} Q 0 ${neckY + 70} ${tw * 0.7} ${neckY + 10}`} fill="none" stroke={shade(top, 0.7)} strokeWidth={10} strokeLinecap="round" />
              <line x1={-6} y1={neckY + 50} x2={-8} y2={neckY + 98} stroke="#f4f1ea" strokeWidth={4} strokeLinecap="round" />
              <line x1={14} y1={neckY + 50} x2={16} y2={neckY + 96} stroke="#f4f1ea" strokeWidth={4} strokeLinecap="round" />
              <path d={`M ${-ww * 0.6} -6 L ${-ww * 0.5} -60 L ${ww * 0.6} -60 L ${ww * 0.7} -6 Z`} fill={shade(top, 0.88)} stroke={line(top)} strokeWidth={2.5} />
            </g> : null}
            {kind === 'sweater' ? <g>
              <path d={torsoPath} fill={fill(top)} stroke={line(top)} strokeWidth={3} strokeLinejoin="round" />
              <path d={`M ${-tw * 0.5} ${neckY + 2} Q 0 ${neckY + 30} ${tw * 0.5} ${neckY + 2}`} fill={fill(inner)} stroke={line(top)} strokeWidth={3} />
              {[0, 1, 2].map((k) => <path key={k} d={`M ${-ww} ${-30 - k * 10} L ${ww} ${-30 - k * 10}`} stroke={shade(top, 0.82)} strokeWidth={4} />)}
            </g> : null}
            {kind === 'tunic' ? <g>
              <path d={`M ${tw - 12} ${neckY + 34} L ${-ww + 4} -6`} stroke={d.sash} strokeWidth={22 * b} strokeLinecap="round" opacity={d.armor ? 0 : 1} />
              <rect x={-ww - 4} y={-10} width={(ww + 4) * 2} height={18} rx={7} fill={fill(d.trim)} stroke={line(d.trim)} strokeWidth={2.5} />
            </g> : null}
            {/* belt line for trousers */}
            {!d.female && kind !== 'hoodie' && kind !== 'tunic' ? <rect x={-ww - 2} y={-6} width={(ww + 2) * 2} height={14} rx={6} fill="#2f2a26" /> : null}
          </g>
          {d.female && !d.modern ? <path d={`M ${-ww - 4} 2 L ${ww + 4} 2 L ${ww + 30 + kneeX(p.rhip) * 0.5} ${-hipY - 120} L ${-ww - 30 + kneeX(p.lhip) * 0.5} ${-hipY - 120} Z`}
            fill={fill(pants)} stroke={line(pants)} strokeWidth={3} strokeLinejoin="round" transform={`rotate(${-p.torso})`} /> : null}
          {/* neck + head */}
          <g transform={`translate(${10},${neckY - R * 0.82}) rotate(${p.head + Math.sin(s.t * 1.3) * 1.6})`}>
            <rect x={-16} y={R * 0.62} width={32} height={R * 0.42} rx={10} fill={skinFar} stroke={line(d.skin)} strokeWidth={3} />
            <Hair d={d} R={R} back />
            {/* ear, head */}
            <ellipse cx={-R * 0.62} cy={R * 0.08} rx={R * 0.17} ry={R * 0.22} fill={fill(d.skin)} stroke={line(d.skin)} strokeWidth={3} />
            <path d={`M ${-R * 0.96} ${-R * 0.1} Q ${-R} ${-R} ${0} ${-R} Q ${R * 0.98} ${-R} ${R * 0.96} ${-R * 0.05} Q ${R * 0.94} ${R * 0.62} ${R * 0.42} ${R * 0.84} Q ${0} ${R * 0.98} ${-R * 0.5} ${R * 0.74} Q ${-R * 0.92} ${R * 0.5} ${-R * 0.96} ${-R * 0.1} Z`}
              fill={fill(d.skin)} stroke={line(d.skin)} strokeWidth={3} />
            <path d={`M ${-R * 0.5} ${R * 0.74} Q ${0} ${R * 0.98} ${R * 0.42} ${R * 0.84}`} fill="none" stroke={shade(d.skin, 0.8)} strokeWidth={8} opacity={0.5} />
            {d.beard !== 'none' ? <path d={`M ${-R * 0.7} ${R * 0.3} Q ${-R * 0.6} ${R * (d.old ? 1.35 : 1.05)} ${R * 0.2} ${R * (d.old ? 1.25 : 0.98)} Q ${R * 0.85} ${R * 0.78} ${R * 0.82} ${R * 0.42} Q ${R * 0.5} ${R * 0.7} ${R * 0.1} ${R * 0.62} Q ${-R * 0.3} ${R * 0.56} ${-R * 0.7} ${R * 0.3} Z`}
              fill={fill(d.beard === 'white' ? '#ece8e1' : '#2b2118')} stroke={line(d.beard === 'white' ? '#ece8e1' : '#2b2118')} strokeWidth={3} /> : null}
            <Face d={d} s={s} R={R} />
            <Hair d={d} R={R} />
            {d.glasses ? <g fill="rgba(255,255,255,0.12)" stroke="#2a2420" strokeWidth={5}>
              <rect x={R * 0.12 - 26} y={-R * 0.08 - 24} width={52} height={46} rx={16} /><rect x={R * 0.56 - 26} y={-R * 0.08 - 24} width={52} height={46} rx={16} />
              <path d={`M ${R * 0.12 + 26} ${-R * 0.1} L ${R * 0.56 - 26} ${-R * 0.1}`} fill="none" /><path d={`M ${R * 0.12 - 26} ${-R * 0.12} L ${-R * 0.55} ${-R * 0.06}`} fill="none" /></g> : null}
          </g>
        </g>
        {/* near leg, near arm */}
        <Limb x={20 * b} y={hipY} a1={p.rhip} a2={p.rknee} l1={L.thigh * h} l2={L.shin * h} w={legW} c1={pants} c2={pants} knee end={<Shoe c={shoeC} />} />
        <g transform={`translate(0,${hipY}) rotate(${p.torso})`}>
          <Limb x={tw * 0.6} y={neckY + 30} a1={p.rsh} a2={p.rel} l1={L.upper * h} l2={L.fore * h} w={armW} c1={top} c2={top} cuff={kind === 'suit' ? '#f4f1ea' : kind === 'sweater' || kind === 'hoodie' ? shade(top, 0.8) : undefined}
            end={<Hand c={d.skin} r={armW[2] * 0.62} />} />
        </g>
      </g>
    </g>
  );
};
