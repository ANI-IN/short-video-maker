// EDTech: the "system-design canvas" look of the MCP / RAG / UPI explainer reels as a storyboard-driven style.
// Dark canvas, chapter chip + tint per scene role, glowing cards that pop on cue, word-by-word captions.
// Layout: chrome at y 104-230, content zone y 470-1260, captions at y 1462 (equal side margins, EDGE = 88).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Scene as Sc, SceneProps, StyleDef, VideoProps } from '../lib/types';
import { tokens, plain, statText, tv, Icon } from '../lib/util';
import { BrainRing, C, Card, EDGE, INTER, MONO, MonoLabel, Pill, W, Wire, clamp, easeInOut, glow, hexA, pop, typed, useFontsMcp } from '../mcpreel/McpReel';

const XF = 0.32;                                   // Main.tsx starts every scene after the first this much early (dissolve)
let LANG = 'en';
const HI = () => LANG === 'hi' || LANG === 'hl';
type Role = { chip: [string, string]; c: string; tint: string; glow: string };
const role = (sc: Sc, i: number, n: number): Role => {
  const r = (sc.role || '').toLowerCase();
  if (r === 'hook' || (!r && i === 0)) return { chip: ['THE QUESTION', 'SAWAAL'], c: C.amber, tint: '#0B1012', glow: 'transparent' };
  if (r === 'problem') return { chip: ['THE PROBLEM', 'PROBLEM SAMJHO'], c: C.redB, tint: '#1A1410', glow: hexA(C.red, 0.1) };
  if (r === 'cta' || (!r && i === n - 1)) return { chip: ['YOUR TURN', 'TUM BATAO'], c: C.violet, tint: '#16151F', glow: hexA(C.violet, 0.07) };
  if (r === 'payoff' || r === 'solution') return { chip: ['THE SOLUTION', 'SOLUTION'], c: C.green, tint: '#0E1C16', glow: hexA(C.green, 0.07) };
  return { chip: ['HOW IT WORKS', 'KAISE KAAM KARTA HAI'], c: C.green, tint: '#121816', glow: hexA(C.green, 0.05) };
};
const useLocal = (index: number) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return f / fps - (index > 0 ? XF : 0); };
const fit = (s: string, width: number, max: number, k = 0.6) => Math.max(34, Math.min(max, width / (Math.max(1, s.length) * k)));
const At: React.FC<{ t: number; at: number; x: number; y: number; w?: number; h?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, at, x, y, w, h, children, style }) => {
  if (t < at) return null; const p = pop(t, at);
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: p.o, transform: `scale(${p.s})`, ...style }}>{children}</div>;
};
const Num: React.FC<{ n: React.ReactNode; on?: boolean; c: string; s?: number }> = ({ n, on, c, s = 56 }) => (
  <div style={{ flexShrink: 0, width: s, height: s, borderRadius: s / 2, background: on ? c : '#2A302E', color: on ? '#06120D' : C.mono, fontFamily: INTER, fontWeight: 900, fontSize: s * 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
);

// ------------------------------------------------------------------ visuals (zone: x EDGE..W-EDGE, y 730..1250)
const ZX = EDGE, ZW = W - 2 * EDGE, ZY = 580, ZH = 760;     // content zone y 580-1340; headline 300-530; captions from 1462
const Items: React.FC<{ sc: Sc; t: number; c: string }> = ({ sc, t, c }) => {
  const it = (sc.items || []).slice(0, 4); const h = Math.min(150, (ZH - (it.length - 1) * 18) / it.length);
  const y0 = ZY + (ZH - (it.length * h + (it.length - 1) * 18)) / 2;      // centred in the zone: no empty band above the captions
  const at = (i: number) => tv(sc, 0.18 + (0.7 * i) / it.length);
  return <>{it.map((s, i) => { const on = t >= at(i) && (i === it.length - 1 || t < at(i + 1));
    return <At key={i} t={t} at={at(i)} x={ZX} y={y0 + i * (h + 18)} w={ZW} h={h}>
      <Card active={on} color={c} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '0 30px' }}>
        <Num n={i + 1} on={on} c={c} /><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: fit(s, ZW - 150, 46, 0.56), color: C.text, lineHeight: 1.15 }}>{plain(s)}</div></Card></At>; })}</>;
};
const Stat: React.FC<{ sc: Sc; t: number; c: string }> = ({ sc, t, c }) => {
  const a = tv(sc, 0.15), b = tv(sc, 0.6); const p = easeInOut(clamp((t - a) / Math.max(0.3, b - a))); const txt = statText(sc.stat, 1);
  return <>
    <At t={t} at={a} x={ZX} y={ZY + (ZH - 470) / 2} w={ZW} h={390}>
      <Card active color={c}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: fit(txt, ZW - 120, 230, 0.62), color: c, textShadow: glow(c, 0.5, 36), lineHeight: 1 }}>{statText(sc.stat, p)}</div>
        {sc.stat?.label ? <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 44, color: C.text, marginTop: 14 }}>{sc.stat.label}</div> : null}</div></Card></At>
    {sc.sub ? <At t={t} at={b} x={0} y={ZY + (ZH - 470) / 2 + 410} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={c} size={34}>{sc.emoji ? sc.emoji + ' ' : ''}{plain(sc.sub)}</Pill></At> : null}
  </>;
};
const Compare: React.FC<{ sc: Sc; t: number }> = ({ sc, t }) => {
  const cw = (ZW - 24) / 2; const sides = [[sc.compare!.left, C.amber, tv(sc, 0.12)], [sc.compare!.right, C.green, tv(sc, 0.5)]] as const;
  return <>{sides.map(([s, c, at], k) => <At key={k} t={t} at={at} x={ZX + k * (cw + 24)} y={ZY + 60} w={cw} h={ZH - 120}>
    <Card active={k === 1 ? true : t < sides[1][2]} color={c}><div style={{ height: '100%', boxSizing: 'border-box', padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: fit(s.title, cw - 60, 56), color: c, textShadow: k ? glow(c, 0.45, 22) : undefined, textAlign: 'center' }}>{s.title}</div>
      {s.emoji ? <div style={{ fontSize: 110, margin: '14px 0' }}>{s.emoji}</div> : null}
      {(s.points || []).slice(0, 3).map((p, i) => <div key={i} style={{ fontFamily: INTER, fontWeight: 700, fontSize: fit(p, cw - 60, 32, 0.55), color: i ? C.text2 : C.text, marginTop: 8, textAlign: 'center' }}>{p}</div>)}
    </div></Card></At>)}
    <At t={t} at={sides[1][2]} x={W / 2 - 44} y={ZY + 60 + (ZH - 120) / 2 - 44} w={88} h={88}><div style={{ width: 88, height: 88, borderRadius: 44, background: C.bg, border: `3px solid ${C.text2}`, color: C.text, fontFamily: INTER, fontWeight: 900, fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VS</div></At>
  </>;
};
const Chart: React.FC<{ sc: Sc; t: number; c: string }> = ({ sc, t, c }) => {
  const it = sc.chart!.items.slice(0, 5); const mx = Math.max(...it.map((x) => x.value), 1); const rh = Math.min(96, (ZH - 80) / it.length);
  return <At t={t} at={tv(sc, 0.1)} x={ZX} y={ZY + (ZH - (it.length * rh + 70)) / 2} w={ZW} h={it.length * rh + 70}>
    <Card style={{ padding: '26px 30px', boxSizing: 'border-box' }}>
      {it.map((x, i) => { const a = tv(sc, 0.2 + (0.6 * i) / it.length); const p = easeInOut(clamp((t - a) / 0.6)); const top = x.value === mx;
        return <div key={i} style={{ height: rh, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 230, fontFamily: INTER, fontWeight: 700, fontSize: fit(x.label, 230, 32, 0.56), color: C.text, textAlign: 'right' }}>{x.label}</div>
          <div style={{ flex: 1, height: rh * 0.5, borderRadius: 10, background: '#1A2320', overflow: 'hidden' }}><div style={{ width: `${(x.value / mx) * 100 * p}%`, height: '100%', borderRadius: 10, background: top ? c : C.greenDim, boxShadow: top ? glow(c, 0.5, 16) : 'none' }} /></div>
          <div style={{ width: 120, fontFamily: MONO, fontWeight: 800, fontSize: 30, color: top ? c : C.text2 }}>{Math.round(x.value * p)}{sc.chart!.unit || ''}</div></div>; })}
    </Card></At>;
};
const Steps: React.FC<{ sc: Sc; t: number; c: string }> = ({ sc, t, c }) => {
  const st = (sc.steps || []).slice(0, 4); const gap = 34; const h = Math.min(126, (ZH - (st.length - 1) * gap) / st.length);
  const y0 = ZY + (ZH - (st.length * h + (st.length - 1) * gap)) / 2;
  const at = (i: number) => tv(sc, 0.15 + (0.72 * i) / st.length);
  return <>{st.map((s, i) => { const on = t >= at(i) && (i === st.length - 1 || t < at(i + 1)); const y = y0 + i * (h + gap);
    return <React.Fragment key={i}>
      {i ? <Wire d={`M ${ZX + 58} ${y - gap} L ${ZX + 58} ${y}`} prog={clamp((t - at(i) + 0.25) / 0.25)} c={c} width={5} /> : null}
      <At t={t} at={at(i)} x={ZX} y={y} w={ZW} h={h}>
        <Card active={on} color={c} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '0 30px' }}>
          <Num n={i + 1} on={on} c={c} />
          <div>{s.date ? <MonoLabel size={21} c={on ? c : C.mono}>{s.date}</MonoLabel> : null}<div style={{ fontFamily: INTER, fontWeight: 800, fontSize: fit(s.label, ZW - 150, 42, 0.56), color: C.text }}>{s.label}</div></div></Card></At>
    </React.Fragment>; })}</>;
};
const Ring: React.FC<{ sc: Sc; t: number; c: string }> = ({ sc, t, c }) => (
  <>
    <At t={t} at={tv(sc, 0.08)} x={W / 2 - 170} y={ZY + (ZH - 430) / 2} w={340} h={340}>
      {sc.emoji ? <BrainRing t={t} r={170} emoji={sc.emoji} color={c} /> : <div style={{ width: 340, height: 340, borderRadius: 170, border: `5px solid ${c}`, boxShadow: glow(c, 0.45, 30), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={sc.icon} size={170} color={c} /></div>}
    </At>
    {sc.sub ? <At t={t} at={tv(sc, 0.4)} x={0} y={ZY + (ZH - 430) / 2 + 410} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={c} size={34}>{plain(sc.sub)}</Pill></At> : null}
  </>
);
const ORDER = ['items', 'stat', 'compare', 'chart', 'steps'] as const;
const pick = (sc: Sc, i: number) => {
  const has = (k: string) => (k === 'items' ? (sc.items || []).length > 0 : k === 'steps' ? (sc.steps || []).length > 0 : k === 'chart' ? !!sc.chart?.items?.length : !!(sc as any)[k]);
  for (let k = 0; k < ORDER.length; k++) { const o = ORDER[(i + k) % ORDER.length]; if (has(o)) return o; }
  return 'ring';
};

// ------------------------------------------------------------------ one scene
const Scene: React.FC<SceneProps> = ({ scene: sc, index, total }) => {
  useFontsMcp();
  const t = useLocal(index); const R = role(sc, index, total); const c = R.c;
  const isHook = R.chip[0] === 'THE QUESTION', isCta = R.chip[0] === 'YOUR TURN';
  const head = tokens(sc.headline || ''); const hs = fit(plain(sc.headline || ''), ZW * (plain(sc.headline || '').length > 22 ? 1.9 : 1), 92, 0.58);
  const kind = pick(sc, index);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 45% at 50% 45%, ${R.tint} 0%, ${hexA(R.tint, 0)} 72%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 35% at 50% 47%, ${R.glow} 0%, transparent 70%)` }} />
      {isCta ? <>
        <At t={t} at={0.05} x={0} y={340} w={W}><div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 118, color: C.text, letterSpacing: '0.03em' }}>{HI() ? 'TUM BATAO' : 'YOUR TURN'} 🤔</div></At>
        <At t={t} at={tv(sc, 0.15)} x={ZX} y={600} w={ZW} h={300}>
          <Card active color={c}><div style={{ height: '100%', boxSizing: 'border-box', padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
            {sc.emoji ? <div style={{ fontSize: 96 }}>{sc.emoji}</div> : null}
            <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: Math.min(64, hs), color: C.text, lineHeight: 1.12 }}>{head.map((w, i) => <span key={i} style={{ color: w.k ? c : C.text }}>{w.t} </span>)}</div></div></Card></At>
        <At t={t} at={tv(sc, 0.55)} x={ZX} y={980} w={ZW} h={120}>
          <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 60, border: `3px solid ${C.green}`, boxShadow: glow(C.green, 0.35, 22), background: '#0B1311', display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px 0 30px' }}>
            <span style={{ fontSize: 40 }}>💬</span>
            <span style={{ flex: 1, fontFamily: INTER, fontWeight: 600, fontSize: 36, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden' }}>{typed(plain(sc.sub || (sc.items || [])[0] || '…'), t, tv(sc, 0.55), tv(sc, 0.95))}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0 }}>|</span></span>
            <span style={{ background: C.green, color: '#06120D', fontFamily: INTER, fontWeight: 800, fontSize: 30, borderRadius: 30, padding: '10px 26px' }}>Post</span></div></At>
        <At t={t} at={tv(sc, 0.6)} x={0} y={1160} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green} size={30}>👇 {HI() ? 'Comment mein batao' : 'Tell me in the comments'}</Pill></At>
      </> : <>
        {/* headline block, vertically centred in y 470-700 */}
        <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 300, height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isHook ? <div style={{ maxWidth: ZW, boxSizing: 'border-box', padding: '20px 30px', borderRadius: 22, background: '#141B19', border: `2px solid ${C.cardBorder}`, opacity: pop(t, 0).o }}>
            <MonoLabel size={19} c={c}>{HI() ? 'AAJ KA SAWAAL' : "TODAY'S QUESTION"}</MonoLabel>
            <div style={{ marginTop: 8, fontFamily: INTER, fontWeight: 800, fontSize: Math.min(62, hs), color: C.text, lineHeight: 1.15 }}>
              {(() => { const full = head.map((w) => w.t).join(' '); const n = typed(full, t, 0.1, tv(sc, 0.45)).length; let k = 0;
                return head.map((w, i) => { const a = k; k += w.t.length + 1; return <span key={i} style={{ color: w.k ? c : C.text }}>{w.t.slice(0, Math.max(0, n - a))}{n > a + w.t.length ? ' ' : ''}</span>; }); })()}
              <span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0, color: c }}>|</span></div></div>
          : <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.26em', fontFamily: INTER, fontWeight: 900, fontSize: hs, lineHeight: 1.08, textAlign: 'center' }}>
            {head.map((w, i) => { const p = pop(t, 0.05 + i * 0.07); return <span key={i} style={{ display: 'inline-block', opacity: p.o, transform: `translateY(${(1 - p.k) * 26}px)`, color: w.k ? c : C.text, textShadow: w.k ? glow(c, 0.45, 22) : undefined }}>{w.t}</span>; })}</div>}
        </div>
        {kind === 'items' ? <Items sc={sc} t={t} c={c} /> : kind === 'stat' ? <Stat sc={sc} t={t} c={c} /> : kind === 'compare' ? <Compare sc={sc} t={t} />
          : kind === 'chart' ? <Chart sc={sc} t={t} c={c} /> : kind === 'steps' ? <Steps sc={sc} t={t} c={c} /> : <Ring sc={sc} t={t} c={c} />}
      </>}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ chrome + captions (one layer over all scenes)
// canvas: near-black with a faint dot grid (a design-tool canvas), so no part of the frame reads as dead space
const Background: React.FC<{ props: VideoProps }> = ({ props }) => { LANG = props.lang || 'en'; return (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ backgroundImage: 'radial-gradient(circle, rgba(220,235,230,0.16) 2.2px, transparent 2.6px)', backgroundSize: '40px 40px', backgroundPosition: '20px 20px' }} />
  </AbsoluteFill>); };
const Overlay: React.FC<{ props: VideoProps }> = ({ props }) => {
  useFontsMcp(); LANG = props.lang || 'en';
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const T = f / fps;
  const n = props.scenes.length; let i = props.scenes.findIndex((s) => T >= s.start && T < s.start + s.dur); if (i < 0) i = T < (props.scenes[0]?.start ?? 0) ? 0 : n - 1;
  const sc = props.scenes[i]; const R = role(sc, i, n); const t = T - sc.start;
  const bounds = props.scenes.slice(1).map((s) => s.start); const dim = Math.max(0, ...bounds.map((b) => 0.55 * clamp(1 - Math.abs(T - b) / 0.3)));
  const chunks: Sc['words'][] = []; let cur: Sc['words'] = [];
  sc.words.forEach((w, k) => { cur.push(w); if (/[,.?!:।]$/.test(w.w) || cur.length >= 5 || k === sc.words.length - 1) { chunks.push(cur); cur = []; } });
  const ci = chunks.findIndex((c, k) => t >= c[0].s - 0.05 && (k === chunks.length - 1 || t < chunks[k + 1][0].s - 0.05));
  const ch = ci >= 0 && t < chunks[ci][chunks[ci].length - 1].e + 0.9 ? chunks[ci] : null;
  const brand = ((props as any).brand || 'EXPLAINED').toUpperCase(); const series = ((props as any).series || plain(props.title || '')).toUpperCase().split(' ').reduce((a: string, w: string) => (a.length + w.length + 1 <= 24 ? (a ? a + ' ' : '') + w : a), '');
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: '#000', opacity: dim }} />
      <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 104, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 28, letterSpacing: '0.3em', color: C.text }}>{brand}</div>
        <div style={{ fontFamily: MONO, fontWeight: 400, fontSize: 24, letterSpacing: '0.24em', color: C.mono }}>{series}</div>
      </div>
      <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 152, display: 'flex', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, k) => { const p = clamp((T / props.duration) * 6 - k); return <div key={k} style={{ flex: 1, height: 5, borderRadius: 3, background: '#2A2F2E', overflow: 'hidden' }}><div style={{ width: `${p * 100}%`, height: '100%', background: C.text }} /></div>; })}
      </div>
      <div style={{ position: 'absolute', left: EDGE, top: 184, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '9px 22px', borderRadius: 999, border: `2px solid ${hexA(R.c, 0.7)}`, background: hexA(R.c, 0.08) }}>
        <div style={{ width: 11, height: 11, borderRadius: 6, background: R.c }} /><MonoLabel c={R.c} size={21}>{R.chip[HI() ? 1 : 0]}</MonoLabel>
      </div>
      {ch ? <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 1462, textAlign: 'center', fontFamily: INTER, fontWeight: 600, fontSize: 54, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,.6)' }}>
        {ch.map((x, k) => <span key={k} style={{ color: t >= x.s - 0.03 ? C.text : C.textU }}>{x.w}{k < ch.length - 1 ? ' ' : ''}</span>)}</div> : null}
    </AbsoluteFill>
  );
};

export const edtech: StyleDef = { Scene, Background, Overlay, captions: false };
