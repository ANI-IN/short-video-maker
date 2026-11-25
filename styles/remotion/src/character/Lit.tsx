// Lit sets (documentary look upgrade). Compared with the flat ink sets in Sets.tsx these have:
//  - light: wall/floor gradients, light pools and volumetric cones (screen-blended), ambient occlusion where wall meets
//    floor, atmospheric depth (far layers hazier), soft coloured outlines instead of black ink
//  - set dressing density: shelves, corkboards, windows with skylines, racks, crowds, screens
//  - ambient motion: dust motes in light, flickering lamps/torches, sweeping spotlights, bobbing crowds, scrolling tickers,
//    steam, page flutter - so a held shot is never a still frame
//  - designed in-world text props (comic cover, newspaper, ranking board, calendar, lightbox stat, year flip-board,
//    LED screen) with real typography; all text sits high (above the caption band) and is registered with the director
import React from 'react';
import { rand } from '../lib/util';
import { F } from '../lib/fonts';

const FLOOR = 1340;
type Layers = { sky: React.ReactNode; far: React.ReactNode; mid: React.ReactNode; floor: React.ReactNode; tint?: string; top?: React.ReactNode; front?: React.ReactNode };
const OL = 'rgba(20,14,10,0.45)';   // soft outline
const SCREEN: React.CSSProperties = { mixBlendMode: 'screen' };

const lin = (id: string, stops: [number, string, number?][], x2 = 0, y2 = 1) => (
  <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>{stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}</linearGradient>
);
const radial = (id: string, c: string, a = 1) => (
  <radialGradient id={id}><stop offset="0" stopColor={c} stopOpacity={a} /><stop offset="0.55" stopColor={c} stopOpacity={a * 0.35} /><stop offset="1" stopColor={c} stopOpacity={0} /></radialGradient>
);
const Pool = ({ cx, cy, rx, ry, id, o = 1 }: { cx: number; cy: number; rx: number; ry: number; id: string; o?: number }) =>
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id})`} opacity={o} style={SCREEN} />;
const Cone = ({ x, y, w0, w1, h, id, o = 1 }: { x: number; y: number; w0: number; w1: number; h: number; id: string; o?: number }) =>
  <path d={`M ${x - w0 / 2} ${y} L ${x + w0 / 2} ${y} L ${x + w1 / 2} ${y + h} L ${x - w1 / 2} ${y + h} Z`} fill={`url(#${id})`} opacity={o} style={SCREEN} />;
const Motes = ({ x, y, w, h, t, n = 26, c = '#fff4d6', seed = 1 }: { x: number; y: number; w: number; h: number; t: number; n?: number; c?: string; seed?: number }) => (
  <g style={SCREEN}>{[...Array(n)].map((_, i) => {
    const px = x + ((rand(seed + i) * w + Math.sin(t * 0.4 + i) * 30) % w), py = y + ((rand(seed + i * 7) * h - t * (8 + rand(i) * 14)) % h + h) % h;
    return <circle key={i} cx={px} cy={py} r={1.5 + rand(seed + i * 3) * 2.8} fill={c} opacity={0.25 + 0.45 * Math.abs(Math.sin(t * 1.3 + i))} />;
  })}</g>
);
const AO = ({ y = FLOOR, c = '#000', o = 0.42 }: { y?: number; c?: string; o?: number }) => (
  <g><defs>{lin('ao-g', [[0, c, 0], [0.75, c, o], [1, c, o * 0.6]])}</defs><rect x={-220} y={y - 90} width={1520} height={100} fill="url(#ao-g)" /></g>
);
const Planks = ({ c1, c2, seam, glow }: { c1: string; c2: string; seam: string; glow?: string }) => (
  <g><defs>{lin('pl-g', [[0, c1], [1, c2]])}</defs>
    <rect x={-220} y={FLOOR - 8} width={1520} height={1920 - FLOOR + 8} fill="url(#pl-g)" />
    {[...Array(15)].map((_, i) => <line key={i} x1={540 + (i - 7) * 90} y1={FLOOR - 8} x2={540 + (i - 7) * 330} y2={1920} stroke={seam} strokeWidth={3} opacity={0.55} />)}
    {[...Array(26)].map((_, i) => { const r = Math.floor(i / 6), k = i % 6, y = FLOOR + 30 + r * r * 34 + r * 26;
      return <line key={'j' + i} x1={540 + (k - 3 + (r % 2) * 0.5) * (90 + r * 90)} y1={y} x2={540 + (k - 3 + (r % 2) * 0.5) * (90 + r * 90) + 12} y2={y + 20 + r * 8} stroke={seam} strokeWidth={3} opacity={0.5} />; })}
    {glow ? <ellipse cx={540} cy={FLOOR + 160} rx={560} ry={150} fill={`url(#${glow})`} style={SCREEN} opacity={0.7} /> : null}
  </g>
);
const Skyline = ({ y, c, lit, seed, t, n = 12 }: { y: number; c: string; lit: string; seed: number; t: number; n?: number }) => (
  <g>{[...Array(n)].map((_, i) => {
    const w = 70 + rand(seed + i) * 80, h = 140 + rand(seed + i * 5) * 360, x = -40 + (i * 1160) / n;
    return <g key={i}><rect x={x} y={y - h} width={w} height={h + 500} fill={c} />
      {rand(seed + i * 9) > 0.6 ? <rect x={x + w * 0.45} y={y - h - 40} width={6} height={40} fill={c} /> : null}
      {[...Array(Math.floor(h / 42))].map((_, r) => [0, 1, 2].map((k) => rand(seed + i * 31 + r * 7 + k) > 0.5 ?
        <rect key={r + '-' + k} x={x + 8 + k * (w - 16) / 3} y={y - h + 14 + r * 42} width={(w - 16) / 3 - 8} height={20} fill={lit} opacity={0.5 + 0.4 * Math.abs(Math.sin(t * 0.25 + i * 1.7 + r))} /> : null))}</g>;
  })}</g>
);
const Frame = ({ x, y, w, h, c, children, id }: { x: number; y: number; w: number; h: number; c: string; children?: React.ReactNode; id: string }) => (
  <g><clipPath id={id}><rect x={x} y={y} width={w} height={h} /></clipPath><g clipPath={`url(#${id})`}>{children}</g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={c} strokeWidth={22} /><rect x={x - 11} y={y - 11} width={w + 22} height={h + 22} fill="none" stroke={OL} strokeWidth={3} />
    <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={c} strokeWidth={12} /><line x1={x} y1={y + h * 0.45} x2={x + w} y2={y + h * 0.45} stroke={c} strokeWidth={12} />
    <rect x={x - 26} y={y + h + 4} width={w + 52} height={22} rx={4} fill={c} stroke={OL} strokeWidth={3} /></g>
);
const COVER_COLS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#e9c46a', '#8338ec', '#ff006e', '#3a86ff', '#06d6a0', '#fb5607'];
// a mini comic cover (rack / shelf filler): colour field, title bar, a burst and a figure silhouette
const MiniCover = ({ x, y, w, h, seed }: { x: number; y: number; w: number; h: number; seed: number }) => {
  const c = COVER_COLS[Math.floor(rand(seed) * COVER_COLS.length)], c2 = COVER_COLS[Math.floor(rand(seed * 3 + 1) * COVER_COLS.length)];
  return <g><rect x={x} y={y} width={w} height={h} fill={c} stroke={OL} strokeWidth={2.5} />
    <rect x={x + 4} y={y + 4} width={w - 8} height={h * 0.2} fill="#fff8e8" /><rect x={x + 8} y={y + 8} width={(w - 16) * (0.5 + rand(seed * 7) * 0.4)} height={h * 0.08} fill={c2} />
    <circle cx={x + w * 0.55} cy={y + h * 0.6} r={w * 0.3} fill={c2} opacity={0.8} />
    <path d={`M ${x + w * 0.3} ${y + h - 6} L ${x + w * 0.42} ${y + h * 0.5} L ${x + w * 0.6} ${y + h * 0.46} L ${x + w * 0.7} ${y + h - 6} Z`} fill="rgba(20,14,10,0.75)" /></g>;
};
const Shelf = ({ x, y, w, rows, seed, wood = '#6b4226' }: { x: number; y: number; w: number; rows: number; seed: number; wood?: string }) => (
  <g>{[...Array(rows)].map((_, r) => {
    let cx = x + 10; const items: React.ReactNode[] = [];
    for (let i = 0; cx < x + w - 30; i++) {
      const bw = 14 + rand(seed + r * 40 + i) * 18, bh = 70 + rand(seed + r * 40 + i * 3) * 40;
      items.push(<rect key={i} x={cx} y={y + r * 130 + 120 - bh} width={bw} height={bh} fill={COVER_COLS[Math.floor(rand(seed + r * 50 + i * 7) * 10)]} stroke={OL} strokeWidth={2} />);
      cx += bw + 3;
    }
    return <g key={r}>{items}<rect x={x - 8} y={y + r * 130 + 118} width={w + 16} height={16} fill={wood} stroke={OL} strokeWidth={3} /></g>;
  })}</g>
);
const Cork = ({ x, y, w, h, seed, t }: { x: number; y: number; w: number; h: number; seed: number; t: number }) => (
  <g><rect x={x} y={y} width={w} height={h} rx={6} fill="#b88a5a" stroke="#6b4226" strokeWidth={10} />
    {[...Array(6)].map((_, i) => { const px = x + 20 + (i % 3) * (w - 40) / 3, py = y + 18 + Math.floor(i / 3) * (h - 30) / 2, pw = (w - 40) / 3 - 14, ph = (h - 30) / 2 - 14;
      return <g key={i} transform={`rotate(${(rand(seed + i) - 0.5) * 8 + (i === 2 ? Math.sin(t * 2) * 1.2 : 0)} ${px + pw / 2} ${py})`}>
        <rect x={px} y={py} width={pw} height={ph} fill="#fffaf0" stroke={OL} strokeWidth={2} />
        {[0, 1, 2, 3].map((k) => <rect key={k} x={px + 6 + (k % 2) * (pw - 12) / 2} y={py + 8 + Math.floor(k / 2) * (ph - 14) / 2} width={(pw - 12) / 2 - 4} height={(ph - 14) / 2 - 5} fill="none" stroke="#6c757d" strokeWidth={2} />)}
        <path d={`M ${px + 12} ${py + ph * 0.38} q ${pw * 0.12} -${ph * 0.14} ${pw * 0.22} 0`} fill="none" stroke="#343a40" strokeWidth={2} />
        <circle cx={px + pw / 2} cy={py + 2} r={5} fill={['#e63946', '#ffd166', '#118ab2'][i % 3]} /></g>; })}</g>
);
const Lamp = ({ x, y, t, seed, c = '#ffe3a3' }: { x: number; y: number; t: number; seed: number; c?: string }) => {
  const f = 0.88 + 0.12 * Math.abs(Math.sin(t * 7 + seed) * Math.sin(t * 2.3 + seed * 2));
  return <g><line x1={x} y1={0} x2={x} y2={y} stroke="#2b2420" strokeWidth={4} />
    <path d={`M ${x - 46} ${y + 40} Q ${x} ${y - 22} ${x + 46} ${y + 40} Z`} fill="#2f5d50" stroke={OL} strokeWidth={3} />
    <ellipse cx={x} cy={y + 40} rx={30} ry={8} fill={c} opacity={f} />
    <Cone x={x} y={y + 40} w0={80} w1={520} h={760} id="cone-warm" o={0.55 * f} /></g>;
};
const Crowd = ({ y, t, seed, rows = 2, c = '#14121c', glow = true }: { y: number; t: number; seed: number; rows?: number; c?: string; glow?: boolean }) => (
  <g>{[...Array(rows)].map((_, r) => <g key={r}>{[...Array(9 + r)].map((_, i) => {
    const cx = -60 + i * (1200 / (8 + r)) + (r % 2) * 50 + rand(seed + i + r * 20) * 30, cy = y + r * 90 + Math.abs(Math.sin(t * 3 + i * 1.3 + r)) * -6, s = 1 + r * 0.25;
    const phone = glow && rand(seed + i * 5 + r) > 0.62;
    return <g key={i} transform={`translate(${cx},${cy}) scale(${s})`}>
      <path d="M -70 120 Q -66 40 0 36 Q 66 40 70 120 Z" fill={c} /><ellipse cx={0} cy={0} rx={38} ry={44} fill={c} />
      {phone ? <g transform={`translate(${28},${-60 - Math.sin(t * 2 + i) * 6}) rotate(${-8 + rand(i) * 16})`}><rect x={-14} y={-24} width={28} height={46} rx={5} fill="#cfe8ff" style={SCREEN} />
        <rect x={-30} y={-40} width={60} height={78} rx={30} fill="url(#phone-glow)" style={SCREEN} /></g> : null}</g>;
  })}</g>)}</g>
);
const Spot = ({ x, t, ph, c = 'spot-g', len = 1500 }: { x: number; t: number; ph: number; c?: string; len?: number }) => {
  const a = Math.sin(t * 0.7 + ph) * 18;
  return <g transform={`rotate(${a} ${x} 40)`}><path d={`M ${x - 18} 40 L ${x + 18} 40 L ${x + 170} ${40 + len} L ${x - 170} ${40 + len} Z`} fill={`url(#${c})`} style={SCREEN} opacity={0.6} /></g>;
};
const Steam = ({ x, y, t }: { x: number; y: number; t: number }) => (
  <g>{[0, 1, 2].map((k) => { const ph = (t * 0.6 + k / 3) % 1;
    return <path key={k} d={`M ${x + Math.sin(ph * 6 + k) * 6} ${y - ph * 90} q 12 -14 0 -28 q -12 -14 0 -28`} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.35 * (1 - ph)} />; })}</g>
);

export function litBackdrop(kind: string, t: number, p: any = {}): Layers | null {
  switch (kind) {
    // ---- 1960s comic studio at night: drafting tables under green lamps, pinned pages, a window on the city ----
    case 'comic-bullpen': return {
      sky: <g><defs>{lin('bp-wall', [[0, '#5a4636'], [0.7, '#3d2e24']])}{lin('cone-warm', [[0, '#ffe3a3', 0.85], [1, '#ffe3a3', 0]])}{radial('pool-warm', '#ffcf7a', 0.9)}
        {lin('bp-night', [[0, '#0d1633'], [1, '#2b3a6b']])}{radial('moon-g', '#fff6d6', 1)}</defs>
        <rect x={-220} y={0} width={1520} height={1920} fill="url(#bp-wall)" />
        {[...Array(16)].map((_, i) => <rect key={i} x={-220 + i * 100} y={0} width={50} height={FLOOR} fill="#fff" opacity={0.025} />)}
        <rect x={-220} y={FLOOR - 300} width={1520} height={300} fill="#2e221b" /><rect x={-220} y={FLOOR - 306} width={1520} height={14} fill="#7a5a3e" /></g>,
      far: <g>
        <Frame x={330} y={210} w={420} h={520} c="#3a2a20" id="bp-win">
          <rect x={330} y={210} width={420} height={520} fill="url(#bp-night)" /><circle cx={650} cy={300} r={90} fill="url(#moon-g)" /><circle cx={650} cy={300} r={30} fill="#fff6d6" />
          <Skyline y={760} c="#1a2246" lit="#ffd88a" seed={5} t={t} n={9} />
        </Frame>
        <Cork x={-120} y={260} w={380} h={330} seed={3} t={t} />
        <Shelf x={810} y={250} w={340} rows={3} seed={11} />
        <g transform="translate(830,700)"><rect width={300} height={100} rx={6} fill="#c9b79c" stroke={OL} strokeWidth={3} />
          <text x={150} y={64} textAnchor="middle" fontFamily={F.typewriter} fontSize={40} fill="#3b2a1e">{(p.door || 'BULLPEN').toUpperCase()}</text></g>
      </g>,
      mid: <g>
        {[[150, 0.82], [930, 0.82]].map(([x, s], i) => <g key={i} transform={`translate(${x},${FLOOR - 200}) scale(${s})`}>
          <path d="M -150 0 L -110 -10 L 150 -150 L 190 -130 Z" fill="#c8a477" stroke={OL} strokeWidth={3} /><path d="M -96 -20 L 130 -138 L 150 -126 L -76 -8 Z" fill="#fffaf0" />
          <line x1={-120} y1={0} x2={-140} y2={200} stroke="#3a2a20" strokeWidth={12} /><line x1={160} y1={-130} x2={170} y2={200} stroke="#3a2a20" strokeWidth={12} /></g>)}
        <Lamp x={190} y={260} t={t} seed={1} /><Lamp x={890} y={240} t={t} seed={4} />
        <Motes x={-80} y={320} w={1240} h={900} t={t} seed={7} />
      </g>,
      floor: <g><Planks c1="#6e4a30" c2="#3f2a1c" seam="#2a1b12" glow="pool-warm" /><AO /></g>,
      top: <g>{[540].map((x) => <g key={x}><line x1={x} y1={0} x2={x} y2={70} stroke="#2b2420" strokeWidth={4} /><ellipse cx={x} cy={84} rx={60} ry={18} fill="#e9d8a6" /><ellipse cx={x} cy={150} rx={240} ry={70} fill="url(#pool-warm)" style={SCREEN} opacity={0.35} /></g>)}</g>,
      front: <g><path d={`M -120 1790 L 1200 1760 L 1200 1940 L -120 1940 Z`} fill="#4a3120" stroke={OL} strokeWidth={3} />
        <g transform="translate(130,1760)"><rect x={-34} y={-70} width={68} height={74} rx={10} fill="#8d99ae" stroke={OL} strokeWidth={3} />{[-18, 0, 16].map((dx, i) => <rect key={i} x={dx - 4} y={-130 + i * 8} width={8} height={70} fill={['#ffd166', '#e63946', '#118ab2'][i]} transform={`rotate(${dx / 3} ${dx} -60)`} />)}</g>
        <g transform="translate(930,1758)"><rect x={-40} y={-66} width={80} height={70} rx={10} fill="#f4f1ea" stroke={OL} strokeWidth={3} /><path d="M 40 -50 q 30 0 30 22 q 0 22 -30 22" fill="none" stroke="#f4f1ea" strokeWidth={10} /><Steam x={0} y={-74} t={t} /></g></g>,
    };
    // ---- 1962 street newsstand at golden hour: racks of comics, awning, brick walls ----
    case 'newsstand': return {
      sky: <g><defs>{lin('ns-sky', [[0, '#f9c784'], [0.5, '#f4845f'], [1, '#7b4b94']])}{radial('pool-sun', '#ffd59e', 0.9)}{lin('brick', [[0, '#9c4a3c'], [1, '#6e2f27']])}</defs>
        <rect x={-220} y={0} width={1520} height={1920} fill="url(#ns-sky)" /><circle cx={820} cy={330} r={150} fill="url(#pool-sun)" style={SCREEN} /></g>,
      far: <g opacity={0.9}>{[-180, 200, 640, 1000].map((x, i) => <g key={i}><rect x={x} y={180 + (i % 2) * 120} width={360} height={1400} fill={i % 2 ? '#7a3b31' : '#8a4536'} />
        {[...Array(9)].map((_, r) => [0, 1, 2].map((k) => <rect key={r + '-' + k} x={x + 40 + k * 105} y={240 + (i % 2) * 120 + r * 110} width={60} height={74} fill={rand(i * 40 + r * 3 + k) > 0.6 ? '#ffd59e' : '#3b2430'} stroke="#4a2420" strokeWidth={4} />))}
        <path d={`M ${x + 30} ${700 + (i % 2) * 120} l 300 0 m -300 110 l 300 0`} stroke="#2d1c1c" strokeWidth={6} /></g>)}<rect x={-220} y={0} width={1520} height={1920} fill="#f4845f" opacity={0.12} /></g>,
      mid: <g>
        <rect x={40} y={FLOOR - 820} width={1000} height={820} fill="url(#brick)" stroke={OL} strokeWidth={3} />
        <path d={`M 20 ${FLOOR - 860} L 1060 ${FLOOR - 860} L 1100 ${FLOOR - 730} L -20 ${FLOOR - 730} Z`} fill="#2d6a4f" stroke={OL} strokeWidth={3} />
        {[...Array(10)].map((_, i) => <path key={i} d={`M ${-20 + i * 112} ${FLOOR - 730} q 56 40 112 0`} fill={i % 2 ? '#f1faee' : '#2d6a4f'} stroke={OL} strokeWidth={2} />)}
        <text x={540} y={FLOOR - 772} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={58} fill="#f1faee" letterSpacing={8}>{(p.sign || 'NEWS · COMICS').toUpperCase()}</text>
        {[...Array(3)].map((_, r) => [...Array(7)].map((_, i) => <MiniCover key={r + '-' + i} x={80 + i * 132} y={FLOOR - 690 + r * 175} w={112} h={155} seed={r * 17 + i * 3 + 2} />))}
        <line x1={60} y1={FLOOR - 700} x2={1020} y2={FLOOR - 700} stroke="#2d1c1c" strokeWidth={4} />
        <rect x={40} y={FLOOR - 150} width={1000} height={150} fill="#5b3a29" stroke={OL} strokeWidth={3} />
        <Pool cx={540} cy={FLOOR - 400} rx={700} ry={500} id="pool-sun" o={0.35} />
      </g>,
      floor: <g><defs>{lin('ns-pave', [[0, '#a39a8f'], [1, '#6f665d']])}</defs><rect x={-220} y={FLOOR - 8} width={1520} height={700} fill="url(#ns-pave)" />
        {[...Array(8)].map((_, i) => <line key={i} x1={-220} y1={FLOOR + 30 + i * i * 14} x2={1300} y2={FLOOR + 30 + i * i * 14} stroke="#5e564e" strokeWidth={3} opacity={0.6} />)}
        <rect x={-220} y={1840} width={1520} height={26} fill="#d8d2c8" /><AO o={0.32} /></g>,
      front: <g><g transform="translate(970,1830)"><rect x={-90} y={-90} width={180} height={90} fill="#efe6d2" stroke={OL} strokeWidth={3} /><path d="M -90 -60 l 180 0 M -90 -30 l 180 0" stroke="#7a6a55" strokeWidth={3} />
        <path d="M -90 -46 L 90 -46" stroke="#8b2d1e" strokeWidth={8} /></g></g>,
      tint: 'rgba(255,140,60,0.06)',
    };
    // ---- convention hall (Hall H style, original): giant LED wall, sweeping spots, crowd with phones ----
    case 'convention-hall': return {
      sky: <g><defs>{lin('ch-bg', [[0, '#07060f'], [1, '#141029']])}{lin('spot-g', [[0, '#e0eaff', 0.75], [1, '#e0eaff', 0]])}{radial('phone-glow', '#9fd3ff', 0.8)}
        {lin('led', [[0, '#1b0f3a'], [0.5, '#3a0f2e'], [1, '#0f1a3a']], 1, 1)}{radial('pool-stage', '#8fb8ff', 0.8)}</defs>
        <rect x={-220} y={0} width={1520} height={1920} fill="url(#ch-bg)" /></g>,
      far: <g>
        <rect x={-60} y={150} width={1200} height={660} rx={8} fill="url(#led)" stroke="#2a2a3a" strokeWidth={10} />
        {[...Array(30)].map((_, i) => <circle key={i} cx={-40 + rand(i) * 1160} cy={170 + rand(i * 3) * 620} r={2 + rand(i * 5) * 3} fill="#ff6bd6" opacity={0.3 + 0.4 * Math.abs(Math.sin(t + i))} style={SCREEN} />)}
        <text x={540} y={430} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={p.screen && p.screen.length > 14 ? 78 : 104} fill="#f8f0ff" letterSpacing={6}>{(p.screen || 'HALL H').toUpperCase()}</text>
        <text x={540} y={530} textAnchor="middle" fontFamily={F.sans} fontWeight={500} fontSize={52} fill="#c7b8ff" letterSpacing={10}>{(p.screen2 || '').toUpperCase()}</text>
        <rect x={-60} y={150} width={1200} height={660} fill="url(#led-scan)" opacity={0.25} />
        <defs><pattern id="led-scan" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="3" fill="#000" /></pattern></defs>
      </g>,
      mid: <g>
        <path d={`M -220 ${FLOOR - 120} L 1300 ${FLOOR - 120} L 1300 ${FLOOR + 40} L -220 ${FLOOR + 40} Z`} fill="#1d1a2e" />
        <g transform={`translate(800,${FLOOR})`}><path d="M -70 0 L -54 -230 L 54 -230 L 70 0 Z" fill="#2a2540" stroke="#4b4370" strokeWidth={3} /><rect x={-80} y={-250} width={160} height={30} rx={6} fill="#3a3358" />
          <line x1={-20} y1={-250} x2={-40} y2={-320} stroke="#888" strokeWidth={4} /><circle cx={-40} cy={-322} r={7} fill="#222" /></g>
        {[0, 1, 2, 3].map((k) => <Spot key={k} x={120 + k * 280} t={t} ph={k * 1.7} />)}
        <Pool cx={540} cy={FLOOR - 200} rx={620} ry={360} id="pool-stage" o={0.45} />
      </g>,
      floor: <g><defs>{lin('ch-floor', [[0, '#2a2442'], [1, '#0c0a16']])}</defs><rect x={-220} y={FLOOR - 8} width={1520} height={700} fill="url(#ch-floor)" />
        <rect x={-220} y={FLOOR - 8} width={1520} height={12} fill="#8fb8ff" opacity={0.5} />
        <ellipse cx={540} cy={FLOOR + 60} rx={560} ry={60} fill="#c7b8ff" opacity={0.12} /></g>,
      top: <g><rect x={-200} y={60} width={1480} height={26} fill="#2b2b3a" />{[...Array(9)].map((_, i) => <g key={i}><rect x={-40 + i * 140} y={86} width={44} height={34} rx={6} fill="#3a3a4a" />
        <circle cx={-18 + i * 140} cy={124} r={9} fill={['#ff6bd6', '#8fb8ff', '#fff3b0'][i % 3]} opacity={0.6 + 0.4 * Math.sin(t * 4 + i)} /></g>)}
        {[...Array(5)].map((_, i) => (Math.floor(t * 3 + i * 7) % 11 === 0 ? <circle key={'f' + i} cx={100 + rand(i + Math.floor(t * 3)) * 880} cy={1500} r={60} fill="#fff" opacity={0.5} style={SCREEN} /> : null))}</g>,
      front: <Crowd y={1690} t={t} seed={3} rows={2} />,
    };
    // ---- TV news studio: video wall with headline, lower third, scrolling ticker ----
    case 'newsroom': {
      const tick = ((p.ticker || 'BREAKING · ') + '   ').repeat(4);
      return {
        sky: <g><defs>{lin('nr-bg', [[0, '#0b1a33'], [1, '#132a52']])}{lin('nr-wall', [[0, '#1d3d73'], [1, '#0e2347']], 1, 1)}{radial('pool-blue', '#7fb4ff', 0.8)}</defs>
          <rect x={-220} y={0} width={1520} height={1920} fill="url(#nr-bg)" />
          {[...Array(14)].map((_, i) => <rect key={i} x={-220 + i * 110} y={0} width={4} height={FLOOR} fill="#5b8bd6" opacity={0.18} />)}</g>,
        far: <g>
          {[[-60, 180], [340, 180], [740, 180], [-60, 520], [340, 520], [740, 520]].map(([x, y], i) => <rect key={i} x={x + 6} y={y + 6} width={388} height={328} fill="url(#nr-wall)" stroke="#06101f" strokeWidth={8} />)}
          <rect x={-60} y={180} width={1200} height={680} fill="none" stroke="#06101f" strokeWidth={10} />
          <text x={540} y={420} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={p.screen && p.screen.length > 16 ? 74 : 96} fill="#ffffff">{(p.screen || 'BREAKING').toUpperCase()}</text>
          <text x={540} y={520} textAnchor="middle" fontFamily={F.sans} fontWeight={500} fontSize={52} fill="#bcd6ff">{p.screen2 || ''}</text>
          <rect x={-60} y={700} width={1200} height={90} fill="#c1121f" /><text x={70} y={762} fontFamily={F.heavy} fontWeight={900} fontSize={50} fill="#fff">{(p.lower || 'BREAKING').toUpperCase()}</text>
          <clipPath id="tick-c"><rect x={-60} y={790} width={1200} height={70} /></clipPath>
          <rect x={-60} y={790} width={1200} height={70} fill="#0a1222" />
          <g clipPath="url(#tick-c)"><text x={1140 - ((t * 160) % 2400)} y={840} fontFamily={F.sans} fontWeight={500} fontSize={40} fill="#ffd166">{tick.toUpperCase()}</text></g>
        </g>,
        mid: <g><path d={`M -40 ${FLOOR - 40} Q 540 ${FLOOR - 160} 1120 ${FLOOR - 40} L 1120 ${FLOOR + 20} Q 540 ${FLOOR - 100} -40 ${FLOOR + 20} Z`} fill="#1b2f55" stroke="#7fb4ff" strokeWidth={3} />
          <Pool cx={540} cy={FLOOR - 300} rx={700} ry={420} id="pool-blue" o={0.35} /></g>,
        floor: <g><defs>{lin('nr-floor', [[0, '#1a2c50'], [1, '#08111f']])}</defs><rect x={-220} y={FLOOR - 8} width={1520} height={700} fill="url(#nr-floor)" />
          {[...Array(7)].map((_, i) => <ellipse key={i} cx={540} cy={FLOOR + 60 + i * 70} rx={200 + i * 120} ry={20 + i * 8} fill="none" stroke="#3c6bb5" strokeWidth={3} opacity={0.35} />)}<AO o={0.3} /></g>,
        front: <g><path d="M -160 1730 Q 540 1690 1240 1730 L 1240 1960 L -160 1960 Z" fill="#14264a" stroke="#7fb4ff" strokeWidth={3} />
          <rect x={-160} y={1726} width={1400} height={10} fill="#7fb4ff" opacity={0.5} />
          <g transform="translate(180,1735) rotate(-6)"><rect x={-90} y={-14} width={180} height={120} fill="#f4f1ea" stroke={OL} strokeWidth={3} />{[0, 1, 2, 3].map((k) => <rect key={k} x={-74} y={4 + k * 22} width={k % 2 ? 100 : 148} height={8} fill="#9aa3ad" />)}</g>
          <g transform="translate(880,1740)"><rect x={-38} y={-10} width={76} height={86} rx={10} fill="#c1121f" stroke={OL} strokeWidth={3} /><Steam x={0} y={-18} t={t} /></g></g>,
        top: <g>{[...Array(8)].map((_, i) => <g key={i}><rect x={-30 + i * 150} y={40} width={70} height={40} rx={6} fill="#24324a" /><Cone x={5 + i * 150} y={80} w0={60} w1={220} h={260} id="cone-cool" o={0.3} /></g>)}
          <defs>{lin('cone-cool', [[0, '#dbe9ff', 0.6], [1, '#dbe9ff', 0]])}</defs></g>,
      };
    }
    // ---- comic shop today: walls of covers, NEW THIS WEEK banner, warm practicals ----
    case 'comic-shop': return {
      sky: <g><defs>{lin('cs-wall', [[0, '#2f3e46'], [1, '#22303a']])}{radial('pool-shop', '#ffe8b0', 0.85)}{lin('cone-warm', [[0, '#ffe3a3', 0.85], [1, '#ffe3a3', 0]])}</defs>
        <rect x={-220} y={0} width={1520} height={1920} fill="url(#cs-wall)" /></g>,
      far: <g>{[...Array(4)].map((_, r) => [...Array(9)].map((_, i) => <MiniCover key={r + '-' + i} x={-150 + i * 150} y={230 + r * 215} w={126} h={180} seed={r * 31 + i * 5 + 9} />))}
        {[...Array(4)].map((_, r) => <rect key={r} x={-200} y={412 + r * 215} width={1480} height={14} fill="#8d6e4f" />)}
        <rect x={-220} y={0} width={1520} height={1920} fill="#0d1b2a" opacity={0.18} /></g>,
      mid: <g><g transform={`translate(540,150) rotate(${Math.sin(t * 1.1) * 1.2})`}><rect x={-330} y={0} width={660} height={110} rx={10} fill="#e63946" stroke={OL} strokeWidth={4} />
        <text x={0} y={76} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={60} fill="#fff" letterSpacing={4}>{(p.banner || 'NEW THIS WEEK').toUpperCase()}</text></g>
        {[200, 880].map((x, i) => <Lamp key={x} x={x} y={20} t={t} seed={i + 2} />)}
        <rect x={-100} y={FLOOR - 230} width={1280} height={230} fill="#6b4226" stroke={OL} strokeWidth={3} /><rect x={-100} y={FLOOR - 240} width={1280} height={22} fill="#8d5a33" />
        {[...Array(8)].map((_, i) => <MiniCover key={i} x={-60 + i * 150} y={FLOOR - 214} w={110} h={150} seed={i * 13 + 77} />)}
        <Motes x={-80} y={200} w={1240} h={1000} t={t} seed={21} n={20} /></g>,
      floor: <g><Planks c1="#4f3a2a" c2="#2a1f17" seam="#1c140f" glow="pool-shop" /><AO /></g>,
      front: <g><rect x={-160} y={1740} width={1400} height={220} fill="#5a3820" stroke={OL} strokeWidth={3} /><rect x={-160} y={1730} width={1400} height={18} fill="#8d5a33" />
        {[...Array(7)].map((_, i) => <g key={i} transform={`translate(${-40 + i * 170},${1700 - (i % 2) * 12}) rotate(${(rand(i + 3) - 0.5) * 10})`}><MiniCover x={-55} y={0} w={110} h={70} seed={i * 7 + 101} /></g>)}
        <g transform="translate(930,1700)"><rect x={-70} y={-60} width={140} height={90} rx={8} fill="#343a40" stroke={OL} strokeWidth={3} /><rect x={-54} y={-48} width={108} height={36} fill="#9fe870" opacity={0.8} /></g></g>,
    };
    // ---- gothic stone hall (a monarch's court, original): arches, stained-glass shafts, banners, torches, floor mist ----
    case 'castle-hall': return {
      sky: <g><defs>{lin('cs-stone', [[0, '#3a4048'], [1, '#22262c']])}{lin('shaft', [[0, '#9dffb0', 0.55], [1, '#9dffb0', 0]])}{radial('torch-g', '#ffb347', 0.95)}{lin('mist', [[0, '#cfd8dc', 0], [1, '#cfd8dc', 0.35]])}</defs>
        <rect x={-220} y={0} width={1520} height={1920} fill="url(#cs-stone)" />
        {[...Array(18)].map((_, r) => [...Array(9)].map((_, i) => <rect key={r + '-' + i} x={-220 + i * 180 + (r % 2) * 90} y={r * 76} width={176} height={72} fill="none" stroke="#2a2f36" strokeWidth={3} />))}</g>,
      far: <g>{[200, 540, 880].map((x, i) => <g key={x}>
        <path d={`M ${x - 110} ${FLOOR - 340} L ${x - 110} 420 Q ${x} 240 ${x + 110} 420 L ${x + 110} ${FLOOR - 340} Z`} fill="#11331f" stroke="#1a1e24" strokeWidth={14} />
        {[...Array(5)].map((_, k) => <rect key={k} x={x - 100 + (k % 2) * 100} y={430 + Math.floor(k / 2) * 150} width={96} height={146} fill={['#2f9e44', '#69db7c', '#ffd43b'][(k + i) % 3]} opacity={0.55} />)}
        <path d={`M ${x - 110} 420 L ${x - 110} ${FLOOR - 340} L ${x + 110} ${FLOOR - 340} L ${x + 110} 420`} fill="none" stroke="#1a1e24" strokeWidth={10} />
        <path d={`M ${x - 100} 420 L ${x + 100} 420 L ${x + 330} ${FLOOR + 200} L ${x - 30} ${FLOOR + 200} Z`} fill="url(#shaft)" style={SCREEN} opacity={0.45 + 0.08 * Math.sin(t + i)} /></g>)}</g>,
      mid: <g>{[30, 370, 710, 1050].map((x, i) => <g key={x}><rect x={x - 50} y={140} width={100} height={460} fill="#1f5f3a" stroke={OL} strokeWidth={3} transform={`skewX(${Math.sin(t * 1.4 + i) * 1.5})`} />
        <path d={`M ${x - 50} 600 L ${x} 650 L ${x + 50} 600 Z`} fill="#1f5f3a" /><rect x={x - 60} y={130} width={120} height={16} fill="#c9a227" /></g>)}
        {[120, 960].map((x, i) => { const f = 0.8 + 0.2 * Math.abs(Math.sin(t * 9 + i * 3) * Math.sin(t * 3.7 + i));
          return <g key={x}><rect x={x - 10} y={FLOOR - 640} width={20} height={90} fill="#3b2f2a" /><path d={`M ${x} ${FLOOR - 720 - f * 30} Q ${x + 26} ${FLOOR - 660} ${x} ${FLOOR - 640} Q ${x - 26} ${FLOOR - 660} ${x} ${FLOOR - 720 - f * 30} Z`} fill="#ffb347" />
            <circle cx={x} cy={FLOOR - 670} r={260} fill="url(#torch-g)" style={SCREEN} opacity={0.45 * f} /></g>; })}
        <g transform={`translate(540,${FLOOR - 120})`}><rect x={-130} y={-420} width={260} height={420} rx={20} fill="#26302a" stroke={OL} strokeWidth={4} /><path d="M -150 -420 L 0 -560 L 150 -420 Z" fill="#26302a" stroke={OL} strokeWidth={4} />
          <rect x={-150} y={-180} width={300} height={50} rx={10} fill="#c9a227" /></g></g>,
      floor: <g><defs>{lin('cs-floor', [[0, '#3c434c'], [1, '#1a1d22']])}</defs><rect x={-220} y={FLOOR - 8} width={1520} height={700} fill="url(#cs-floor)" />
        {[...Array(9)].map((_, i) => <line key={i} x1={540 + (i - 4) * 160} y1={FLOOR} x2={540 + (i - 4) * 480} y2={1920} stroke="#2a2f36" strokeWidth={4} />)}
        <rect x={360} y={FLOOR - 8} width={360} height={700} fill="#5c1f2b" opacity={0.8} /><AO /></g>,
      front: <g><rect x={-160} y={1760} width={1400} height={40} fill="#4a525c" stroke={OL} strokeWidth={3} />
        {[...Array(15)].map((_, i) => <path key={i} d={`M ${-140 + i * 96} 1800 q -18 40 0 80 q 18 40 0 80 L ${-110 + i * 96} 1960 q -18 -40 0 -80 q 18 -40 0 -80 Z`} fill="#5c646e" stroke={OL} strokeWidth={2} />)}
        <rect x={-220} y={FLOOR - 120} width={1520} height={300} fill="url(#mist)" transform={`translate(${Math.sin(t * 0.3) * 40},0)`} /></g>,
    };
    // ---- multiplex lobby at night: glowing poster boxes, LED marquee, queue ropes, popcorn counter ----
    case 'multiplex': return {
      sky: <g><defs>{lin('mx-wall', [[0, '#1a1030'], [1, '#2a1640']])}{radial('pool-mx', '#ffb86b', 0.85)}{lin('cone-warm', [[0, '#ffe3a3', 0.85], [1, '#ffe3a3', 0]])}{lin('mx-led', [[0, '#0b0b14'], [1, '#161628']])}</defs>
        <rect x={-220} y={0} width={1520} height={1920} fill="url(#mx-wall)" />
        {[...Array(12)].map((_, i) => <rect key={i} x={-200 + i * 130} y={0} width={6} height={FLOOR} fill="#ff5fa2" opacity={0.08 + 0.05 * Math.sin(t * 2 + i)} />)}</g>,
      far: <g>
        <rect x={-40} y={140} width={1160} height={230} rx={14} fill="url(#mx-led)" stroke="#3a2a55" strokeWidth={8} />
        <text x={540} y={262} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={p.marquee && p.marquee.length > 18 ? 74 : 92} fill="#ffd166" letterSpacing={4}>{(p.marquee || 'NOW SHOWING').toUpperCase()}</text>
        <text x={540} y={338} textAnchor="middle" fontFamily={F.sans} fontWeight={500} fontSize={46} fill="#ff9ecb" letterSpacing={10}>{(p.marquee2 || '').toUpperCase()}</text>
        {[...Array(40)].map((_, i) => <circle key={i} cx={-30 + i * 29} cy={i % 2 ? 150 : 360} r={6} fill="#ffd166" opacity={((i + Math.floor(t * 8)) % 4 === 0) ? 1 : 0.35} />)}
        {[0, 1, 2, 3].map((i) => <g key={i}><rect x={-120 + i * 330} y={440} width={240} height={360} rx={8} fill="#0d0d18" stroke="#ffd9a0" strokeWidth={6} />
          <MiniCover x={-108 + i * 330} y={452} w={216} h={336} seed={i * 11 + 40} /><rect x={-120 + i * 330} y={440} width={240} height={360} rx={8} fill="#fff6e0" opacity={0.12 + 0.06 * Math.sin(t * 3 + i)} style={SCREEN} /></g>)}
      </g>,
      mid: <g>
        <rect x={-120} y={FLOOR - 260} width={560} height={260} rx={10} fill="#7a1022" stroke={OL} strokeWidth={3} /><rect x={-120} y={FLOOR - 280} width={560} height={30} rx={8} fill="#a8172f" />
        {[...Array(9)].map((_, i) => <circle key={i} cx={-60 + i * 50 + Math.sin(i) * 6} cy={FLOOR - 300 - (i % 3) * 14} r={16} fill="#fff4d6" stroke={OL} strokeWidth={2} />)}
        {[560, 760, 960, 1160].map((x) => <g key={x}><rect x={x - 8} y={FLOOR - 130} width={16} height={130} fill="#c9a227" /><circle cx={x} cy={FLOOR - 134} r={14} fill="#f2c94c" /></g>)}
        <path d={`M 560 ${FLOOR - 110} Q 660 ${FLOOR - 60} 760 ${FLOOR - 110} Q 860 ${FLOOR - 60} 960 ${FLOOR - 110} Q 1060 ${FLOOR - 60} 1160 ${FLOOR - 110}`} fill="none" stroke="#b5122b" strokeWidth={12} />
        {[150, 540, 930].map((x, i) => <Lamp key={x} x={x} y={40 + i * 10} t={t} seed={i + 5} c="#ffd9a0" />)}
        <Motes x={-80} y={300} w={1240} h={900} t={t} seed={31} n={22} c="#ffe1b0" />
      </g>,
      floor: <g><defs>{lin('mx-floor', [[0, '#3a1f3f'], [1, '#160c1c']])}</defs><rect x={-220} y={FLOOR - 8} width={1520} height={700} fill="url(#mx-floor)" />
        {[...Array(10)].map((_, i) => <line key={i} x1={540 + (i - 5) * 140} y1={FLOOR} x2={540 + (i - 5) * 420} y2={1920} stroke="#5a3360" strokeWidth={3} opacity={0.6} />)}
        <ellipse cx={540} cy={FLOOR + 140} rx={600} ry={160} fill="url(#pool-mx)" style={SCREEN} opacity={0.55} /><AO o={0.35} /></g>,
      front: <g><rect x={-160} y={1745} width={1400} height={220} fill="#5a0d1a" stroke={OL} strokeWidth={3} /><rect x={-160} y={1735} width={1400} height={16} fill="#b5122b" />
        {[120, 300, 760, 940].map((x, i) => <g key={x} transform={`translate(${x},1745)`}><path d="M -46 0 L -36 -92 L 36 -92 L 46 0 Z" fill="#fff4d6" stroke={OL} strokeWidth={3} />
          {[-24, 0, 24].map((dx) => <rect key={dx} x={dx - 6} y={-90} width={12} height={88} fill="#d62839" />)}
          {[...Array(6)].map((_, k) => <circle key={k} cx={-30 + k * 12} cy={-98 - (k % 2) * 8} r={12} fill="#fff8e1" stroke={OL} strokeWidth={2} />)}</g>)}
        {[0, 1, 2].map((k) => <rect key={k} x={480 + k * 40} y={1760 + k * 6} width={70} height={36} rx={4} fill="#ffd166" stroke={OL} strokeWidth={2} transform={`rotate(${-8 + k * 9} ${515 + k * 40} 1778)`} />)}</g>,
    };
    default: return null;
  }
}

// ---------------- designed text props (p = the storyboard set entry) ----------------
export const LIT_PROPS: Record<string, { w: number; textY: number; insertY: number }> = {
  // half-width (for "fully in / fully out of frame"), y of the LOWEST text line above the floor, insert-shot centre
  'comic-cover': { w: 190, textY: 380, insertY: 560 },
  newspaper: { w: 200, textY: 420, insertY: 560 },
  'ranking-board': { w: 260, textY: 380, insertY: 620 },
  calendar: { w: 170, textY: 420, insertY: 560 },
  lightbox: { w: 280, textY: 420, insertY: 540 },
  'year-board': { w: 240, textY: 420, insertY: 540 },
  'iron-mask': { w: 150, textY: 360, insertY: 520 },
};
const Easel = ({ h = 360 }: { h?: number }) => <g><path d={`M -110 0 L -40 ${-h} M 110 0 L 40 ${-h} M 0 ${-h + 20} L 0 0`} stroke="#5a3d2b" strokeWidth={12} strokeLinecap="round" /><rect x={-150} y={-h + 50} width={300} height={16} rx={6} fill="#6b4a33" /></g>;

export function litPiece(kind: string, t: number, p: any = {}): React.ReactNode | null {
  const txt = (p.text || '').toString();
  switch (kind) {
    case 'comic-cover': {   // a period comic cover on an easel: masthead, issue, price, date, dramatic original art
      const c = p.color || '#1c7c54';
      return <g><Easel />
        <g transform={`translate(0,${-820}) rotate(${Math.sin(t * 0.8) * 0.8})`}>
          <rect x={-180} y={0} width={360} height={500} rx={4} fill={c} stroke={OL} strokeWidth={4} />
          <rect x={-180} y={0} width={360} height={104} fill="#fff4d6" /><text x={0} y={70} textAnchor="middle" fontFamily={F.impact} fontSize={txt.length > 14 ? 44 : 56} fill="#c1121f" letterSpacing={1}>{(txt || 'COMICS').toUpperCase()}</text>
          <circle cx={-136} cy={140} r={34} fill="#ffd166" stroke={OL} strokeWidth={3} /><text x={-136} y={152} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={36} fill="#1d1b18">{p.issue || '#1'}</text>
          <text x={150} y={150} textAnchor="end" fontFamily={F.heavy} fontWeight={900} fontSize={34} fill="#fff4d6">{p.price || '12¢'}</text>
          {[...Array(14)].map((_, i) => <path key={i} d={`M 0 300 L ${Math.cos(i * 0.45) * 260} ${300 + Math.sin(i * 0.45) * 260}`} stroke="#fff" strokeWidth={10} opacity={0.12} transform={`rotate(${t * 6} 0 300)`} />)}
          <circle cx={0} cy={300} r={110} fill="#ffd166" opacity={0.85} />
          <path d="M -60 470 Q -70 300 0 250 Q 70 300 60 470 Z" fill="#111a14" /><circle cx={0} cy={232} r={44} fill="#111a14" />
          {[-130, -95, 95, 130].map((x, i) => <g key={i}><circle cx={x} cy={420} r={14} fill="#1d1b18" /><path d={`M ${x - 18} 476 Q ${x} 430 ${x + 18} 476 Z`} fill="#1d1b18" /></g>)}
          <rect x={-180} y={448} width={360} height={52} fill="#fff4d6" /><text x={0} y={486} textAnchor="middle" fontFamily={F.heavy} fontWeight={800} fontSize={30} fill="#1d1b18">{(p.sub || '').toUpperCase()}</text>
          <rect x={-180} y={0} width={360} height={500} fill="url(#paper-age)" opacity={0.25} />
          <defs>{lin('paper-age', [[0, '#fff', 0.3], [1, '#8a6a3a', 0.5]], 1, 1)}</defs>
        </g></g>;
    }
    case 'newspaper': return <g><Easel h={340} />
      <g transform={`translate(0,-830) rotate(${-2 + Math.sin(t) * 0.6})`}><rect x={-200} y={0} width={400} height={480} fill="#f2ecdc" stroke={OL} strokeWidth={4} />
        <text x={0} y={56} textAnchor="middle" fontFamily={F.serif} fontSize={50} fill="#1d1b18">{p.paper || 'The Daily Record'}</text>
        <line x1={-180} y1={74} x2={180} y2={74} stroke="#1d1b18" strokeWidth={3} /><text x={0} y={100} textAnchor="middle" fontFamily={F.typewriter} fontSize={22} fill="#444">{(p.sub || '').toUpperCase()}</text>
        <line x1={-180} y1={112} x2={180} y2={112} stroke="#1d1b18" strokeWidth={2} />
        {(txt || 'HEADLINE').toUpperCase().split('|').map((ln: string, i: number) => <text key={i} x={0} y={176 + i * 62} textAnchor="middle" fontFamily={F.impact} fontSize={txt.length > 24 ? 46 : 58} fill="#111">{ln.trim()}</text>)}
        <rect x={-180} y={318} width={170} height={130} fill="#bdb6a6" /><path d="M -170 440 L -120 360 L -80 400 L -40 350 L -20 440 Z" fill="#8a8373" />
        {[...Array(6)].map((_, i) => <rect key={i} x={10} y={322 + i * 22} width={i % 3 === 2 ? 110 : 170} height={9} fill="#9a9384" />)}</g></g>;
    case 'ranking-board': {   // p.items: ["Villain A", ...]; p.hi: highlighted index; p.text: title
      const items: string[] = p.items || [];
      const hi = p.hi ?? 0, rev = Math.min(1, t / 1.4);
      return <g><rect x={-12} y={-300} width={24} height={300} fill="#3a3a44" />
        <g transform="translate(0,-940)"><rect x={-270} y={0} width={540} height={110 + items.length * 92} rx={14} fill="#11131c" stroke="#3b3f55" strokeWidth={6} />
          <text x={0} y={72} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={txt.length > 18 ? 38 : 46} fill="#ffd166" letterSpacing={2}>{txt.toUpperCase()}</text>
          {items.map((it, i) => { const k = Math.min(1, Math.max(0, rev * items.length - i)); const on = i === hi;
            return <g key={i} opacity={k} transform={`translate(${(1 - k) * 40},0)`}>
              <rect x={-246} y={100 + i * 92} width={492} height={78} rx={10} fill={on ? '#c1121f' : '#1f2233'} />
              {on ? <rect x={-246} y={100 + i * 92} width={492} height={78} rx={10} fill="none" stroke="#ffd166" strokeWidth={4} opacity={0.6 + 0.4 * Math.sin(t * 5)} /> : null}
              <text x={-220} y={152 + i * 92} fontFamily={F.heavy} fontWeight={900} fontSize={42} fill={on ? '#ffd166' : '#8a8fa8'}>{p.ranks ? p.ranks[i] : `#${i + 1}`}</text>
              <text x={-120} y={152 + i * 92} fontFamily={F.heavy} fontWeight={800} fontSize={40} fill="#f1f1f1">{it.toUpperCase()}</text></g>; })}</g></g>;
    }
    case 'calendar': {   // tear-off calendar: pages flip to p.text (e.g. "DEC 18") / p.sub (year)
      const flip = Math.min(1, t / 0.8);
      const [mon, day] = (txt || 'JAN 1').toUpperCase().split(' ');
      return <g><rect x={-10} y={-300} width={20} height={300} fill="#3a3a44" />
        <g transform="translate(0,-820)"><rect x={-170} y={0} width={340} height={420} rx={18} fill="#fbfaf7" stroke={OL} strokeWidth={4} />
          <rect x={-170} y={0} width={340} height={110} rx={18} fill="#c1121f" /><rect x={-170} y={80} width={340} height={30} fill="#c1121f" />
          <text x={0} y={80} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={66} fill="#fff" letterSpacing={6}>{mon}</text>
          <text x={0} y={300} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={190} fill="#1d1b18">{day}</text>
          <text x={0} y={384} textAnchor="middle" fontFamily={F.sans} fontWeight={500} fontSize={44} fill="#6c757d" letterSpacing={6}>{p.sub || ''}</text>
          {flip < 1 ? <g transform={`translate(0,110) scale(1,${1 - flip})`}><rect x={-170} y={0} width={340} height={310} fill="#f1efe9" stroke={OL} strokeWidth={3} /></g> : null}
          {[-110, -40, 40, 110].map((x) => <circle key={x} cx={x} cy={8} r={10} fill="#3a3a44" />)}</g></g>;
    }
    case 'lightbox': {   // lit stat sign: big number counting up (never from zero) + label
      const v = Number(p.value || 0), k = p.count === false ? 1 : Math.min(1, t / 1.0), shown = v * (0.35 + 0.65 * (1 - Math.pow(1 - k, 3)));
      const s = `${p.prefix || ''}${p.decimals ? shown.toFixed(p.decimals) : Math.round(shown).toLocaleString('en-IN')}${p.suffix || ''}`;
      return <g><rect x={-14} y={-330} width={28} height={330} fill="#2b2b33" />
        <g transform="translate(0,-760)"><rect x={-280} y={0} width={560} height={320} rx={22} fill="#fff8e6" stroke="#e0c27a" strokeWidth={8} />
          <rect x={-280} y={0} width={560} height={320} rx={22} fill="url(#lb-g)" /><defs>{radial('lb-g', '#fff2c2', 0.9)}</defs>
          <text x={0} y={175} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={s.length > 8 ? 112 : 140} fill={p.color || '#c1121f'}>{s}</text>
          <text x={0} y={262} textAnchor="middle" fontFamily={F.heavy} fontWeight={800} fontSize={txt.length > 20 ? 32 : 40} fill="#3a2a1e" letterSpacing={2}>{txt.toUpperCase()}</text></g>
        <ellipse cx={0} cy={-600} rx={420} ry={300} fill="#fff2c2" opacity={0.18} style={SCREEN} /></g>;
    }
    case 'year-board': {   // split-flap year: digits flip into place one by one
      const yr = (txt || '1962').slice(0, 4).split('');
      return <g><rect x={-14} y={-330} width={28} height={330} fill="#2b2b33" />
        <g transform="translate(0,-740)"><rect x={-250} y={0} width={500} height={300} rx={20} fill="#15171f" stroke="#30344a" strokeWidth={6} />
          {yr.map((dg, i) => { const k = Math.min(1, Math.max(0, (t - i * 0.18) / 0.35)), shown = k < 1 ? String((Number(dg) + 9 - Math.floor(k * 9)) % 10) : dg;
            return <g key={i}><rect x={-226 + i * 114} y={24} width={102} height={180} rx={10} fill="#22252f" /><line x1={-226 + i * 114} y1={114} x2={-124 + i * 114} y2={114} stroke="#0c0d12" strokeWidth={4} />
              <text x={-175 + i * 114} y={175} textAnchor="middle" fontFamily={F.heavy} fontWeight={900} fontSize={150} fill="#f5f3ee">{shown}</text></g>; })}
          <text x={0} y={262} textAnchor="middle" fontFamily={F.heavy} fontWeight={800} fontSize={38} fill="#ffd166" letterSpacing={4}>{(p.sub || '').toUpperCase()}</text></g></g>;
    }
    case 'iron-mask': // museum display: a plain riveted iron mask (generic) in a glass case on a plinth, with a label
      return <g><rect x={-120} y={-300} width={240} height={300} fill="#2b2b33" stroke={OL} strokeWidth={3} /><rect x={-140} y={-320} width={280} height={30} fill="#3a3a44" />
        <g transform="translate(0,-560)"><path d="M -90 -120 Q 0 -170 90 -120 L 84 60 Q 0 120 -84 60 Z" fill="#9aa3ad" stroke="#4a5058" strokeWidth={5} />
          <path d="M -60 -40 L -16 -40 M 16 -40 L 60 -40" stroke="#1d1b18" strokeWidth={12} strokeLinecap="round" /><path d="M 0 -30 L 0 30" stroke="#6c757d" strokeWidth={6} />
          {[-40, -20, 0, 20, 40].map((x) => <line key={x} x1={x} y1={58} x2={x} y2={84} stroke="#1d1b18" strokeWidth={6} />)}
          {[[-74, -100], [74, -100], [-74, 40], [74, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={6} fill="#5c636b" />)}
          <path d="M -70 -110 Q -20 -150 40 -130" fill="none" stroke="#fff" strokeWidth={8} opacity={0.35} /></g>
        <rect x={-150} y={-740} width={300} height={430} fill="#cfe8ff" opacity={0.12} stroke="#cfe8ff" strokeWidth={3} />
        <path d={`M -120 -720 L -60 -720 L -140 -380 Z`} fill="#fff" opacity={0.08} />
        <rect x={-110} y={-250} width={220} height={60} rx={6} fill="#e9e4d6" /><text x={0} y={-210} textAnchor="middle" fontFamily={F.serif} fontSize={34} fill="#1d1b18">{txt || 'Iron mask'}</text></g>;
    default: return null;
  }
}
