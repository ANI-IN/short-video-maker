// "System-design canvas" explainer reel (style reverse-engineered from the reference in output/mcp-reels/STYLE_GUIDE.md):
// one continuous dark canvas, chapter chips + tints, diagram cards that pop / glow / connect, hero zooms, typed text,
// word-by-word captions. Every beat is anchored to a spoken word (ElevenLabs with-timestamps -> words.json).
import { EN } from './en';
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type Word = { cap: string; s: number; e: number; sent: number; chapter: string };
export type McpReelProps = { words: Word[]; duration: number; audio: string; brand: string; series: string; lang?: string; map?: number[] };

// ------------------------------------------------------------------ palette (sampled from the reference)
export const C = {
  bg: '#040606', card: '#0E1412', cardBorder: '#1F2A26', green: '#47CD9E', greenDim: '#3C846C', amber: '#FDB444',
  red: '#D0533F', redB: '#FC6C54', violet: '#8B7CF6', text: '#F0F0F0', text2: '#8A8F8E', textU: '#5E6362', mono: '#9AA3A0',
};
export const INTER = "'InterV', Inter, 'Helvetica Neue', sans-serif";
export const MONO = "'JBMonoV', 'JetBrains Mono', Menlo, monospace";
export const HAND = "Kalam, 'Patrick Hand', cursive";
export const W = 1080, M = 108;
export const CONTENT_DY = 75, CONTENT_S = 1.0;   // content block 455-1255: equal gaps to the chip above and the captions below
export const EDGE = 88;                          // one side margin for chrome and content alike   // layout balance (see the content-zone wrapper)

// ------------------------------------------------------------------ fonts
let fontsP: Promise<void> | null = null;
export const useFontsMcp = () => {
  const [h] = useState(() => delayRender('mcp-fonts'));
  useEffect(() => {
    fontsP = fontsP || Promise.all([
      new FontFace('InterV', `url(${staticFile('fonts/Inter-var.ttf')})`, { weight: '100 900' }),
      new FontFace('JBMonoV', `url(${staticFile('fonts/JetBrainsMono-var.ttf')})`, { weight: '100 800' }),
      new FontFace('Kalam', `url(${staticFile('fonts/Kalam-400-latin.woff2')})`, { weight: '400' }),
    ].map((f) => f.load().then((ff) => { (document.fonts as any).add(ff); }).catch(() => undefined))).then(() => undefined);
    fontsP.then(() => continueRender(h));
  }, [h]);
};

// ------------------------------------------------------------------ motion helpers
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const easeOutBack = (x: number) => { const c1 = 1.70158 * 0.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const pop = (t: number, t0: number, dur = 0.28) => { const k = clamp((t - t0) / dur); return { o: clamp(k * 1.7), s: 0.85 + 0.15 * easeOutBack(k), k }; };
export const fadeWin = (t: number, a: number, b: number, f = 0.3) => clamp(Math.min((t - a) / f, (b - t) / f));
export const typed = (s: string, t: number, t0: number, t1: number) => { const n = Math.round(clamp((t - t0) / Math.max(0.2, t1 - t0)) * s.length); return s.slice(0, n); };
export const breathe = (t: number, k = 0.012) => 1 + Math.sin(t * 2.1) * k;
export const glow = (c = C.green, a = 0.45, r = 28) => `0 0 ${r}px ${hexA(c, a)}`;
// language: on-screen text goes through tx(); English strings live in ./en.ts (Hinglish stays the default)
let LANG = 'hl';
export const setLang = (l?: string) => { LANG = l || 'hl'; };
export const tx = (s: string) => (LANG === 'en' ? EN[s] ?? s : s);
// colour keywords of `full` inside its typed prefix `s`
export const colorize = (s: string, full: string, marks: [string, string][], base?: string) => {
  const col: (string | undefined)[] = Array.from({ length: full.length }, () => base);
  marks.forEach(([k, c]) => { let i = full.indexOf(k); while (i >= 0) { for (let j = i; j < i + k.length; j++) col[j] = c; i = full.indexOf(k, i + 1); } });
  const out: React.ReactNode[] = []; let i = 0;
  while (i < s.length) { let j = i; while (j < s.length && col[j] === col[i]) j++; out.push(<span key={i} style={col[i] ? { color: col[i] } : undefined}>{s.slice(i, j)}</span>); i = j; }
  return out;
};
export const fitFont = (text: string, width: number, max: number) => Math.min(max, width / (text.length * 0.74));
export function hexA(hex: string, a: number) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

// absolutely positioned element with a pop-in (and optional fade-out window)
export const Pop: React.FC<{ t: number; at: number; until?: number; x: number; y: number; w?: number; h?: number; rot?: number; origin?: string; dur?: number; style?: React.CSSProperties; children?: React.ReactNode; breathe?: number }> =
  ({ t, at, until, x, y, w, h, rot = 0, origin = 'center', dur, style, children, breathe: br }) => {
    if (t < at) return null;
    const p = pop(t, at, dur);
    const out = until !== undefined ? clamp((until - t) / 0.3) : 1;
    if (out <= 0) return null;
    const b = br ? breathe(t, br) : 1;
    return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: p.o * out, transform: `scale(${p.s * b}) rotate(${rot}deg)`, transformOrigin: origin, ...style }}>{children}</div>;
  };

// ------------------------------------------------------------------ small graphics
export const Card: React.FC<{ active?: boolean; color?: string; style?: React.CSSProperties; children?: React.ReactNode; dashed?: boolean }> = ({ active, color = C.green, style, children, dashed }) => (
  <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: C.card, borderRadius: 22, border: `${active ? 3 : 2}px ${dashed ? 'dashed' : 'solid'} ${active ? color : C.cardBorder}`,
    boxShadow: active ? glow(color, 0.42, 30) : '0 10px 30px rgba(0,0,0,.45)', transition: 'none', ...style }}>{children}</div>
);
export const MonoLabel: React.FC<{ c?: string; size?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ c = C.mono, size = 20, children, style }) =>
  <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: size, letterSpacing: '0.22em', textTransform: 'uppercase', color: c, ...style }}>{children}</div>;
export const Pill: React.FC<{ c?: string; children: React.ReactNode; size?: number; fill?: string; style?: React.CSSProperties }> = ({ c = C.amber, children, size = 30, fill, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 28px', borderRadius: 999, border: `3px solid ${c}`, background: fill || hexA(c, 0.08),
    color: C.text, fontFamily: INTER, fontWeight: 700, fontSize: size, boxShadow: glow(c, 0.25, 18), whiteSpace: 'nowrap', ...style }}>{children}</div>
);
export const Dots = () => <div style={{ display: 'flex', gap: 10 }}>{['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}</div>;

export const AppIcon: React.FC<{ kind: 'gmail' | 'github' | 'calendar' | 'slack' | 'gpt' | 'claude' | 'gemini'; size?: number; dim?: number }> = ({ kind, size = 110, dim = 1 }) => {
  const s = size;
  const tile = (bg: string, inner: React.ReactNode) => <div style={{ width: s, height: s, borderRadius: s * 0.24, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,.5)', border: '2px solid rgba(255,255,255,.06)', opacity: dim }}>{inner}</div>;
  if (kind === 'gmail') return tile('#2A1B1B', <svg width={s * 0.62} height={s * 0.5} viewBox="0 0 62 50"><path d="M4 46 V10 L31 30" stroke="#4285F4" strokeWidth="9" fill="none" strokeLinejoin="round" strokeLinecap="round" /><path d="M58 46 V10 L31 30" stroke="#34A853" strokeWidth="9" fill="none" strokeLinejoin="round" strokeLinecap="round" /><path d="M8 10 L31 28 L54 10" stroke="#EA4335" strokeWidth="9" fill="none" strokeLinejoin="round" strokeLinecap="round" /><circle cx="56" cy="10" r="5" fill="#FBBC04" /></svg>);
  if (kind === 'github') return tile('#24292F', <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 40 40"><circle cx="12" cy="8" r="5" stroke="#fff" strokeWidth="3.5" fill="none" /><circle cx="12" cy="32" r="5" stroke="#fff" strokeWidth="3.5" fill="none" /><circle cx="30" cy="14" r="5" stroke="#fff" strokeWidth="3.5" fill="none" /><path d="M12 13 V27 M30 19 Q30 26 14 29" stroke="#fff" strokeWidth="3.5" fill="none" /></svg>);
  if (kind === 'calendar') return tile('#1B2A44', <div style={{ width: s * 0.6, height: s * 0.62, borderRadius: 10, background: '#4285F4', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><div style={{ height: '28%', background: '#1A5FD0' }} /><div style={{ flex: 1, color: '#fff', fontFamily: INTER, fontWeight: 800, fontSize: s * 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>31</div></div>);
  if (kind === 'slack') return tile('#2A1E2E', <svg width={s * 0.56} height={s * 0.56} viewBox="0 0 40 40"><rect x="14" y="2" width="7" height="22" rx="3.5" fill="#36C5F0" /><rect x="19" y="16" width="7" height="22" rx="3.5" fill="#E01E5A" /><rect x="2" y="19" width="22" height="7" rx="3.5" fill="#2EB67D" /><rect x="16" y="14" width="22" height="7" rx="3.5" fill="#ECB22E" /></svg>);
  const g = { gpt: ['#103A2E', '◎', '#5DD6A8'], claude: ['#3A2418', '✳', '#E08A5B'], gemini: ['#1C2140', '✦', '#8AA8FF'] }[kind];
  return tile(g[0], <span style={{ fontSize: s * 0.5, color: g[2], fontFamily: INTER, fontWeight: 700 }}>{g[1]}</span>);
};
export const AppLabel: React.FC<{ children: React.ReactNode; c?: string }> = ({ children, c = C.text }) => <div style={{ marginTop: 10, textAlign: 'center', fontFamily: INTER, fontWeight: 700, fontSize: 26, color: c }}>{children}</div>;

export const ServerBox: React.FC<{ active?: boolean; w?: number; label?: string; app?: 'gmail' | 'github' | 'calendar' | 'slack'; dashed?: boolean }> = ({ active = true, w = 260, label = 'MCP SERVER', app = 'gmail', dashed }) => (
  <div style={{ width: w, padding: 14, boxSizing: 'border-box', borderRadius: 18, background: '#0B1A15', border: `3px ${dashed ? 'dashed' : 'solid'} ${active ? C.green : C.greenDim}`, boxShadow: active ? glow(C.green, 0.45, 26) : 'none' }}>
    {[0, 1, 2].map((i) => <div key={i} style={{ height: w * 0.11, marginBottom: 8, borderRadius: 8, background: '#10241D', border: `1.5px solid ${C.greenDim}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
      <div style={{ width: 9, height: 9, borderRadius: 5, background: i === 0 ? C.green : C.greenDim }} /><div style={{ flex: 1, height: 4, background: 'repeating-linear-gradient(90deg,#2D5446 0 4px,transparent 4px 9px)' }} />
      {i === 0 ? <div style={{ transform: 'scale(0.42)', margin: -30 }}><AppIcon kind={app} size={70} /></div> : <div style={{ width: w * 0.16, height: w * 0.05, border: `1.5px solid ${C.greenDim}`, borderRadius: 4 }} />}
    </div>)}
    <MonoLabel c={C.green} size={w * 0.075} style={{ textAlign: 'center', marginTop: 2 }}>{label}</MonoLabel>
  </div>
);
export const ClientPill: React.FC<{ active?: boolean; w?: number }> = ({ active = true, w = 300 }) => (
  <div style={{ width: w, height: w * 0.3, boxSizing: 'border-box', borderRadius: 20, background: '#0B1A15', border: `3px solid ${active ? C.green : C.greenDim}`, boxShadow: active ? glow(C.green, 0.45, 26) : 'none', display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px' }}>
    <svg width={w * 0.2} height={w * 0.15} viewBox="0 0 40 30"><rect x="5" y="3" width="30" height="19" rx="3" fill="#DDE6E2" /><rect x="8" y="6" width="24" height="13" rx="1.5" fill="#2F6B5A" /><rect x="1" y="23" width="38" height="4" rx="2" fill="#AEB9B5" /></svg>
    <div style={{ fontFamily: MONO, fontWeight: 700, color: C.green, fontSize: w * 0.085, lineHeight: 1.15, letterSpacing: '0.12em' }}>MCP<br />CLIENT</div>
  </div>
);
export const BrainRing: React.FC<{ t: number; r?: number; active?: boolean; emoji?: string; color?: string }> = ({ t, r = 150, active = true, emoji = '🧠', color = C.green }) => (
  <div style={{ position: 'relative', width: r * 2.8, height: r * 2.8 }}>
    <svg width={r * 2.8} height={r * 2.8} style={{ position: 'absolute', left: 0, top: 0, transform: `rotate(${t * 8}deg)` }}>
      <circle cx={r * 1.4} cy={r * 1.4} r={r * 1.32} stroke={hexA(color, 0.35)} strokeWidth={2} strokeDasharray="4 12" fill="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={r * 1.4 + Math.cos(i * 1.05) * r * 1.18} cy={r * 1.4 + Math.sin(i * 1.05) * r * 1.18} r={4} fill={hexA(color, 0.7)} />)}
    </svg>
    <div style={{ position: 'absolute', left: r * 0.4, top: r * 0.4, width: r * 2, height: r * 2, borderRadius: r, boxSizing: 'border-box', border: `${Math.max(3, r * 0.04)}px solid ${active ? color : C.greenDim}`,
      background: 'radial-gradient(circle, #10241D 0%, #07110D 70%)', boxShadow: active ? `${glow(color, 0.5, r * 0.4)}, inset 0 0 ${r * 0.3}px ${hexA(color, 0.25)}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: r * 0.95 }}>{emoji}</div>
  </div>
);
export const Hero: React.FC<{ t: number; at: number; until: number; word: string; sub?: string; emoji?: string; color?: string; y?: number; size?: number }> = ({ t, at, until, word, sub, emoji, color = C.green, y = 520, size }) => {
  if (t < at || t > until + 0.3) return null;
  const p = pop(t, at, 0.45); const o = p.o * clamp((until - t) / 0.3 + 1, 0, 1) * clamp((until + 0.3 - t) / 0.3);
  return <div style={{ position: 'absolute', left: 0, top: y, width: W, opacity: o, transform: `scale(${(0.7 + 0.3 * easeOutBack(p.k)) * breathe(t, 0.01)})`, transformOrigin: '50% 40%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {emoji ? <BrainRing t={t} r={120} emoji={emoji} color={color} /> : null}
    <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: size ?? (emoji ? 130 : 240), letterSpacing: '-0.01em', color, textShadow: `0 0 36px ${hexA(color, 0.5)}`, marginTop: emoji ? 10 : 0, lineHeight: 1 }}>{word}</div>
    {sub ? <div style={{ marginTop: 22, fontFamily: INTER, fontWeight: 600, fontSize: 36, color: C.text2 }}>{sub}</div> : null}
  </div>;
};

// a path that draws on (0..1) with an optional travelling dot
export const Wire: React.FC<{ d: string; prog: number; c?: string; dash?: string; width?: number; dot?: number }> = ({ d, prog, c = C.green, dash, width = 4, dot }) => {
  const id = React.useMemo(() => 'p' + Math.abs([...d].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7)), [d]);
  return <svg width={W} height={1920} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
    <path id={id} d={d} stroke={c} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
      strokeDasharray={dash ? undefined : '1 1'} strokeDashoffset={dash ? undefined : 1 - prog} style={dash ? { strokeDasharray: dash, opacity: prog } : { filter: `drop-shadow(0 0 6px ${hexA(c, 0.6)})` }} />
    {dot !== undefined && dot > 0 && dot < 1 ? <circle r={9} fill="#fff" style={{ offsetPath: `path('${d}')`, offsetDistance: `${dot * 100}%`, filter: `drop-shadow(0 0 8px ${c})` } as any} /> : null}
  </svg>;
};
// a paper sticker that travels along a polyline
export const Sticker: React.FC<{ t: number; t0: number; t1: number; pts: [number, number][]; text: string; c?: string; hold?: number }> = ({ t, t0, t1, pts, text, c = '#2B2B2B', hold = 0.5 }) => {
  if (t < t0 || t > t1 + hold) return null;
  const k = easeInOut(clamp((t - t0) / (t1 - t0)));
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const L = seg.reduce((a, b) => a + b, 0); let d = k * L, i = 0;
  while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
  const u = seg[i] ? d / seg[i] : 0; const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
  const o = clamp((t - t0) / 0.15) * clamp((t1 + hold - t) / 0.2);
  return <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%) rotate(-3deg)', opacity: o, background: '#F4EFE3', color: c, borderRadius: 6, padding: '10px 20px',
    fontFamily: INTER, fontWeight: 800, fontSize: 28, whiteSpace: 'nowrap', boxShadow: '0 8px 18px rgba(0,0,0,.55)', border: '1px solid #d8cfba' }}>{text}</div>;
};

// ------------------------------------------------------------------ the reel
export const McpReel: React.FC<McpReelProps> = ({ words, duration, audio, brand, series, lang, map }) => {
  useFontsMcp();
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = frame / fps;
  setLang(lang);
  const R = (i: number) => Math.min(map ? map[Math.min(i, map.length - 1)] : i, words.length - 1);   // anchors authored on the Hinglish words
  const w = (i: number) => words[R(i)].s;
  const we = (i: number) => words[R(i)].e;
  const chStart = (id: string) => words.find((x) => x.chapter === id)!.s;
  const T = { task: chStart('task') - 0.08, problem: chStart('problem') - 0.08, solution: chStart('solution') - 0.08, cta: chStart('cta') - 0.08 };
  const chapter = t < T.task ? 'hook' : t < T.problem ? 'task' : t < T.solution ? 'problem' : t < T.cta ? 'solution' : 'cta';

  // background tint per chapter (cross-faded), dims at chapter changes, stamp shake
  const tints: Record<string, string> = { hook: '#0B1012', task: '#121816', problem: '#1A1410', solution: '#0E1C16', cta: '#16151F' };
  const glows: Record<string, string> = { hook: 'transparent', task: 'transparent', problem: hexA(C.red, 0.10), solution: hexA(C.green, 0.07), cta: hexA(C.violet, 0.07) };
  const bounds = [T.task, T.problem, T.solution, T.cta];
  const dim = Math.max(0, ...bounds.map((b) => 0.85 * clamp(1 - Math.abs(t - b) / 0.35)));
  const stampT = w(17);
  const shake = t > stampT && t < stampT + 0.12 ? Math.sin((t - stampT) * 160) * 7 : 0;

  // ------------------------------------------------ captions: chunks of <=5 words split at punctuation
  const chunks: { i0: number; i1: number }[] = [];
  { let i0 = 0; for (let i = 0; i < words.length; i++) {
      const end = /[,.?!:]$/.test(words[i].cap) || i - i0 >= 4 || i === words.length - 1 || words[i + 1].sent !== words[i].sent;
      if (end) { chunks.push({ i0, i1: i }); i0 = i + 1; } } }
  const ci = chunks.findIndex((c, k) => t >= words[c.i0].s - 0.05 && (k === chunks.length - 1 || t < words[chunks[k + 1].i0].s - 0.05));
  const cur = ci >= 0 && t < words[chunks[ci].i1].e + 0.9 ? chunks[ci] : null;

  // ------------------------------------------------ chapter chip
  const chip = t < w(7) ? ['INTERVIEW · SYSTEM DESIGN', C.mono] : chapter === 'hook' ? [tx('TUMHARA JAWAAB'), C.mono] : chapter === 'task' ? [tx('TUMHARA TASK'), C.amber]
    : chapter === 'problem' ? [tx('PROBLEM SAMJHO'), C.redB] : chapter === 'solution' ? ['SOLUTION · MCP', C.green] : [tx('TUM BATAO'), C.violet];

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      {/* background vignettes per chapter */}
      {Object.keys(tints).map((k) => {
        const o = k === chapter ? 1 : 0;
        return <AbsoluteFill key={k} style={{ opacity: o, background: `radial-gradient(ellipse 75% 45% at 50% 42%, ${tints[k]} 0%, ${C.bg} 72%)` }}>
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 35% at 50% 45%, ${glows[k]} 0%, transparent 70%)` }} />
        </AbsoluteFill>;
      })}
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
        {/* ---------------- persistent chrome */}
        <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 104, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 28, letterSpacing: '0.3em', color: C.text }}>{brand}</div>
          <div style={{ fontFamily: MONO, fontWeight: 400, fontSize: 26, letterSpacing: '0.3em', color: C.mono }}>{series}</div>
        </div>
        <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 152, display: 'flex', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => { const f = clamp(t / duration * 6 - i); return <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: '#2A2F2E', overflow: 'hidden' }}><div style={{ width: `${f * 100}%`, height: '100%', background: C.text }} /></div>; })}
        </div>
        <div style={{ position: 'absolute', left: EDGE, top: 184, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '9px 22px', borderRadius: 999, border: `2px solid ${hexA(chip[1], 0.7)}`, background: hexA(chip[1], 0.08) }}>
          <div style={{ width: 11, height: 11, borderRadius: 6, background: chip[1] }} /><MonoLabel c={chip[1]} size={21}>{chip[0]}</MonoLabel>
        </div>

        {/* ---------------- content zone: authored for y 400-1180, mapped to ~420-1320 so the diagram sits centred between
             the compact top chrome and the caption line (balanced margins; bottom ~24% stays free for the Reels overlay) */}
        <AbsoluteFill style={{ transform: `translate(0px, ${CONTENT_DY}px) scale(${CONTENT_S})`, transformOrigin: '540px 790px' }}>
          {chapter === 'hook' ? <Hook t={t} w={w} we={we} /> : null}
          {chapter === 'task' ? <Task t={t} w={w} we={we} /> : null}
          {chapter === 'problem' ? <Problem t={t} w={w} we={we} /> : null}
          {chapter === 'solution' ? <Solution t={t} w={w} we={we} /> : null}
          {chapter === 'cta' ? <Cta t={t} w={w} we={we} /> : null}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ---------------- captions: one line, word-by-word white fill, grey upcoming words */}
      {cur ? <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 1462, textAlign: 'center', fontFamily: INTER, fontWeight: 600, fontSize: 54, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,.6)' }}>
        {words.slice(cur.i0, cur.i1 + 1).map((x, k) => <span key={k} style={{ color: t >= x.s - 0.03 ? C.text : C.textU }}>{x.cap}{k < cur.i1 - cur.i0 ? ' ' : ''}</span>)}
      </div> : null}
      <AbsoluteFill style={{ background: '#000', opacity: dim, pointerEvents: 'none' }} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};

type SP = { t: number; w: (i: number) => number; we: (i: number) => number };

// ------------------------------------------------------------------ chapter 1: the interview hook
const Hook: React.FC<SP> = ({ t, w, we }) => {
  const q = typed(tx('MCP kya hai?'), t, w(0) + 0.1, we(6));
  const ans = typed('Model Context Protocol.', t, w(10), we(12));
  const youActive = t >= w(7);
  const avatar = (bg: string, hair: string, shirt: string, sz = 200) => <svg width={sz} height={sz * 0.95} viewBox="0 0 200 190"><rect width="200" height="190" fill={bg} /><circle cx="100" cy="78" r="38" fill="#C98E6B" /><path d="M62 72 Q100 20 138 72 Q130 46 100 42 Q70 46 62 72Z" fill={hair} /><path d="M38 190 Q40 128 100 124 Q160 128 162 190Z" fill={shirt} /></svg>;
  return <>
    <Pop t={t} at={0} x={M} y={400} w={W - 2 * M}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden' }}>{avatar('#3A2A22', '#2A1C14', '#3B4B66', 68)}</div>
        <div><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 30, color: C.text }}>Interviewer <span style={{ fontFamily: MONO, fontSize: 19, color: C.amber, letterSpacing: '0.16em', fontWeight: 600 }}>· AI ROUND</span></div>
          <div style={{ marginTop: 8, display: 'inline-block', padding: '12px 22px', borderRadius: 16, background: '#141B19', border: `2px solid ${C.cardBorder}`, fontFamily: INTER, fontWeight: 600, fontSize: 36, color: C.text }}>
            {colorize(q, tx('MCP kya hai?'), [['MCP', C.amber]])}<span style={{ opacity: Math.sin(t * 12) > 0 && q.length < tx('MCP kya hai?').length ? 1 : 0, color: C.text }}>|</span></div></div>
      </div>
    </Pop>
    <Pop t={t} at={0.15} x={M - 20} y={560} w={W - 2 * M + 40} h={300}>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <MonoLabel c={C.redB} size={18}>● REC 00:{String(14 + Math.floor(t)).padStart(2, '0')}</MonoLabel><MonoLabel size={18}>AI ROUND · SYSTEM DESIGN</MonoLabel><MonoLabel c={C.green} size={18}>▂▄▆█</MonoLabel>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[{ who: 'Interviewer', a: !youActive, av: avatar('#3A2A22', '#2A1C14', '#3B4B66') }, { who: tx('Tum'), a: youActive, av: avatar('#1E2A36', '#111', '#2F6B5A') }].map((p, i) =>
            <div key={i} style={{ flex: 1, height: 200, borderRadius: 14, overflow: 'hidden', position: 'relative', border: `3px solid ${p.a ? C.green : 'transparent'}`, boxShadow: p.a ? glow(C.green, 0.35, 18) : 'none' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}>{p.av}</div>
              <div style={{ position: 'absolute', left: 12, bottom: 10, fontFamily: INTER, fontWeight: 700, fontSize: 22, color: '#fff' }}>{p.who}</div>
              {p.a ? <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 4, alignItems: 'flex-end' }}>{[0, 1, 2, 3].map((k) => <div key={k} style={{ width: 6, height: 8 + 14 * Math.abs(Math.sin(t * 9 + k * 1.3)), background: C.green, borderRadius: 3 }} />)}</div> : null}
              {i === 1 && ans ? <div style={{ position: 'absolute', left: 10, right: 10, top: 12, textAlign: 'center', fontFamily: INTER, fontWeight: 700, fontSize: 22, color: '#fff', background: 'rgba(0,0,0,.55)', borderRadius: 8, padding: '4px 6px' }}>"{ans}"</div> : null}
            </div>)}
        </div>
      </Card>
    </Pop>
    {[['M', 'Model', 10], ['C', 'Context', 11], ['P', 'Protocol', 12]].map(([L, lab, i], k) =>
      <Pop key={k} t={t} at={w(i as number)} x={M + k * 300} y={900} w={264} h={230} until={w(13) + 0.2}>
        <Card active><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 130, color: C.green, lineHeight: 1, textShadow: glow(C.green, 0.5, 24) }}>{L}</div>
          <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 28, color: C.text, marginTop: 8 }}>{lab}</div></div></Card>
      </Pop>)}
    <Pop t={t} at={w(13)} x={150} y={890} w={780} h={270} rot={-2} dur={0.32}>
      <div style={{ width: '100%', height: '100%', background: '#F4EFE3', borderRadius: 10, position: 'relative', boxShadow: '0 14px 30px rgba(0,0,0,.6)',
        backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 58px, #9CB7E0 58px 60px)', paddingLeft: 90, boxSizing: 'border-box', paddingTop: 22 }}>
        {[0, 1, 2, 3, 4].map((k) => <div key={k} style={{ position: 'absolute', left: 28, top: 26 + k * 50, width: 22, height: 22, borderRadius: 11, background: '#0b0b0b' }} />)}
        <div style={{ position: 'absolute', left: 74, top: 0, bottom: 0, width: 3, background: '#E5868A' }} />
        {[0, 1, 2].map((k) => t > w(13) + 0.25 + k * 0.28 ? <div key={k} style={{ fontFamily: HAND, fontSize: 40, color: '#2B4EA8', lineHeight: '60px' }}>MCP = Model Context Protocol</div> : null)}
      </div>
    </Pop>
    {t > w(17) ? (() => { const k = clamp((t - w(17)) / 0.12); return <div style={{ position: 'absolute', left: 230, top: 930, width: 620, height: 190, opacity: k, transform: `scale(${1.25 - 0.25 * k}) rotate(-8deg)`,
      border: `10px solid ${C.redB}`, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: INTER, fontWeight: 900, fontSize: fitFont(tx('RATTA'), 560, 150), color: C.redB, letterSpacing: '0.08em',
      textShadow: `0 0 24px ${hexA(C.redB, 0.4)}`, background: hexA(C.redB, 0.06) }}>{tx('RATTA')}</div>; })() : null}
  </>;
};

// ------------------------------------------------------------------ chapter 2: the task
const TILES: { k: 'gmail' | 'github' | 'calendar' | 'slack'; lab: string; app: string }[] = [
  { k: 'gmail', lab: 'Important mails', app: 'Gmail' }, { k: 'github', lab: 'Open PRs', app: 'GitHub' }, { k: 'calendar', lab: 'Aaj ki meetings', app: 'Calendar' }, { k: 'slack', lab: 'Messages', app: 'Slack' }];
const WorkflowWindow: React.FC<{ t: number; ats: number[]; n: number; y: number; title?: string; at?: number }> = ({ t, ats, n, y, title = tx('TUMHARA AI ASSISTANT'), at = 0 }) => {
  const tw = n === 4 ? 196 : 252;
  return <Pop t={t} at={at} x={M - 20} y={y} w={W - 2 * M + 40} h={300}>
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}><Dots /><MonoLabel size={21} c={C.text} style={{ flex: 1, textAlign: 'center' }}>🤖 {title}</MonoLabel></div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {TILES.slice(0, n).map((tl, i) => { const p = pop(t, ats[i] ?? 0); return t < (ats[i] ?? 0) ? <div key={i} style={{ width: tw }} /> :
          <div key={i} style={{ width: tw, height: 190, opacity: p.o, transform: `scale(${p.s})`, borderRadius: 16, background: '#121A17', border: `2px solid ${C.cardBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ transform: 'scale(0.62)', margin: -18 }}><AppIcon kind={tl.k} size={110} /></div>
            <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 25, color: C.text, marginTop: 8 }}>{tx(tl.lab)}</div>
            <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 28, color: C.amber }}>?</div></div>; })}
      </div>
    </Card>
  </Pop>;
};
const Task: React.FC<SP> = ({ t, w, we }) => {
  const ats = [w(28), w(32), w(36)];
  const cx = (i: number) => (M - 20 + 20) + (864 - (3 * 252 + 2 * 16)) / 2 + i * (252 + 16) + 126;   // tiles are centred in the window
  return <>
    <Pop t={t} at={w(21)} x={0} y={404} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill>🎯 {typed(tx('Tumhe ek AI assistant banana hai'), t, w(21), we(26))}</Pill></Pop>
    <WorkflowWindow t={t} ats={ats} n={3} y={500} at={w(27) - 0.15} />
    {ats.map((a, i) => <React.Fragment key={i}>
      <Wire d={`M ${cx(i)} 800 L ${cx(i)} 990`} prog={clamp((t - a - 0.15) / 0.35)} c={C.text2} dash="3 12" width={4} />
      <Pop t={t} at={a + 0.2} x={cx(i) - 24} y={872} w={48} h={48}><div style={{ width: 48, height: 48, borderRadius: 24, border: `2px solid ${C.text2}`, background: C.bg, color: C.text, fontFamily: INTER, fontWeight: 800, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div></Pop>
      <Pop t={t} at={a + 0.35} x={cx(i) - 60} y={1000} w={120}><AppIcon kind={TILES[i].k} size={120} /><AppLabel>{TILES[i].app}</AppLabel></Pop>
    </React.Fragment>)}
  </>;
};

// ------------------------------------------------------------------ chapter 3: the problem (M x N)
const Problem: React.FC<SP> = ({ t, w, we }) => {
  const partB = w(58) - 0.1;
  if (t >= partB) {
    const L = [['gpt', 'ChatGPT'], ['claude', 'Claude'], ['gemini', 'Gemini']] as const;
    const R = TILES;
    const ly = (i: number) => 520 + i * 210, ry = (j: number) => 470 + j * 175;
    const pairs: [number, number][] = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) pairs.push([i, j]);
    const titleAt = w(68);
    const lineDim = t > titleAt ? 0.35 : 1;
    return <>
      {L.map(([k, lab], i) => <Pop key={k} t={t} at={w(58) + i * 0.1} x={M} y={ly(i)} w={140}><AppIcon kind={k} size={120} /><AppLabel>{lab}</AppLabel></Pop>)}
      {R.map((r, j) => <Pop key={r.k} t={t} at={w(61) + j * 0.09} x={W - M - 120} y={ry(j)} w={120}><AppIcon kind={r.k} size={110} /><AppLabel>{r.app}</AppLabel></Pop>)}
      <div style={{ opacity: lineDim }}>{pairs.map(([i, j], n) => <Wire key={n} d={`M ${M + 130} ${ly(i) + 60} C 540 ${ly(i) + 60}, 540 ${ry(j) + 55}, ${W - M - 130} ${ry(j) + 55}`}
        prog={clamp((t - w(63) - n * 0.11) / 0.35)} c={C.redB} width={3.5} />)}</div>
      <Pop t={t} at={titleAt} x={0} y={600} w={W} breathe={0.012} dur={0.4}>
        <div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 230, color: C.redB, textShadow: `0 0 40px ${hexA(C.redB, 0.55)}`, lineHeight: 1 }}>M × N</div>
        <div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 800, fontSize: 64, color: C.redB, marginTop: 4 }}>problem</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}><Pill c={C.redB} size={28}>{tx('har AI app × har tool = alag code')}</Pill></div>
      </Pop>
    </>;
  }
  const n = t >= w(51) ? 4 : 3;
  const ats = [0, 0.05, 0.1, w(51)].map((a, i) => (i < 3 ? w(39) - 0.1 + a : a));
  const tw = n === 4 ? 196 : 252;
  const cx = (i: number) => (M - 20 + 20) + (864 - (n * tw + (n - 1) * 16)) / 2 + i * (tw + 16) + tw / 2;
  const files = ['gmail_api.js', 'github_api.js', 'calendar_api.js', 'slack_api.js'];
  const fc = [C.redB, '#8B9CF6', '#6FA8F5', C.amber];
  return <>
    <Pop t={t} at={w(39)} x={0} y={404} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.redB}>⚠️ {typed(tx('Teeno ko jodoge kaise?'), t, w(39), we(41))}</Pill></Pop>
    <WorkflowWindow t={t} ats={ats} n={n} y={490} at={w(39) - 0.1} />
    {Array.from({ length: n }).map((_, i) => { const tagAt = i < 3 ? w(46) + i * 0.12 : w(55); const codeAt = i < 3 ? w(47) + i * 0.15 : w(56);
      const cw = n === 4 ? 190 : 230;
      return <React.Fragment key={i}>
        <Pop t={t} at={tagAt} x={cx(i) - 70} y={808} w={140}><div style={{ textAlign: 'center' }}><span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: i === 3 ? C.amber : C.redB, border: `2px solid ${i === 3 ? C.amber : C.redB}`, borderRadius: 8, padding: '4px 10px', letterSpacing: '0.1em' }}>REST API</span></div></Pop>
        <Pop t={t} at={codeAt} x={cx(i) - cw / 2} y={860} w={cw} h={130}>
          <Card active={i === 3 && t < w(57) + 1} color={C.amber} style={{ padding: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: n === 4 ? 17 : 20, color: fc[i], fontWeight: 700 }}>{files[i]}</div>
            {[0.7, 0.9, 0.5].map((f, k) => <div key={k} style={{ marginTop: 12, height: 7, width: `${f * 100}%`, borderRadius: 4, background: k === 0 ? fc[i] : k === 1 ? '#5A605E' : '#3E6FD0' }} />)}
          </Card>
        </Pop>
        <Wire d={`M ${cx(i)} 990 L ${cx(i)} 1040`} prog={clamp((t - codeAt - 0.1) / 0.3)} c={i === 3 ? C.amber : C.redB} width={4} />
        <Pop t={t} at={codeAt + 0.15} x={cx(i) - 50} y={1040} w={100}><AppIcon kind={TILES[i].k} size={96} /></Pop>
      </React.Fragment>; })}
    <Pop t={t} at={w(56)} x={cx(3) - 100} y={1150} w={200}><div style={{ textAlign: 'center' }}><Pill c={C.amber} size={22}>{tx('+ naya code')}</Pill></div></Pop>
  </>;
};

// ------------------------------------------------------------------ chapter 4: the solution
const Solution: React.FC<SP> = ({ t, w, we }) => {
  const heroMcp = [w(74) - 0.05, w(83) - 0.25];
  const heroModel = [w(83), w(95) - 0.25];
  const heroCtx = [w(145), w(152) - 0.2];
  const heroProto = [w(175), w(178) - 0.15];
  const inHero = (h: number[]) => t >= h[0] && t < h[1] + 0.3;
  const chipsOn = t >= w(83);
  const litM = t >= w(84), litC = t >= w(149), litP = t >= w(176);
  const diagA = t >= w(95) - 0.1 && t < w(178) - 0.1 && !inHero(heroCtx) && !inHero(heroProto);
  const diagDim = (inHero(heroCtx) || inHero(heroProto)) ? 0.15 : 1;
  return <>
    {chipsOn ? <div style={{ position: 'absolute', left: M, right: M, top: 404, display: 'flex', gap: 14 }}>
      {([['M', 'MODEL', tx('sochta hai'), litM], ['C', 'CONTEXT', tx('tools ki list'), litC], ['P', 'PROTOCOL', tx('ek format'), litP]] as const).map(([L, lab, v, on], k) =>
        <div key={k} style={{ flex: 1, height: 72, borderRadius: 14, boxSizing: 'border-box', border: `2px solid ${on ? C.green : C.cardBorder}`, background: on ? hexA(C.green, 0.07) : C.card, boxShadow: on ? glow(C.green, 0.3, 14) : 'none',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', opacity: pop(t, w(83) + k * 0.1).o }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: on ? C.green : '#2A302E', color: on ? '#06120D' : C.mono, fontFamily: INTER, fontWeight: 900, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{L}</div>
          <div><MonoLabel size={16} c={on ? C.green : C.mono}>{lab}</MonoLabel>{on ? <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 22, color: C.text }}>{v}</div> : null}</div>
        </div>)}
    </div> : null}

    {/* MCP hero */}
    {t < heroMcp[1] + 0.3 ? <>
      <Hero t={t} at={heroMcp[0]} until={heroMcp[1]} word="MCP" y={560} />
      <Pop t={t} at={w(75)} until={heroMcp[1]} x={0} y={840} w={W}><MonoLabel size={30} c={C.text2} style={{ textAlign: 'center', letterSpacing: '0.4em' }}>Model · Context · Protocol</MonoLabel></Pop>
      <Pop t={t} at={w(79)} until={heroMcp[1]} x={0} y={920} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green}>{tx('1 common tareeka · har AI, har tool')}</Pill></Pop>
    </> : null}

    {/* MODEL hero with satellites */}
    {inHero(heroModel) ? <>
      <Hero t={t} at={heroModel[0]} until={heroModel[1]} word="MODEL" sub={t >= w(85) ? tx('AI jo sochta hai') : ''} emoji="🧠" y={500} />
      {([['CHATGPT', 91, 540, 520], ['CLAUDE', 92, 220, 640], ['GEMINI', 94, 860, 640]] as const).map(([n, i, x, y]) =>
        <Pop key={n} t={t} at={w(i)} until={heroModel[1]} x={x - 110} y={y} w={220} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green} size={24} fill="#0B1A15"><span style={{ fontFamily: MONO, letterSpacing: '0.14em' }}>{n}</span></Pill></Pop>)}
    </> : null}

    {/* main client/server diagram */}
    {diagA || (t >= w(95) - 0.1 && t < w(178) - 0.1) ? <div style={{ position: 'absolute', inset: 0, opacity: diagDim }}><Diagram t={t} w={w} we={we} /></div> : null}

    <Hero t={t} at={heroCtx[0]} until={heroCtx[1]} word="CONTEXT" sub={tx('Model ke saamne tools ki list')} emoji="📋" y={520} />
    <Hero t={t} at={heroProto[0]} until={heroProto[1]} word="PROTOCOL" sub={tx('ek format, har tool ke liye')} emoji="🤝" y={520} />

    {t >= w(178) - 0.1 && t < w(193) - 0.1 ? <MplusN t={t} w={w} /> : null}
    {t >= w(193) - 0.1 ? <Summary t={t} w={w} /> : null}
  </>;
};

const Diagram: React.FC<SP> = ({ t, w, we }) => {
  // geometry
  const cz = { x: M - 20, y: 500, w: W - 2 * M + 40, h: 380 };            // client side zone
  const sz = { x: M - 20, y: 920, w: W - 2 * M + 40, h: 260 };            // server side zone
  const model = { x: 150, y: 600 }, client = { x: 560, y: 740 }, server = { x: 400, y: 950 }, gmail = { x: 800, y: 990 };
  const clientAt = w(96), serverAt = w(110), gmailAt = w(119), pipeAt = w(122);
  const modelActive = t < w(96) || (t >= w(152) && t < w(156)) || t >= w(164);
  const clientActive = (t >= clientAt && t < w(109)) || (t >= w(122) && t < w(134)) || (t >= w(154) && t < w(157)) || (t >= w(162) && t < w(165));
  const serverActive = (t >= serverAt && t < w(122)) || (t >= w(133) && t < w(145)) || (t >= w(157) && t < w(162));
  const pipe = `M ${client.x + 150} ${client.y + 90} L ${client.x + 150} 880 Q ${client.x + 150} 905 ${client.x + 125} 905 L ${server.x + 155} 905 Q ${server.x + 130} 905 ${server.x + 130} 930 L ${server.x + 130} ${server.y}`;
  const m2c = `M ${model.x + 180} ${model.y + 90} L ${client.x - 10} ${client.y + 45}`;
  const menuOn = t >= w(134) && t < w(145) + 0.3;
  return <>
    {/* zones */}
    <Pop t={t} at={w(95)} x={cz.x} y={cz.y} w={cz.w} h={cz.h}><div style={{ width: '100%', height: '100%', borderRadius: 22, border: `2px dashed ${hexA(C.green, 0.45)}`, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 22px' }}><Dots /><MonoLabel size={20} c={C.text} style={{ flex: 1, textAlign: 'center' }}>🤖 {tx('TUMHARA AI APP')}</MonoLabel></div>
      <MonoLabel size={17} c={C.green} style={{ position: 'absolute', left: 20, bottom: 14 }}>CLIENT SIDE</MonoLabel></div></Pop>
    <Pop t={t} at={serverAt - 0.1} x={sz.x} y={sz.y} w={sz.w} h={sz.h}><div style={{ width: '100%', height: '100%', borderRadius: 22, border: `2px dashed ${hexA(C.amber, 0.5)}`, boxSizing: 'border-box' }}>
      <MonoLabel size={17} c={C.amber} style={{ position: 'absolute', left: 20, bottom: 14 }}>SERVER SIDE</MonoLabel></div></Pop>
    {/* model */}
    <Pop t={t} at={w(95)} x={model.x} y={model.y} w={200}>
      <div style={{ transform: 'scale(0.42)', transformOrigin: '0 0', width: 120 }}><BrainRing t={t} r={120} active={modelActive} /></div>
      <MonoLabel size={22} c={C.green} style={{ position: 'absolute', left: 160, top: 52, whiteSpace: 'nowrap' }}>MODEL</MonoLabel>
    </Pop>
    <Wire d={m2c} prog={clamp((t - clientAt - 0.1) / 0.35)} c={C.greenDim} dash="6 10" width={3} />
    {/* client */}
    <Pop t={t} at={clientAt} x={client.x} y={client.y} w={300}><ClientPill active={clientActive} /></Pop>
    <Pop t={t} at={w(106)} until={w(109)} x={client.x - 10} y={client.y + 104} w={320} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green} size={22}>{tx('Model ki taraf se baat')}</Pill></Pop>
    {/* server + gmail */}
    <Pop t={t} at={serverAt} x={server.x} y={server.y} w={260}><ServerBox active={serverActive} /></Pop>
    <Pop t={t} at={w(115)} until={w(122)} x={server.x - 40} y={server.y - 62} w={340} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.amber} size={22}>{tx('👉 chhota sa program')}</Pill></Pop>
    <Wire d={`M ${server.x + 262} 1045 L ${gmail.x - 6} 1045`} prog={clamp((t - gmailAt) / 0.3)} c={C.amber} dash="6 8" width={3} />
    <Pop t={t} at={gmailAt} x={gmail.x - 120} y={1010} w={120}><div style={{ fontFamily: MONO, fontSize: 15, color: C.amber, border: `1.5px solid ${C.amber}`, borderRadius: 6, padding: '2px 6px', textAlign: 'center', letterSpacing: '0.08em' }}>REST API</div></Pop>
    <Pop t={t} at={gmailAt} x={gmail.x} y={gmail.y} w={110}><div style={{ transform: `scale(${t >= w(157) && t < w(162) ? 1 + 0.06 * Math.sin(t * 14) : 1})` }}><AppIcon kind="gmail" size={100} /></div><AppLabel>Gmail</AppLabel></Pop>
    {/* pipe */}
    <Wire d={pipe} prog={clamp((t - pipeAt) / 0.4)} c={C.green} width={5} dot={t > w(157) && t < w(162) ? (t * 1.4) % 1 : undefined} />
    {/* stickers */}
    <Sticker t={t} t0={w(127)} t1={we(133)} text={tx('❓ Tum kya kya kar sakte ho?')} pts={[[client.x + 150, client.y + 120], [client.x + 150, 905], [server.x + 130, 905], [server.x + 130, server.y + 10]]} />
    <Sticker t={t} t0={w(153)} t1={w(157)} text="▶ search_mails" c="#0B5E43" pts={[[model.x + 200, model.y + 80], [client.x + 150, client.y + 45], [client.x + 150, 905], [server.x + 130, 905], [server.x + 130, server.y + 10]]} hold={0.2} />
    <Sticker t={t} t0={w(161)} t1={we(165)} text="✔ 5 important mails" c="#0B5E43" pts={[[server.x + 130, server.y + 10], [server.x + 130, 905], [client.x + 150, 905], [client.x + 150, client.y + 45], [model.x + 200, model.y + 80]]} />
    {/* tools menu */}
    {menuOn ? <Pop t={t} at={w(134)} until={w(145)} x={300} y={540} w={680} h={460}>
      <Card active style={{ overflow: 'hidden' }}>
        <div style={{ background: '#F4F6F5', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 16 }}><div style={{ transform: 'scale(0.5)', margin: -26 }}><AppIcon kind="gmail" size={100} /></div>
          <div><div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 30, color: '#111' }}>GMAIL MCP SERVER</div><div style={{ fontFamily: MONO, fontSize: 18, color: '#555' }}>tools/list · menu</div></div></div>
        {([['search_mails', tx('Mails search karo'), w(140)], ['send_mail', tx('Mail bhejo'), w(143)], ['…', tx('aur bhi tools'), we(144) + 0.1]] as const).map(([fn, d, a], k) =>
          t >= a ? <div key={k} style={{ margin: '16px 20px 0', padding: '12px 18px', borderRadius: 14, border: `2px solid ${C.cardBorder}`, display: 'flex', alignItems: 'center', gap: 18, opacity: pop(t, a).o, transform: `scale(${pop(t, a).s})` }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${C.green}`, color: C.green, fontFamily: INTER, fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k + 1}</div>
            <div><div style={{ fontFamily: MONO, fontSize: 21, color: C.green }}>{fn}</div><div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 28, color: C.text }}>{d}</div></div></div> : null)}
      </Card>
    </Pop> : null}
    {/* fixed-format JSON */}
    <Pop t={t} at={w(169)} until={w(175)} x={M + 10} y={720} w={W - 2 * M - 20}>
      <Card active color={C.amber} style={{ padding: '18px 24px' }}>
        <MonoLabel size={17} c={C.amber}>fixed format · JSON-RPC</MonoLabel>
        <pre style={{ margin: '10px 0 0', fontFamily: MONO, fontSize: 25, lineHeight: 1.45, color: C.text, whiteSpace: 'pre' }}>
          {typed('{ "method": "tools/call",\n  "params": { "name": "search_mails" } }', t, w(169), w(175) - 0.3)}</pre>
      </Card>
    </Pop>
  </>;
};

const MplusN: React.FC<{ t: number; w: (i: number) => number }> = ({ t, w }) => {
  const xs = [140, 340, 540, 740];
  return <>
    <Pop t={t} at={w(178)} x={390} y={500} w={300}><ClientPill /></Pop>
    <Wire d={`M 220 690 L 860 690 M 540 590 L 540 690`} prog={clamp((t - w(179)) / 0.4)} c={C.green} width={4} />
    {TILES.map((tl, i) => <React.Fragment key={i}>
      <Wire d={`M ${xs[i] + 90} 690 L ${xs[i] + 90} 730`} prog={clamp((t - w(180) - i * 0.15) / 0.2)} c={C.green} width={4} />
      <Pop t={t} at={w(180) + i * 0.15 + (i === 3 ? 0.6 : 0)} x={xs[i]} y={730} w={180}>
        <ServerBox w={180} app={tl.k} label="SERVER" active={i === 3} />
        <AppLabel c={C.text2}>{tl.app}</AppLabel>
        {i === 3 ? <div style={{ position: 'absolute', right: -10, top: -18, background: C.amber, color: '#1A1205', fontFamily: MONO, fontWeight: 800, fontSize: 18, borderRadius: 8, padding: '3px 10px' }}>NEW</div> : null}
      </Pop>
    </React.Fragment>)}
    <Pop t={t} at={w(185)} x={0} y={990} w={W}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 60 }}>
        <div style={{ position: 'relative', fontFamily: INTER, fontWeight: 900, fontSize: 120, color: C.redB, opacity: t >= w(188) ? 0.5 : 1 }}>M × N
          <div style={{ position: 'absolute', left: -10, right: -10, top: '52%', height: 10, background: C.redB, transform: `scaleX(${clamp((t - w(188)) / 0.25)})`, transformOrigin: 'left', borderRadius: 5 }} /></div>
        {t >= w(190) ? <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 140, color: C.green, textShadow: `0 0 36px ${hexA(C.green, 0.55)}`, opacity: pop(t, w(190)).o, transform: `scale(${pop(t, w(190), 0.35).s})` }}>M + N</div> : null}
      </div>
    </Pop>
  </>;
};

const Summary: React.FC<{ t: number; w: (i: number) => number }> = ({ t, w }) => {
  const rows = [
    { at: w(195), lab: 'MODEL', big: tx('DECIDE KARTA'), sub: tx('kaunsa tool chahiye'), icon: <div style={{ transform: 'scale(0.36)', transformOrigin: '0 0', width: 120, height: 120 }}><BrainRing t={t} r={120} /></div> },
    { at: w(198), lab: 'MCP CLIENT', big: tx('BAAT KARTA'), sub: tx('Model ki taraf se'), icon: <div style={{ transform: 'scale(0.52)', transformOrigin: '0 50%' }}><ClientPill w={280} /></div> },
    { at: w(201), lab: 'MCP SERVER', big: tx('KAAM KARTA'), sub: tx('tool ka asli kaam'), icon: <div style={{ transform: 'scale(0.45)', transformOrigin: '0 0' }}><ServerBox w={240} /></div> },
  ];
  return <>
    {rows.map((r, i) => { const active = t >= r.at && (i === 2 || t < rows[i + 1].at);
      return <React.Fragment key={i}>
        <Pop t={t} at={r.at} x={M - 10} y={510 + i * 205} w={W - 2 * M + 20} h={180}>
          <Card active={active} style={{ display: 'flex', alignItems: 'center', gap: 34, padding: '0 34px' }}>
            <div style={{ width: 150, height: 120, display: 'flex', alignItems: 'center' }}>{r.icon}</div>
            <div><MonoLabel size={18}>{r.lab}</MonoLabel><div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 58, color: C.green, textShadow: glow(C.green, 0.35, 18) }}>{r.big}</div>
              <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 26, color: C.text2 }}>{r.sub}</div></div>
          </Card>
        </Pop>
        {i < 2 && t > rows[i + 1].at ? <div style={{ position: 'absolute', left: 200, top: 692 + i * 205, color: C.green, fontSize: 30, fontWeight: 900, fontFamily: INTER }}>↓</div> : null}
      </React.Fragment>; })}
    <Pop t={t} at={w(204)} x={0} y={1130} w={W} dur={0.35}><div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 64, color: C.green, textShadow: `0 0 30px ${hexA(C.green, 0.55)}`, letterSpacing: '0.04em' }}>{tx('YAHI HAI MCP')}</div></Pop>
  </>;
};

// ------------------------------------------------------------------ chapter 5: call to action
const Cta: React.FC<SP> = ({ t, w, we }) => (
  <>
    <Pop t={t} at={w(207)} x={0} y={440} w={W} dur={0.35}><div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 120, color: C.text, letterSpacing: '0.03em' }}>{tx('TUM BATAO 🤔')}</div></Pop>
    <Pop t={t} at={w(210) - 0.1} x={M - 30} y={700} w={290}><ClientPill w={270} /></Pop>
    <Wire d={`M 350 742 L 455 742`} prog={clamp((t - w(211)) / 0.3)} c={C.green} dash="6 8" width={4} />
    <Pop t={t} at={w(211)} x={460} y={660} w={240}><ServerBox w={230} app="slack" label="SLACK SERVER" dashed /><AppLabel c={C.text2}>{tx('pehla tool?')}</AppLabel></Pop>
    <Wire d={`M 705 742 L 820 742`} prog={clamp((t - w(213)) / 0.3)} c={C.amber} dash="6 8" width={4} />
    <Pop t={t} at={w(213)} x={830} y={690} w={110}><AppIcon kind="slack" size={100} /><AppLabel>Slack</AppLabel></Pop>
    <Pop t={t} at={w(216)} x={560} y={610} w={60}><div style={{ width: 52, height: 52, borderRadius: 26, background: C.amber, color: '#1A1205', fontFamily: INTER, fontWeight: 900, fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${breathe(t, 0.06)})` }}>?</div></Pop>
    <Pop t={t} at={w(219) - 0.2} x={M - 20} y={960} w={W - 2 * M + 40} h={110}>
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 60, border: `3px solid ${C.green}`, boxShadow: glow(C.green, 0.35, 22), background: '#0B1311', display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px 0 30px' }}>
        <span style={{ fontSize: 40 }}>💬</span>
        <span style={{ flex: 1, fontFamily: INTER, fontWeight: 600, fontSize: 38, color: C.text }}>{typed('search_messages…', t, w(219), we(221) + 0.4)}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0 }}>|</span></span>
        <span style={{ background: C.green, color: '#06120D', fontFamily: INTER, fontWeight: 800, fontSize: 30, borderRadius: 30, padding: '10px 26px' }}>Post</span>
      </div>
    </Pop>
    <Pop t={t} at={w(219)} x={0} y={1090} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green} size={26}>{tx('👇 Comment mein batao')}</Pill></Pop>
  </>
);
