import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { icons } from 'lucide-react';
import type { Scene, Word } from './types';

export const W = 1080, H = 1920;
export const rand = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const useT = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return { f, t: f / fps, fps }; };
export const useSpring = (delay = 0, cfg: any = { damping: 12, stiffness: 140 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - Math.round(delay * fps), fps, config: cfg });
};
export const ramp = (t: number, a: number, d = 0.5, ease = Easing.out(Easing.cubic)) =>
  interpolate(t, [a, a + d], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

// Fraction of narration -> scene seconds (language independent).
export const tv = (sc: Scene, f: number) => {
  const a = sc.words[0]?.s ?? 0, b = sc.words[sc.words.length - 1]?.e ?? sc.dur;
  return a + f * (b - a);
};
export const wordIndexAt = (words: Word[], t: number) => { let k = -1; words.forEach((w, i) => { if (t >= w.s) k = i; }); return k; };

// "Coffee hits in *10 minutes*" -> [{t:'Coffee',k:false}, ..., {t:'10',k:true},{t:'minutes',k:true}]
export const tokens = (s: string) => {
  const out: { t: string; k: boolean }[] = []; let key = false;
  (s || '').split(/(\*)/).forEach((part) => { if (part === '*') { key = !key; return; } part.split(/\s+/).filter(Boolean).forEach((t) => out.push({ t, k: key })); });
  // punctuation that followed a *keyword* ("*Gita*, retold") belongs to the previous word: no space before it
  return out.reduce((acc, x) => { if (acc.length && /^[,.;:!?।)]+$/.test(x.t)) { acc[acc.length - 1] = { ...acc[acc.length - 1], t: acc[acc.length - 1].t + x.t }; } else acc.push(x); return acc; }, [] as { t: string; k: boolean }[]);
};
export const plain = (s: string) => (s || '').replace(/\*/g, '');

export const Icon: React.FC<{ name?: string; size: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({ name, size, color = 'currentColor', stroke = 2, style }) => {
  const pascal = (name || 'sparkles').split('-').map((p) => p[0]?.toUpperCase() + p.slice(1)).join('');
  const C = (icons as any)[pascal] || (icons as any)[pascal.replace(/(\d)/, '$1')] || icons.Sparkles;
  return <C size={size} color={color} strokeWidth={stroke} style={style} />;
};

// Headline with *keywords* styled differently.
export const Headline: React.FC<{ text: string; style?: React.CSSProperties; keyStyle?: React.CSSProperties; wordStyle?: (i: number, k: boolean) => React.CSSProperties }> = ({ text, style, keyStyle, wordStyle }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.28em', textAlign: 'center', ...style }}>
    {tokens(text).map((w, i) => <span key={i} style={{ display: 'inline-block', ...(w.k ? keyStyle : {}), ...(wordStyle ? wordStyle(i, w.k) : {}) }}>{w.t}</span>)}
  </div>
);
export const statText = (st?: { value: number; prefix?: string; suffix?: string; decimals?: number }, p = 1) =>
  st ? `${st.prefix || ''}${(st.value * p).toFixed(st.decimals || 0)}${st.suffix || ''}` : '';
