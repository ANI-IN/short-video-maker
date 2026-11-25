// UPI explainer reel: same "system-design canvas" language (shared building blocks), payment-flow story.
import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, CONTENT_DY, CONTENT_S, Card, EDGE, Hero, INTER, M, MONO, MonoLabel, Pill, Pop, Sticker, W, Wire, breathe, clamp, easeInOut, glow, hexA, pop, typed, useFontsMcp, setLang, tx, colorize, fitFont } from './McpReel';
import type { McpReelProps } from './McpReel';

type SP = { t: number; w: (i: number) => number; we: (i: number) => number };

export const UpiReel: React.FC<McpReelProps> = ({ words, duration, audio, brand, series, lang, map }) => {
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
  const tints: Record<string, string> = { hook: '#0B1012', task: '#121816', problem: '#1A1410', solution: '#0E1C16', cta: '#16151F' };
  const glows: Record<string, string> = { hook: 'transparent', task: 'transparent', problem: hexA(C.amber, 0.08), solution: hexA(C.green, 0.07), cta: hexA(C.violet, 0.07) };
  const bounds = [T.task, T.problem, T.solution, T.cta];
  const dim = Math.max(0, ...bounds.map((b) => 0.85 * clamp(1 - Math.abs(t - b) / 0.35)));
  const chunks: { i0: number; i1: number }[] = [];
  { let i0 = 0; for (let i = 0; i < words.length; i++) {
      const end = /[,.?!:]$/.test(words[i].cap) || i - i0 >= 4 || i === words.length - 1 || words[i + 1].sent !== words[i].sent;
      if (end) { chunks.push({ i0, i1: i }); i0 = i + 1; } } }
  const ci = chunks.findIndex((c, k) => t >= words[c.i0].s - 0.05 && (k === chunks.length - 1 || t < words[chunks[k + 1].i0].s - 0.05));
  const cur = ci >= 0 && t < words[chunks[ci].i1].e + 0.9 ? chunks[ci] : null;
  const chip = t < w(14) ? ['INTERVIEW · SYSTEM DESIGN', C.mono] : chapter === 'hook' ? [tx('TUMHARA JAWAAB'), C.mono] : chapter === 'task' ? [tx('TUMHARA TASK'), C.amber]
    : chapter === 'problem' ? [tx('SCALE SAMJHO'), C.amber] : chapter === 'solution' ? ['SOLUTION · UPI FLOW', C.green] : [tx('TUM BATAO'), C.violet];
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      {Object.keys(tints).map((k) => <AbsoluteFill key={k} style={{ opacity: k === chapter ? 1 : 0, background: `radial-gradient(ellipse 75% 45% at 50% 45%, ${tints[k]} 0%, ${C.bg} 72%)` }}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 35% at 50% 47%, ${glows[k]} 0%, transparent 70%)` }} /></AbsoluteFill>)}
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
      <AbsoluteFill style={{ transform: `translate(0px, ${CONTENT_DY}px) scale(${CONTENT_S})`, transformOrigin: '540px 790px' }}>
        {chapter === 'hook' ? <Hook t={t} w={w} we={we} /> : null}
        {chapter === 'task' ? <Task t={t} w={w} we={we} /> : null}
        {chapter === 'problem' ? <Scale t={t} w={w} we={we} /> : null}
        {chapter === 'solution' ? <Flow t={t} w={w} we={we} /> : null}
        {chapter === 'cta' ? <Cta t={t} w={w} we={we} /> : null}
      </AbsoluteFill>
      {cur ? <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 1462, textAlign: 'center', fontFamily: INTER, fontWeight: 600, fontSize: 54, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,.6)' }}>
        {words.slice(cur.i0, cur.i1 + 1).map((x, k) => <span key={k} style={{ color: t >= x.s - 0.03 ? C.text : C.textU }}>{x.cap}{k < cur.i1 - cur.i0 ? ' ' : ''}</span>)}
      </div> : null}
      <AbsoluteFill style={{ background: '#000', opacity: dim, pointerEvents: 'none' }} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ graphics
const Phone: React.FC<{ w?: number; label?: string; active?: boolean; children?: React.ReactNode; c?: string }> = ({ w: ww = 150, label, active, children, c = C.green }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div style={{ width: ww, height: ww * 1.9, borderRadius: ww * 0.16, background: '#0C1110', border: `${Math.max(3, ww * 0.025)}px solid ${active ? c : '#2E3634'}`, boxShadow: active ? glow(c, 0.4, 24) : '0 10px 24px rgba(0,0,0,.5)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '35%', right: '35%', top: ww * 0.05, height: ww * 0.05, borderRadius: 99, background: '#222' }} />
      <div style={{ position: 'absolute', inset: `${ww * 0.14}px ${ww * 0.07}px ${ww * 0.1}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
    {label ? <div style={{ marginTop: 10, fontFamily: INTER, fontWeight: 700, fontSize: 24, color: C.text, textAlign: 'center' }}>{label}</div> : null}
  </div>
);
const BankIcon: React.FC<{ s?: number; c?: string }> = ({ s = 70, c = '#DDE6E2' }) => (
  <svg width={s} height={s} viewBox="0 0 40 40"><path d="M4 14 L20 5 L36 14 Z" fill={c} /><rect x="5" y="15" width="30" height="3" fill={c} />
    {[8, 15, 22, 29].map((x) => <rect key={x} x={x} y="19" width="3.5" height="12" fill={c} />)}<rect x="4" y="32" width="32" height="4" fill={c} /></svg>
);
const Node: React.FC<{ title: string; sub?: string; icon: React.ReactNode; active?: boolean; c?: string; w?: number }> = ({ title, sub, icon, active, c = C.green, w: ww = 420 }) => (
  <div style={{ width: ww, height: 132, boxSizing: 'border-box', padding: '0 22px', borderRadius: 22, background: '#0B1A15', border: `3px solid ${active ? c : C.greenDim}`, boxShadow: active ? glow(c, 0.45, 26) : 'none', display: 'flex', alignItems: 'center', gap: 20 }}>
    <div style={{ flexShrink: 0, width: 72, display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ minWidth: 0 }}><MonoLabel size={23} c={active ? c : C.mono} style={{ letterSpacing: '0.12em' }}>{title}</MonoLabel>{sub ? <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 31, color: C.text, marginTop: 4, whiteSpace: 'nowrap' }}>{sub}</div> : null}</div>
  </div>
);
const Bubble: React.FC<{ who: string; text: React.ReactNode; c?: string; tint?: string; right?: boolean }> = ({ who, text, c = C.cardBorder, tint = '#141B19', right }) => (
  <div style={{ display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: 860, padding: '14px 24px', borderRadius: 18, background: tint, border: `2px solid ${c}` }}>
    <MonoLabel size={17} c={c === C.cardBorder ? C.mono : c}>{who}</MonoLabel><div style={{ marginTop: 6, fontFamily: INTER, fontWeight: 600, fontSize: 36, color: C.text }}>{text}</div></div></div>
);

// ------------------------------------------------------------------ 1 hook
const Hook: React.FC<SP> = ({ t, w, we }) => {
  const q = typed(tx('UPI pe ₹50 bheje, beech mein kya hota hai?'), t, w(0) + 0.1, we(13));
  const flowK = clamp((t - w(16)) / 1.4);
  return <>
    <Pop t={t} at={0} x={M} y={400} w={W - 2 * M}><Bubble who="Interviewer · system design round" text={<>{q}<span style={{ opacity: Math.sin(t * 12) > 0 && q.length < tx('UPI pe ₹50 bheje, beech mein kya hota hai?').length ? 1 : 0 }}>|</span></>} /></Pop>
    <Pop t={t} at={w(14) - 0.1} x={M} y={560} w={W - 2 * M}><Bubble right who={tx('Tum')} c={C.greenDim} tint={hexA(C.green, 0.08)} text={typed(tx('Paise chale gaye.'), t, w(14), we(18))} /></Pop>
    <Pop t={t} at={w(4)} x={M} y={760} w={180}><Phone w={140} label={tx('Tum')} active><div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 40, color: C.green }}>₹50</div></Phone></Pop>
    <Pop t={t} at={w(4) + 0.12} x={W - M - 180} y={760} w={180}><Phone w={140} label={tx('Chai wala')} active={t > w(18)}><div style={{ fontSize: 56 }}>☕</div></Phone></Pop>
    <Pop t={t} at={w(9)} x={350} y={800} w={380} h={210}>
      <div style={{ width: '100%', height: '100%', borderRadius: 22, background: '#050707', border: `3px dashed ${C.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: glow(C.amber, 0.2, 20) }}>
        <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 110, color: C.amber, transform: `scale(${t > w(19) ? breathe(t, 0.08) : 1})` }}>?</div>
        <MonoLabel size={18} c={C.amber}>{tx('beech mein kya?')}</MonoLabel>
      </div>
    </Pop>
    {flowK > 0 && flowK < 1 ? <div style={{ position: 'absolute', left: 240 + flowK * 560, top: 870, fontFamily: INTER, fontWeight: 900, fontSize: 34, color: C.green, opacity: flowK < 0.3 || flowK > 0.75 ? 1 : 0.15 }}>₹</div> : null}
  </>;
};

// ------------------------------------------------------------------ 2 task: scan, amount, PIN, done
const Task: React.FC<SP> = ({ t, w, we }) => {
  const scanAt = w(30), amtAt = w(32), pinAt = w(34), doneAt = w(36);
  const stage = t < amtAt ? 'scan' : t < pinAt ? 'amt' : t < doneAt ? 'pin' : 'done';
  return <>
    <Pop t={t} at={w(22)} x={0} y={404} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill>🎯 {typed(tx('Chai waale ko ₹50 bhejo'), t, w(22), we(29))}</Pill></Pop>
    <Pop t={t} at={w(23)} x={W / 2 - 160} y={500} w={320}>
      <Phone w={300} active={stage === 'done'}>
        {stage === 'scan' ? <div style={{ position: 'relative', width: 200, height: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-conic-gradient(#e8e8e8 0 25%, #111 0 50%) 0 0/25px 25px', borderRadius: 8, opacity: t >= scanAt ? 1 : 0.25 }} />
          {[[0, 0], [140, 0], [0, 140]].map(([x, y], i) => <div key={i} style={{ position: 'absolute', left: x, top: y, width: 60, height: 60, border: '10px solid #111', background: '#e8e8e8', boxSizing: 'border-box', outline: '4px solid #e8e8e8' }} />)}
          {t >= scanAt ? <div style={{ position: 'absolute', left: -10, right: -10, top: ((t - scanAt) * 260) % 200, height: 4, background: C.green, boxShadow: glow(C.green, 0.8, 12) }} /> : null}
          <MonoLabel size={16} c={C.mono} style={{ position: 'absolute', top: 214, width: 200, textAlign: 'center' }}>{tx('ramuchai@ybl')}</MonoLabel>
        </div> : null}
        {stage === 'amt' ? <div style={{ textAlign: 'center' }}><MonoLabel size={16}>{tx('Ramu Chai Stall')}</MonoLabel>
          <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 90, color: C.text, marginTop: 20 }}>₹{typed('50', t, amtAt, amtAt + 0.4)}</div></div> : null}
        {stage === 'pin' ? <div style={{ textAlign: 'center' }}><div style={{ fontSize: 54 }}>🔒</div><MonoLabel size={16} style={{ marginTop: 10 }}>UPI PIN</MonoLabel>
          <div style={{ display: 'flex', gap: 14, marginTop: 20 }}>{[0, 1, 2, 3].map((k) => <div key={k} style={{ width: 26, height: 26, borderRadius: 13, border: `3px solid ${C.text2}`, background: t > pinAt + k * 0.12 ? C.text : 'transparent' }} />)}</div></div> : null}
        {stage === 'done' ? <div style={{ textAlign: 'center', transform: `scale(${pop(t, doneAt, 0.35).s})` }}>
          <div style={{ width: 130, height: 130, borderRadius: 65, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: '#06120D', fontWeight: 900, boxShadow: glow(C.green, 0.6, 30) }}>✓</div>
          <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 44, color: C.text, marginTop: 20 }}>₹50 paid</div></div> : null}
      </Phone>
    </Pop>
    {([['📷 Scan', scanAt], ['₹ Amount', amtAt], ['🔒 PIN', pinAt], ['✓ Done', doneAt]] as const).map(([l, a], i) =>
      <Pop key={i} t={t} at={a} x={M - 20 + i * 228} y={1135} w={210} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={i === 3 ? C.green : C.amber} size={24}>{l}</Pill></Pop>)}
  </>;
};

// ------------------------------------------------------------------ 3 the scale
const count = (t: number, t0: number, t1: number, v: number) => Math.round(v * easeInOut(clamp((t - t0) / (t1 - t0))));
const Scale: React.FC<SP> = ({ t, w }) => (
  <>
    <Pop t={t} at={w(38)} x={0} y={420} w={W}><MonoLabel size={26} c={C.amber} style={{ textAlign: 'center' }}>UPI · OCTOBER 2026</MonoLabel></Pop>
    <Pop t={t} at={w(39)} x={0} y={480} w={W}>
      <div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 170, color: C.amber, textShadow: glow(C.amber, 0.5, 36), lineHeight: 1 }}>{count(t, w(43), w(46), 2547).toLocaleString('en-IN')}</div>
      <div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 800, fontSize: 46, color: C.text, marginTop: 6 }}>crore transactions</div>
    </Pop>
    <Pop t={t} at={w(50)} x={M} y={780} w={(W - 2 * M) / 2 - 14} h={250}>
      <Card active color={C.amber}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <MonoLabel size={18} c={C.amber}>{tx('ROZ')}</MonoLabel>
        <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 96, color: C.text }}>~{count(t, w(51), w(54), 82)}</div>
        <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 30, color: C.text2 }}>{tx('crore / din')}</div></div></Card>
    </Pop>
    <Pop t={t} at={w(55)} x={W / 2 + 14} y={780} w={(W - 2 * M) / 2 - 14} h={250}>
      <Card active color={C.green}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <MonoLabel size={18} c={C.green}>{tx('HAR EK')}</MonoLabel>
        <div style={{ position: 'relative', width: 110, height: 110, margin: '8px 0' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 55, border: `6px solid ${C.green}` }} />
          <div style={{ position: 'absolute', left: 52, top: 12, width: 6, height: 44, background: C.text, borderRadius: 3, transformOrigin: '3px 43px', transform: `rotate(${(t - w(55)) * 360}deg)` }} />
        </div>
        <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 30, color: C.text2 }}>{tx('kuch hi second')}</div></div></Card>
    </Pop>
    <Pop t={t} at={w(61)} x={0} y={1080} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.amber} size={34}>{tx('🤔 Kaise?')}</Pill></Pop>
    <Pop t={t} at={w(44)} x={0} y={1205} w={W}><MonoLabel size={16} c={C.textU} style={{ textAlign: 'center' }}>source: NPCI data</MonoLabel></Pop>
  </>
);

// ------------------------------------------------------------------ 4 the flow
const Flow: React.FC<SP> = ({ t, w, we }) => {
  const NW = 420, L = M - 20, R = W - M + 20 - NW;                  // two columns of 420 px nodes, 64 px apart
  const P = { app: { x: L, y: 500 }, payee: { x: R, y: 500 }, sw: { x: 220, y: 770, w: 640, h: 170 }, bank: { x: L, y: 1050 }, pbank: { x: R, y: 1050 } };
  const xa = L + 330, xb = R + 90;                                     // wire columns (inside the switch's width)
  const appAt = w(62), pspAt = w(77), swAt = w(83), lookAt = w(94), bankAt = w(113), pinAt = w(117), debitAt = w(124), creditAt = w(137), okAt = w(141), dingA = w(150), dingB = w(152), failAt = w(153);
  const fail = t >= failAt;
  const stepOn = [t >= appAt, t >= swAt, t >= bankAt];
  const debit = t >= debitAt, credit = t >= creditAt;
  const bal = debit ? 1200 - 0 : 1250;
  return <>
    <div style={{ position: 'absolute', left: M, right: M, top: 404, display: 'flex', gap: 14, opacity: fail ? 0.25 : 1 }}>
      {(['1 · APP', '2 · NPCI SWITCH', '3 · BANK'] as const).map((l, k) => <div key={k} style={{ flex: 1, height: 60, borderRadius: 14, border: `2px solid ${stepOn[k] ? C.green : C.cardBorder}`, background: stepOn[k] ? hexA(C.green, 0.07) : C.card,
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: stepOn[k] ? glow(C.green, 0.25, 12) : 'none' }}><MonoLabel size={18} c={stepOn[k] ? C.green : C.mono}>{l}</MonoLabel></div>)}
    </div>
    <div style={{ position: 'absolute', inset: 0, opacity: fail ? 0.18 : 1 }}>
      {/* wires */}
      <Wire d={`M ${xa} 632 L ${xa} ${P.sw.y}`} prog={clamp((t - swAt) / 0.4)} c={C.green} width={5} />
      <Wire d={`M ${xb} ${P.sw.y} L ${xb} 632`} prog={clamp((t - okAt) / 0.4)} c={C.green} width={5} />
      <Wire d={`M ${xa} ${P.sw.y + P.sw.h} L ${xa} ${P.bank.y}`} prog={clamp((t - bankAt) / 0.4)} c={C.green} width={5} />
      <Wire d={`M ${xb} ${P.sw.y + P.sw.h} L ${xb} ${P.pbank.y}`} prog={clamp((t - w(128)) / 0.4)} c={C.green} width={5} />
      {/* your app + partner bank */}
      <Pop t={t} at={appAt} x={P.app.x} y={P.app.y} w={NW}>
        <Node title="UPI APP" sub={t >= w(66) ? 'PhonePe / GPay' : tx('tumhara app')} active={t < swAt} icon={<div style={{ fontSize: 60 }}>📱</div>} />
        {t >= w(69) && t < pspAt ? <div style={{ marginTop: 12, opacity: pop(t, w(69)).o }}><Pill c={C.redB} size={24}>{tx('₹ khud nahi rakhta')}</Pill></div> : null}
        {t >= pspAt ? <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, opacity: pop(t, pspAt).o }}><BankIcon s={44} c={C.green} /><MonoLabel size={20} c={C.green}>partner bank</MonoLabel></div> : null}
      </Pop>
      {/* payee */}
      <Pop t={t} at={lookAt - 0.1} x={P.payee.x} y={P.payee.y} w={NW}><Node title={tx('CHAI WALA')} sub={tx('ramuchai@ybl')} active={t >= okAt} icon={<div style={{ fontSize: 60 }}>☕</div>} /></Pop>
      {/* switch */}
      <Pop t={t} at={swAt} x={P.sw.x} y={P.sw.y} w={P.sw.w} h={P.sw.h}>
        <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 26, background: '#0B1A15', border: `4px solid ${C.green}`, boxShadow: glow(C.green, 0.5, 34), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>{[0, 1, 2, 3, 4, 5, 6].map((k) => <div key={k} style={{ width: 16, height: 16, borderRadius: 8, background: Math.sin(t * 8 + k) > 0 ? C.green : C.greenDim }} />)}</div>
          <MonoLabel size={34} c={C.green} style={{ letterSpacing: '0.14em', fontWeight: 800 }}>NPCI UPI SWITCH</MonoLabel>
          {t >= w(91) ? <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 28, color: C.text2, marginTop: 6, opacity: pop(t, w(91)).o }}>{tx('India ka central router')}</div> : null}
        </div>
      </Pop>
      {/* lookup: under the switch, before the banks arrive */}
      <Pop t={t} at={w(98)} until={bankAt} x={P.sw.x} y={P.sw.y + P.sw.h + 22} w={P.sw.w} style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '12px 22px', borderRadius: 12, background: '#F4EFE3', color: '#222', fontFamily: MONO, fontWeight: 700, fontSize: 28, boxShadow: '0 8px 18px rgba(0,0,0,.5)', whiteSpace: 'nowrap' }}>
          {tx('ramuchai@ybl')} → {typed(tx('Ramu ka bank 🏦'), t, w(108), w(111))}</div>
      </Pop>
      {/* banks */}
      <Pop t={t} at={bankAt} x={P.bank.x} y={P.bank.y} w={NW}>
        <Node title={tx('TUMHARA BANK')} sub={debit ? `₹${bal.toLocaleString('en-IN')}` : '₹1,250'} active={t >= bankAt && t < creditAt} icon={<BankIcon s={64} />} />
        {t >= pinAt ? <div style={{ position: 'absolute', right: -10, top: -22, padding: '4px 12px', borderRadius: 12, background: '#0B1A15', border: `2px solid ${C.green}`, fontFamily: INTER, fontWeight: 800, fontSize: 24, color: C.green, opacity: pop(t, pinAt).o }}>🔒 PIN ✓</div> : null}
        {debit && t < debitAt + 1.6 ? <div style={{ position: 'absolute', left: 110, top: -70 - (t - debitAt) * 30, fontFamily: INTER, fontWeight: 900, fontSize: 56, color: C.redB, textShadow: glow(C.redB, 0.5, 16), opacity: 1 - clamp((t - debitAt - 1.0) / 0.6) }}>−₹50</div> : null}
      </Pop>
      <Pop t={t} at={w(128)} x={P.pbank.x} y={P.pbank.y} w={NW}>
        <Node title={tx('RAMU KA BANK')} sub={credit ? tx('+₹50 credit') : tx('credit karo')} active={t >= w(128) && t < okAt + 0.5} icon={<BankIcon s={64} />} />
        {credit && t < creditAt + 1.6 ? <div style={{ position: 'absolute', left: 140, top: -70 - (t - creditAt) * 30, fontFamily: INTER, fontWeight: 900, fontSize: 56, color: C.green, textShadow: glow(C.green, 0.5, 16), opacity: 1 - clamp((t - creditAt - 1.0) / 0.6) }}>+₹50</div> : null}
      </Pop>
      {/* stickers */}
      <Sticker t={t} t0={w(74)} t1={w(82)} text={tx('📨 ₹50 → ramuchai@ybl')} pts={[[xa, 600], [xa, P.sw.y + 20]]} hold={0.3} />
      <Sticker t={t} t0={okAt} t1={w(147)} text="✅ Success" c="#0B5E43" pts={[[xb, P.sw.y + 20], [xb, 600]]} hold={0.3} />
      <Sticker t={t} t0={okAt + 0.1} t1={w(147) + 0.1} text="✅ Success" c="#0B5E43" pts={[[xa, P.sw.y + 20], [xa, 600]]} hold={0.3} />
      {([[dingA, P.app.x], [dingB, P.payee.x]] as const).map(([a, x], i) => t >= a && t < a + 1.5 ? <div key={i} style={{ position: 'absolute', left: x + NW / 2 - 110, width: 220, top: 535 - (t - a) * 20, opacity: 1 - clamp((t - a - 0.9) / 0.6), textAlign: 'center',
        padding: '8px 0', borderRadius: 40, background: '#06120D', border: `3px solid ${C.green}`, fontFamily: INTER, fontWeight: 900, fontSize: 44, color: C.green, boxShadow: glow(C.green, 0.6, 22), transform: `scale(${pop(t, a, 0.2).s})` }}>🔔 ding!</div> : null)}
    </div>
    {/* failed payment + RBI rule */}
    {fail ? <>
      <Pop t={t} at={failAt} x={M - 10} y={480} w={W - 2 * M + 20} h={230}>
        <Card active color={C.redB}><div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 30px' }}>
          <div style={{ textAlign: 'center' }}><BankIcon s={70} /><div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 40, color: C.redB }}>−₹50</div><MonoLabel size={15}>{tx('tumhara bank')}</MonoLabel></div>
          <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 110, color: C.redB, opacity: t >= w(161) ? 1 : 0.3 }}>✕</div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 60 }}>🧑</div><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 30, color: C.text2 }}>{tx('dost: ₹0')}</div><MonoLabel size={15}>{tx('pahunche nahi')}</MonoLabel></div>
        </div></Card>
      </Pop>
      <Pop t={t} at={w(164)} x={M - 10} y={750} w={W - 2 * M + 20} h={360}>
        <Card active color={C.green} style={{ padding: '22px 30px' }}>
          <MonoLabel size={20} c={C.green}>RBI RULE · FAILED UPI (P2P)</MonoLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 22, opacity: pop(t, w(168)).o }}>
            <div style={{ fontSize: 64 }}>📅</div><div><div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 46, color: C.text }}>{tx('T+1 tak auto refund')}</div><div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 26, color: C.text2 }}>{tx('agle din tak paise wapas')}</div></div></div>
          {t >= w(173) ? <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 24, opacity: pop(t, w(173)).o, transform: `scale(${pop(t, w(173)).s})`, transformOrigin: 'left' }}>
            <div style={{ fontSize: 64 }}>💸</div><div><div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 46, color: C.amber }}>{tx('warna ₹100 / din')}</div><div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 26, color: C.text2 }}>{tx('bank compensation dega')}</div></div></div> : null}
        </Card>
      </Pop>
    </> : null}
  </>;
};

// ------------------------------------------------------------------ 5 call to action
const Cta: React.FC<SP> = ({ t, w, we }) => (
  <>
    <Pop t={t} at={w(180)} x={0} y={430} w={W} dur={0.35}><div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 120, color: C.text, letterSpacing: '0.03em' }}>{tx('TUM BATAO 🤔')}</div></Pop>
    <Pop t={t} at={w(183)} x={0} y={640} w={W}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ padding: '22px 40px', borderRadius: 22, background: '#0B1A15', border: `3px solid ${C.green}`, boxShadow: glow(C.green, 0.35, 22), fontFamily: MONO, fontWeight: 800, fontSize: 58, color: C.text }}>
        {tx('ramuchai')}<span style={{ color: C.amber, textShadow: t >= w(186) ? glow(C.amber, 0.7, 18) : 'none' }}>@ybl</span></div></div>
      {t >= w(186) ? <div style={{ position: 'absolute', left: 690, top: 120, fontFamily: INTER, fontWeight: 900, fontSize: 64, color: C.amber, opacity: pop(t, w(186)).o }}>↑ ?</div> : null}
    </Pop>
    <Pop t={t} at={w(192)} x={0} y={860} w={W} style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
      <Pill c={C.amber} size={30}>@ybl</Pill>{t >= w(194) ? <Pill c={C.amber} size={30}>@oksbi</Pill> : null}<Pill c={C.amber} size={30}>= ?</Pill>
    </Pop>
    <Pop t={t} at={w(198) - 0.2} x={M - 20} y={990} w={W - 2 * M + 40} h={110}>
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 60, border: `3px solid ${C.green}`, boxShadow: glow(C.green, 0.35, 22), background: '#0B1311', display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px 0 30px' }}>
        <span style={{ fontSize: 40 }}>💬</span>
        <span style={{ flex: 1, fontFamily: INTER, fontWeight: 600, fontSize: 36, color: C.text }}>{typed(tx('Yeh batata hai ki…'), t, w(198), we(200) + 0.4)}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0 }}>|</span></span>
        <span style={{ background: C.green, color: '#06120D', fontFamily: INTER, fontWeight: 800, fontSize: 30, borderRadius: 30, padding: '10px 26px' }}>Post</span>
      </div>
    </Pop>
    <Pop t={t} at={w(198)} x={0} y={1120} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green} size={26}>{tx('👇 Comment mein batao')}</Pill></Pop>
  </>
);
