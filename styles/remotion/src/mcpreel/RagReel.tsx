// RAG explainer reel: same "system-design canvas" language as McpReel (shared building blocks), new story.
import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  AppIcon, BrainRing, C, CONTENT_DY, CONTENT_S, Card, Dots, EDGE, HAND, Hero, INTER, M, MONO, MonoLabel, Pill, Pop, Sticker, W, Wire,
  breathe, clamp, easeInOut, glow, hexA, pop, typed, useFontsMcp, setLang, tx, colorize, fitFont,
} from './McpReel';
import type { McpReelProps } from './McpReel';

type SP = { t: number; w: (i: number) => number; we: (i: number) => number };

export const RagReel: React.FC<McpReelProps> = ({ words, duration, audio, brand, series, lang, map }) => {
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
  const glows: Record<string, string> = { hook: 'transparent', task: 'transparent', problem: hexA(C.red, 0.10), solution: hexA(C.green, 0.07), cta: hexA(C.violet, 0.07) };
  const bounds = [T.task, T.problem, T.solution, T.cta];
  const dim = Math.max(0, ...bounds.map((b) => 0.85 * clamp(1 - Math.abs(t - b) / 0.35)));
  const stamps = [w(22), w(59)];
  const st = stamps.find((s) => t > s && t < s + 0.12);
  const shake = st !== undefined ? Math.sin((t - st) * 160) * 7 : 0;

  const chunks: { i0: number; i1: number }[] = [];
  { let i0 = 0; for (let i = 0; i < words.length; i++) {
      const end = /[,.?!:]$/.test(words[i].cap) || i - i0 >= 4 || i === words.length - 1 || words[i + 1].sent !== words[i].sent;
      if (end) { chunks.push({ i0, i1: i }); i0 = i + 1; } } }
  const ci = chunks.findIndex((c, k) => t >= words[c.i0].s - 0.05 && (k === chunks.length - 1 || t < words[chunks[k + 1].i0].s - 0.05));
  const cur = ci >= 0 && t < words[chunks[ci].i1].e + 0.9 ? chunks[ci] : null;
  const chip = t < w(11) ? ['INTERVIEW · AI ENGINEERING', C.mono] : chapter === 'hook' ? [tx('TUMHARA JAWAAB'), C.mono] : chapter === 'task' ? [tx('TUMHARA TASK'), C.amber]
    : chapter === 'problem' ? [tx('PROBLEM SAMJHO'), C.redB] : chapter === 'solution' ? ['SOLUTION · RAG', C.green] : [tx('TUM BATAO'), C.violet];

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      {Object.keys(tints).map((k) => <AbsoluteFill key={k} style={{ opacity: k === chapter ? 1 : 0, background: `radial-gradient(ellipse 75% 45% at 50% 45%, ${tints[k]} 0%, ${C.bg} 72%)` }}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 35% at 50% 47%, ${glows[k]} 0%, transparent 70%)` }} /></AbsoluteFill>)}
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
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
          {chapter === 'problem' ? <Problem t={t} w={w} we={we} /> : null}
          {chapter === 'solution' ? <Solution t={t} w={w} we={we} /> : null}
          {chapter === 'cta' ? <Cta t={t} w={w} we={we} /> : null}
        </AbsoluteFill>
      </AbsoluteFill>
      {cur ? <div style={{ position: 'absolute', left: EDGE, right: EDGE, top: 1462, textAlign: 'center', fontFamily: INTER, fontWeight: 600, fontSize: 54, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,.6)' }}>
        {words.slice(cur.i0, cur.i1 + 1).map((x, k) => <span key={k} style={{ color: t >= x.s - 0.03 ? C.text : C.textU }}>{x.cap}{k < cur.i1 - cur.i0 ? ' ' : ''}</span>)}
      </div> : null}
      <AbsoluteFill style={{ background: '#000', opacity: dim, pointerEvents: 'none' }} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ shared bits for this story
const Stamp: React.FC<{ t: number; at: number; text: string; c?: string; x?: number; y?: number; w?: number; size?: number }> = ({ t, at, text, c = C.redB, x = 150, y = 930, w: ww = 780, size = 110 }) => {
  if (t < at) return null; const k = clamp((t - at) / 0.12);
  return <div style={{ position: 'absolute', left: x, top: y, width: ww, height: size * 1.35, opacity: k, transform: `scale(${1.25 - 0.25 * k}) rotate(-8deg)`, border: `10px solid ${c}`, borderRadius: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: INTER, fontWeight: 900, fontSize: fitFont(text, ww - 60, size), color: c, letterSpacing: '0.06em', textShadow: `0 0 24px ${hexA(c, 0.4)}`, background: hexA(c, 0.06) }}>{text}</div>;
};
const Pdf: React.FC<{ name: string; dim?: boolean; size?: number }> = ({ name, dim, size = 1 }) => (
  <div style={{ width: 190 * size, height: 230 * size, borderRadius: 14 * size, background: dim ? '#1B201E' : '#F4F1EA', position: 'relative', boxShadow: '0 10px 24px rgba(0,0,0,.5)', overflow: 'hidden', opacity: dim ? 0.6 : 1 }}>
    <div style={{ position: 'absolute', right: 0, top: 0, width: 46 * size, height: 46 * size, background: dim ? '#2A302E' : '#D9D3C6', clipPath: 'polygon(0 0,100% 100%,0 100%)' }} />
    <div style={{ position: 'absolute', left: 14 * size, top: 16 * size, background: '#D9473A', color: '#fff', fontFamily: INTER, fontWeight: 900, fontSize: 18 * size, borderRadius: 6, padding: `${3 * size}px ${8 * size}px` }}>PDF</div>
    {[0, 1, 2, 3, 4].map((k) => <div key={k} style={{ position: 'absolute', left: 14 * size, right: 18 * size, top: (64 + k * 26) * size, height: 8 * size, borderRadius: 4, background: dim ? '#333A37' : '#C9C2B4', width: `${70 - (k % 3) * 12}%` }} />)}
    <div style={{ position: 'absolute', left: 10 * size, right: 10 * size, bottom: 10 * size, fontFamily: MONO, fontSize: 15 * size, color: dim ? C.textU : '#333', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>{name}</div>
  </div>
);
const Bubble: React.FC<{ who: string; text: string; c?: string; tint?: string; mono?: boolean; w?: number }> = ({ who, text, c = C.cardBorder, tint = '#141B19', mono, w: ww = 860 }) => (
  <div style={{ width: ww, boxSizing: 'border-box', padding: '16px 24px', borderRadius: 20, background: tint, border: `2px solid ${c}` }}>
    <MonoLabel size={17} c={c === C.cardBorder ? C.mono : c}>{who}</MonoLabel>
    <div style={{ marginTop: 6, fontFamily: mono ? MONO : INTER, fontWeight: 600, fontSize: mono ? 26 : 34, color: C.text, lineHeight: 1.3 }}>{text}</div>
  </div>
);

// ------------------------------------------------------------------ 1 hook
const Hook: React.FC<SP> = ({ t, w, we }) => {
  const q = typed(tx('RAG aur fine-tuning mein farak?'), t, w(0) + 0.1, we(10));
  const ans = typed(tx('Dono se AI smart banta hai.'), t, w(13), we(18));
  return <>
    <Pop t={t} at={0} x={M} y={400} w={W - 2 * M}>
      <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 30, color: C.text }}>Interviewer <span style={{ fontFamily: MONO, fontSize: 19, color: C.amber, letterSpacing: '0.16em', fontWeight: 600 }}>· AI ENGINEER ROUND</span></div>
      <div style={{ marginTop: 10, display: 'inline-block', padding: '14px 24px', borderRadius: 16, background: '#141B19', border: `2px solid ${C.cardBorder}`, fontFamily: INTER, fontWeight: 600, fontSize: 38, color: C.text }}>
        {colorize(q, tx('RAG aur fine-tuning mein farak?'), [['RAG', C.green], ['fine-tuning', C.amber]])}<span style={{ opacity: Math.sin(t * 12) > 0 && q.length < tx('RAG aur fine-tuning mein farak?').length ? 1 : 0 }}>|</span></div>
    </Pop>
    <Pop t={t} at={w(11) - 0.1} x={M} y={590} w={W - 2 * M} style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ padding: '14px 24px', borderRadius: 16, background: hexA(C.green, 0.08), border: `2px solid ${C.greenDim}`, fontFamily: INTER, fontWeight: 600, fontSize: 36, color: C.text }}>
        <MonoLabel size={17} c={C.green}>{tx('TUM')}</MonoLabel>{ans || ' '}</div>
    </Pop>
    {([['RAG', C.green, 140], ['FINE-TUNING', C.amber, 560]] as const).map(([lab, c, x], k) =>
      <Pop key={lab} t={t} at={w(13) + k * 0.15} x={x} y={770} w={380} h={240}>
        <Card active color={c}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: lab === 'RAG' ? 110 : 64, color: c, textShadow: glow(c, 0.45, 22), lineHeight: 1 }}>{lab}</div>
          <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 28, color: C.text2, marginTop: 14 }}>= AI smart?</div></div></Card>
      </Pop>)}
    {t > w(17) ? <div style={{ position: 'absolute', left: 498, top: 860, fontFamily: INTER, fontWeight: 900, fontSize: 70, color: C.text2, opacity: pop(t, w(17)).o }}>=</div> : null}
    <Stamp t={t} at={w(22)} text={tx('ADHOORA')} c={C.amber} x={180} y={830} w={720} size={104} />
  </>;
};

// ------------------------------------------------------------------ 2 task
const Task: React.FC<SP> = ({ t, w, we }) => {
  const pdfs = [['leave_policy.pdf', w(31)], ['holidays_2026.pdf', w(32) + 0.1], ['wfh_rules.pdf', w(34)]] as const;
  return <>
    <Pop t={t} at={w(23)} x={0} y={404} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill>🎯 {typed(tx('Company ka HR bot banana hai'), t, w(23), we(29))}</Pill></Pop>
    <Pop t={t} at={w(28)} x={M - 20} y={500} w={W - 2 * M + 40} h={300}>
      <Card style={{ padding: '16px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}><Dots /><MonoLabel size={21} c={C.text} style={{ flex: 1, textAlign: 'center' }}>🤖 HR BOT</MonoLabel></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, justifyContent: 'center' }}>
          <div style={{ transform: 'scale(0.55)', margin: -60 }}><BrainRing t={t} r={120} /></div>
          <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 30, color: C.text2 }}>{tx('"Leave policy kya hai?"')}<br /><span style={{ color: C.amber }}>?</span></div>
        </div>
      </Card>
    </Pop>
    {pdfs.map(([n, a], i) => <Pop key={n} t={t} at={a} x={M + 10 + i * 300} y={870} w={200} rot={(i - 1) * 4}><Pdf name={n} /></Pop>)}
    <Wire d={`M 540 868 L 540 800`} prog={clamp((t - w(35)) / 0.35)} c={C.amber} dash="6 8" width={4} />
    <Pop t={t} at={w(35)} x={0} y={1120} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.amber} size={24}>{tx('📄 PDFs padh kar jawaab')}</Pill></Pop>
  </>;
};

// ------------------------------------------------------------------ 3 problem: hallucination + retraining
const Problem: React.FC<SP> = ({ t, w, we }) => {
  const partB = w(62) - 0.1;
  if (t >= partB) {
    const steps = [['📄', tx('Nayi PDF'), w(63)], ['🔁', 'Model TRAIN', w(68)], ['🧠', tx('Naya model'), w(69) + 0.2]] as const;
    return <>
      <Pop t={t} at={partB} x={0} y={404} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.redB}>🔁 {typed(tx('Har PDF pe dobara training?'), t, partB, we(69))}</Pill></Pop>
      {steps.map(([e, lab, a], i) => <React.Fragment key={i}>
        <Pop t={t} at={a} x={M + i * 300} y={520} w={264} h={230}>
          <Card active={i === 1} color={C.redB}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 84, transform: i === 1 ? `rotate(${t * 180}deg)` : undefined }}>{e}</div>
            <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 30, color: C.text, marginTop: 10 }}>{lab}</div></div></Card>
        </Pop>
        {i < 2 ? <Wire d={`M ${M + 268 + i * 300} 635 L ${M + 296 + i * 300} 635`} prog={clamp((t - a - 0.2) / 0.25)} c={C.redB} width={5} /> : null}
      </React.Fragment>)}
      <Pop t={t} at={w(70)} x={M} y={830} w={420} h={220}><Card active color={C.redB}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 92, color: C.redB }}>₹₹₹</div><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 32, color: C.text }}>{tx('Mehenga')}</div></div></Card></Pop>
      <Pop t={t} at={w(72)} x={W - M - 420} y={830} w={420} h={220}><Card active color={C.amber}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 86 }}>⏳</div><div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 32, color: C.text }}>Slow</div></div></Card></Pop>
    </>;
  }
  const dimPdf = t >= w(44);
  return <>
    <Pop t={t} at={w(39)} x={0} y={404} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.redB}>⚠️ {typed(tx('Model ne PDFs dekhi hi nahi'), t, w(39), we(47))}</Pill></Pop>
    <Pop t={t} at={w(40)} x={M} y={500} w={360}><div style={{ transform: 'scale(0.75)', transformOrigin: '0 0' }}><BrainRing t={t} r={120} color={C.redB} /></div>
      <MonoLabel size={22} c={C.redB} style={{ marginTop: -40, textAlign: 'center', width: 252 }}>CHATGPT</MonoLabel></Pop>
    {['leave_policy.pdf', 'wfh_rules.pdf'].map((n, i) => <Pop key={n} t={t} at={w(43) + i * 0.15} x={560 + i * 220} y={500 + i * 30} w={200} rot={(i ? 5 : -4)}>
      <div style={{ position: 'relative' }}><Pdf name={n} dim={dimPdf} size={0.9} />
        {dimPdf ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 120, color: C.redB, opacity: pop(t, w(45)).o }}>✕</div> : null}</div></Pop>)}
    <Pop t={t} at={w(48)} x={M} y={800} w={W - 2 * M}><Bubble who="Employee" text={tx('Mujhe kitni chhuttiyan milti hain?')} /></Pop>
    <Pop t={t} at={w(50)} x={M} y={940} w={W - 2 * M}><Bubble who="HR Bot · confident 😎" c={C.redB} tint={hexA(C.redB, 0.08)} text={typed(tx('Aapko saal mein 45 chhuttiyan milti hain! ✅'), t, w(50), we(57))} /></Pop>
    <Stamp t={t} at={w(59)} text="HALLUCINATION" c={C.redB} x={110} y={880} w={860} size={84} />
  </>;
};

// ------------------------------------------------------------------ 4 solution: the RAG pipeline
const CL = [  // chunk scatter: 3 clusters (leave = green, salary = amber, laptop = blue) - start scattered, end clustered
  ...[0, 1, 2, 3].map((k) => ({ c: C.green, x0: 120 + k * 190, y0: 80 + (k % 2) * 160, x1: 170 + (k % 2) * 60, y1: 90 + Math.floor(k / 2) * 55 })),
  ...[0, 1, 2].map((k) => ({ c: C.amber, x0: 700 - k * 210, y0: 230 - k * 60, x1: 600 + (k % 2) * 60, y1: 200 + k * 40 })),
  ...[0, 1, 2].map((k) => ({ c: '#6FA8F5', x0: 300 + k * 160, y0: 40 + k * 90, x1: 320 + k * 55, y1: 240 + (k % 2) * 30 })),
];
const Solution: React.FC<SP> = ({ t, w, we }) => {
  const hero = [w(74), w(91) - 0.25];
  const litR = t >= w(152), litA = t >= w(165), litG = t >= w(180);
  const chipsOn = t >= w(91);
  return <>
    {chipsOn ? <div style={{ position: 'absolute', left: M, right: M, top: 404, display: 'flex', gap: 14 }}>
      {([['R', 'RETRIEVAL', tx('dhoondo'), litR], ['A', 'AUGMENTED', tx('jodo'), litA], ['G', 'GENERATION', tx('likho'), litG]] as const).map(([L, lab, v, on], k) =>
        <div key={k} style={{ flex: 1, height: 72, borderRadius: 14, boxSizing: 'border-box', border: `2px solid ${on ? C.green : C.cardBorder}`, background: on ? hexA(C.green, 0.07) : C.card, boxShadow: on ? glow(C.green, 0.3, 14) : 'none',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', opacity: pop(t, w(91) + k * 0.1).o }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: on ? C.green : '#2A302E', color: on ? '#06120D' : C.mono, fontFamily: INTER, fontWeight: 900, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{L}</div>
          <div><MonoLabel size={15} c={on ? C.green : C.mono}>{lab}</MonoLabel>{on ? <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 22, color: C.text }}>{v}</div> : null}</div>
        </div>)}
    </div> : null}
    {t < hero[1] + 0.3 ? <>
      <Hero t={t} at={hero[0]} until={hero[1]} word="RAG" y={540} />
      <Pop t={t} at={w(77)} until={hero[1]} x={0} y={820} w={W}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 26, fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: '0.12em' }}>
          {([['Retrieval', 77], ['Augmented', 78], ['Generation', 79]] as const).map(([s, i]) => <span key={s} style={{ color: t >= w(i) ? C.green : C.textU }}><b style={{ color: t >= w(i) ? C.text : C.textU }}>{s[0]}</b>{s.slice(1)}</span>)}
        </div></Pop>
      <Pop t={t} at={w(84)} until={hero[1]} x={0} y={910} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green}>📄 Facebook AI Research · 2020 paper</Pill></Pop>
    </> : null}
    {t >= w(91) - 0.1 && t < w(126) - 0.1 ? <Indexing t={t} w={w} we={we} /> : null}
    {t >= w(126) - 0.1 && t < w(181) - 0.1 ? <Query t={t} w={w} we={we} /> : null}
    {t >= w(181) - 0.1 ? <Versus t={t} w={w} we={we} /> : null}
  </>;
};

const Indexing: React.FC<SP> = ({ t, w, we }) => {
  const cutAt = w(95), embAt = w(101), clAt = w(108), dbAt = w(119);
  const plot = { x: M - 20, y: 760, w: W - 2 * M + 40, h: 320 };
  const k = easeInOut(clamp((t - w(115)) / 0.9));
  const into = clamp((t - w(122)) / 0.6);
  const showPlot = t >= clAt - 0.1;
  return <>
    <Pop t={t} at={w(91)} x={M} y={510} w={200}><Pdf name="leave_policy.pdf" size={0.95} /></Pop>
    {t >= cutAt && t < cutAt + 0.9 ? <div style={{ position: 'absolute', left: 300 + clamp((t - cutAt) / 0.9) * 600, top: 560, fontSize: 64, transform: 'rotate(-90deg)' }}>✂️</div> : null}
    {[0, 1, 2, 3].map((i) => <Pop key={i} t={t} at={cutAt + 0.15 + i * 0.12} x={340} y={500 + i * 62} w={340} h={52} until={showPlot ? clAt + 0.25 : undefined}>
      <div style={{ height: '100%', borderRadius: 10, background: '#1A2320', border: `2px solid ${C.greenDim}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
        <MonoLabel size={15} c={C.green}>chunk {i + 1}</MonoLabel><div style={{ flex: 1, height: 6, borderRadius: 3, background: '#39443F' }} /></div>
    </Pop>)}
    {[0, 1, 2, 3].map((i) => <Pop key={i} t={t} at={embAt + i * 0.14} x={700} y={506 + i * 62} w={290} until={showPlot ? clAt + 0.25 : undefined}>
      <div style={{ fontFamily: MONO, fontSize: 21, color: C.amber, whiteSpace: 'nowrap', marginTop: 8 }}>{typed(['[0.12, -0.8, 0.33 …]', '[0.10, -0.7, 0.41 …]', '[-0.5, 0.92, 0.07 …]', '[0.66, 0.18, -0.3 …]'][i], t, embAt + i * 0.14, embAt + i * 0.14 + 0.6)}</div>
    </Pop>)}
    <Pop t={t} at={w(105)} until={showPlot ? clAt + 0.25 : undefined} x={0} y={770} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.amber} size={26}>🔢 chunk → numbers = <b style={{ color: C.amber }}>embedding</b></Pill></Pop>
    {showPlot ? <Pop t={t} at={clAt} x={plot.x} y={500} w={plot.w} h={360}>
      <Card style={{ position: 'relative' }}>
        <MonoLabel size={16} style={{ position: 'absolute', left: 18, top: 12 }}>EMBEDDING SPACE</MonoLabel>
        {CL.map((d, i) => { const x = d.x0 + (d.x1 - d.x0) * k, y = d.y0 + (d.y1 - d.y0) * k; const flyX = 450 - x, flyY = 520 - y;
          return <div key={i} style={{ position: 'absolute', left: 40 + x + flyX * into, top: 30 + y + flyY * into, width: 26, height: 26, borderRadius: 13, background: d.c, boxShadow: `0 0 14px ${d.c}`, opacity: 1 - into * 0.9, transform: `scale(${1 - into * 0.6})` }} />; })}
        {t >= w(115) ? ([[tx('chhutti'), C.green, 150, 200], ['salary', C.amber, 590, 300], ['laptop', '#6FA8F5', 300, 330]] as const).map(([l, c, x, y]) =>
          <div key={l} style={{ position: 'absolute', left: x, top: y - 60, opacity: clamp((t - w(115) - 0.6) / 0.3) * (1 - into), fontFamily: MONO, fontSize: 18, color: c, letterSpacing: '0.1em' }}>{l}</div>) : null}
      </Card>
    </Pop> : null}
    {/* vector database */}
    <Pop t={t} at={dbAt} x={360} y={930} w={360}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 230, height: 58, marginTop: i ? -18 : 0, borderRadius: '50%', background: i === 0 ? '#14322A' : '#0F241E', border: `3px solid ${C.green}`, boxShadow: glow(C.green, 0.35, 18) }} />)}
        <MonoLabel size={22} c={C.green} style={{ marginTop: 14 }}>VECTOR DATABASE</MonoLabel>
      </div>
    </Pop>
  </>;
};

const Query: React.FC<SP> = ({ t, w, we }) => {
  const qAt = w(126), embAt = w(135), topAt = w(143), retAt = w(150);
  const augAt = w(153), llmAt = w(158), genAt = w(166), srcAt = w(175);
  const phase2 = t >= augAt - 0.1;
  const DB = { x: 120, y: 720 };
  const nearest = [[250, 860], [330, 900], [210, 930]] as const;
  return <>
    <Pop t={t} at={qAt} x={M} y={500} w={W - 2 * M} until={phase2 ? augAt + 0.3 : undefined}><Bubble who="Employee" text={typed(tx('Mujhe kitni chhuttiyan milti hain?'), t, qAt, we(134))} /></Pop>
    <Pop t={t} at={embAt} x={M} y={650} w={W - 2 * M} until={phase2 ? augAt + 0.3 : undefined}>
      <div style={{ fontFamily: MONO, fontSize: 26, color: C.amber, textAlign: 'center' }}>{tx('sawaal → ')}{typed('[0.11, -0.75, 0.38 …]', t, embAt, embAt + 0.7)}</div></Pop>
    {!phase2 ? <>
      <Pop t={t} at={qAt + 0.1} x={DB.x} y={DB.y} w={W - 2 * M - 30} h={420}>
        <Card style={{ position: 'relative' }}>
          <MonoLabel size={16} c={C.green} style={{ position: 'absolute', left: 18, top: 12 }}>VECTOR DATABASE</MonoLabel>
          {[[150, 120, C.green], [230, 160, C.green], [110, 190, C.green], [300, 230, C.green], [600, 120, C.amber], [680, 170, C.amber], [640, 260, C.amber], [480, 300, '#6FA8F5'], [540, 330, '#6FA8F5'], [420, 340, '#6FA8F5']].map(([x, y, c], i) => {
            const top3 = i < 3 && t >= topAt + i * 0.18;
            return <div key={i} style={{ position: 'absolute', left: x as number, top: y as number, width: top3 ? 34 : 24, height: top3 ? 34 : 24, borderRadius: 20, background: c as string, boxShadow: top3 ? `0 0 22px ${C.green}, 0 0 0 6px ${hexA(C.green, 0.25)}` : `0 0 10px ${c}`, opacity: t >= topAt && !top3 ? 0.35 : 1 }} />; })}
          {t >= embAt + 0.4 ? <div style={{ position: 'absolute', left: 205, top: 150, width: 30, height: 30, transform: 'rotate(45deg)', background: '#fff', boxShadow: '0 0 18px #fff', opacity: pop(t, embAt + 0.4).o }} /> : null}
          {t >= embAt + 0.4 ? <MonoLabel size={16} c="#fff" style={{ position: 'absolute', left: 250, top: 100 }}>{tx('sawaal')}</MonoLabel> : null}
          {nearest.map((_, i) => t >= topAt + i * 0.18 ? <svg key={i} width={760} height={420} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <line x1={220} y1={165} x2={[162, 242, 122][i]} y2={[132, 172, 202][i]} stroke={C.green} strokeWidth={3} strokeDasharray="5 6" /></svg> : null)}
        </Card>
      </Pop>
      <Pop t={t} at={topAt + 0.4} until={retAt} x={0} y={1160} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green} size={26}>{tx('🎯 top-3 milte julte chunks')}</Pill></Pop>
      <Hero t={t} at={retAt} until={augAt - 0.15} word="RETRIEVAL" sub={tx('sahi chunks dhoondna')} y={1105} size={128} />
    </> : <>
      {/* augmented: chunks + question go into one prompt, prompt into the LLM */}
      <Pop t={t} at={augAt - 0.1} x={M - 20} y={500} w={560} h={430}>
        <Card active={t < llmAt + 0.6} color={C.amber} style={{ padding: '16px 20px' }}>
          <MonoLabel size={18} c={C.amber}>PROMPT</MonoLabel>
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#141B19', fontFamily: INTER, fontWeight: 600, fontSize: 24, color: C.text }}>{tx('❓ Mujhe kitni chhuttiyan…')}</div>
          {[0, 1, 2].map((i) => t >= augAt + 0.2 + i * 0.25 ? <div key={i} style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#1A2320', border: `2px solid ${C.greenDim}`, opacity: pop(t, augAt + 0.2 + i * 0.25).o,
            fontFamily: MONO, fontSize: 19, color: C.green }}>chunk · {['leave_policy p.2', 'leave_policy p.3', 'holidays_2026 p.1'][i]}</div> : null)}
        </Card>
      </Pop>
      <Wire d={`M ${M + 545} 715 L 760 715`} prog={clamp((t - llmAt) / 0.35)} c={C.green} width={5} dot={t > llmAt && t < genAt ? (t * 1.3) % 1 : undefined} />
      <Pop t={t} at={llmAt - 0.1} x={720} y={540} w={300}><div style={{ transform: 'scale(0.78)', transformOrigin: '0 0' }}><BrainRing t={t} r={120} active={t >= llmAt} /></div>
        <MonoLabel size={24} c={C.green} style={{ textAlign: 'center', width: 262, marginTop: -40 }}>LLM</MonoLabel></Pop>
      <Hero t={t} at={w(163)} until={genAt - 0.2} word="AUGMENTED" sub={tx('sawaal + sahi chunks')} y={980} size={128} />
      <Pop t={t} at={genAt} x={M} y={960} w={W - 2 * M}>
        <Bubble who={tx('HR Bot · RAG ke saath')} c={C.green} tint={hexA(C.green, 0.07)} text={typed(tx('Aapko saal mein 24 chhuttiyan milti hain.'), t, genAt + 0.1, w(175))} />
        {t >= srcAt ? <div style={{ marginTop: 12, display: 'inline-flex', opacity: pop(t, srcAt).o, transform: `scale(${pop(t, srcAt).s})` }}><Pill c={C.green} size={24}>📄 Source: leave_policy.pdf · p.2</Pill></div> : null}
      </Pop>
      {t >= w(178) ? <div style={{ position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 62, color: C.green, textShadow: glow(C.green, 0.5, 26), opacity: pop(t, w(178)).o }}>GENERATION ✓</div> : null}
    </>}
  </>;
};

const Versus: React.FC<SP> = ({ t, w }) => (
  <>
    <Pop t={t} at={w(181)} x={M - 10} y={520} w={(W - 2 * M) / 2 - 10} h={460}>
      <Card active={t < w(188)} color={C.amber}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box' }}>
        <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 46, color: C.amber }}>FINE-TUNING</div>
        <div style={{ fontSize: 110, margin: '18px 0' }}>🎨</div>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 36, color: C.text, textAlign: 'center' }}>style / behaviour</div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 24, color: C.text2, marginTop: 8, textAlign: 'center' }}>{tx('model khud badalta hai')}</div></div></Card>
    </Pop>
    <Pop t={t} at={w(188)} x={W / 2 + 10} y={520} w={(W - 2 * M) / 2 - 10} h={460} breathe={0.01}>
      <Card active color={C.green}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box' }}>
        <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 62, color: C.green, textShadow: glow(C.green, 0.45, 22) }}>RAG</div>
        <div style={{ fontSize: 110, margin: '12px 0' }}>📚</div>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 36, color: C.text, textAlign: 'center' }}>fresh knowledge</div>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 24, color: C.text2, marginTop: 8, textAlign: 'center' }}>{tx('model same, data naya')}</div></div></Card>
    </Pop>
    <Pop t={t} at={w(184)} x={0} y={1040} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.text2} size={26} style={{ color: C.text }}>{tx('⚖️ dono alag kaam ke liye')}</Pill></Pop>
  </>
);

// ------------------------------------------------------------------ 5 call to action
const Cta: React.FC<SP> = ({ t, w, we }) => (
  <>
    <Pop t={t} at={w(195)} x={0} y={430} w={W} dur={0.35}><div style={{ textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 120, color: C.text, letterSpacing: '0.03em' }}>{tx('TUM BATAO 🤔')}</div></Pop>
    {([[tx('CHHOTA chunk'), tx('precise, par context kam'), 199, 0.5], [tx('BADA chunk'), tx('context zyada, par noise bhi'), 202, 1]] as const).map(([lab, sub, i, sz], k) =>
      <Pop key={k} t={t} at={w(i)} x={M - 10 + k * ((W - 2 * M) / 2 + 20)} y={640} w={(W - 2 * M) / 2 - 10} h={300}>
        <Card active color={k ? C.amber : C.green}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>{Array.from({ length: k ? 2 : 5 }).map((_, j) => <div key={j} style={{ width: k ? 90 : 34, height: 70, borderRadius: 8, background: '#1A2320', border: `2px solid ${k ? C.amber : C.green}` }} />)}</div>
          <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 36, color: k ? C.amber : C.green }}>{lab}</div>
          <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 24, color: C.text2, marginTop: 6, textAlign: 'center' }}>{sub}</div></div></Card>
      </Pop>)}
    <Pop t={t} at={w(205) - 0.2} x={M - 20} y={990} w={W - 2 * M + 40} h={110}>
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 60, border: `3px solid ${C.green}`, boxShadow: glow(C.green, 0.35, 22), background: '#0B1311', display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px 0 30px' }}>
        <span style={{ fontSize: 40 }}>💬</span>
        <span style={{ flex: 1, fontFamily: INTER, fontWeight: 600, fontSize: 36, color: C.text }}>{typed(tx('Medium chunk + thoda overlap…'), t, w(205), we(207) + 0.4)}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0 }}>|</span></span>
        <span style={{ background: C.green, color: '#06120D', fontFamily: INTER, fontWeight: 800, fontSize: 30, borderRadius: 30, padding: '10px 26px' }}>Post</span>
      </div>
    </Pop>
    <Pop t={t} at={w(205)} x={0} y={1120} w={W} style={{ display: 'flex', justifyContent: 'center' }}><Pill c={C.green} size={26}>{tx('👇 Comment mein batao')}</Pill></Pop>
  </>
);
