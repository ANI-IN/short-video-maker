// Word-level karaoke captions from Whisper timing: 2-4 words per card, current word bold + highlighted pill,
// spoken words solid, upcoming words dimmed. Kept inside the Shorts/Reels safe zone (x 65-950, y ~1100-1240).
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { CaptionTheme, VideoProps } from './types';
import { F } from './fonts';

// words the narrator actually leans on (emph, measured from the voice) get a stronger pop with a small overshoot;
// every other active word keeps the gentle 1.06 lift, so emphasis reads as emphasis
const popScale = (w: { s: number; e: number; emph?: number }, t: number, active: boolean, big: number) => {
  if (!active) return 1;
  if (!w.emph) return 1.06;
  const p = Math.min(1, Math.max(0, (t - w.s + 0.03) / 0.16)); const c = 1.70158;
  const back = 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);   // easeOutBack 0 -> 1 with overshoot
  return 1 + (big - 1) * back;
};

export const KaraokeCaptions: React.FC<{ props: VideoProps; theme?: CaptionTheme; themeFor?: (sc: any) => CaptionTheme | undefined }> = ({ props, theme: theme00 = {}, themeFor }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const T = f / fps;
  const sc = props.scenes.find((s) => T >= s.start && T < s.start + s.dur);
  if (!sc || !sc.words.length) return null;
  const own = themeFor ? themeFor(sc) : undefined;
  const theme0: CaptionTheme = own ? { ...theme00, ...Object.fromEntries(Object.entries(own).filter(([, v]) => v !== undefined)) } : theme00;
  // a staged reenactment puts its actors where the caption line normally sits: drop the captions to the floor zone
  const theme = (sc as any).visual === 'reenact' || (sc as any).stage ? { ...theme0, y: Math.max(theme0.y ?? 1166, 1500) } : theme0;
  const t = T - sc.start;
  const chunks: { w: string; s: number; e: number; emph?: number }[][] = []; let cur: any[] = [];
  sc.words.forEach((w, i) => {
    cur.push(w);
    const chars = cur.reduce((a, x) => a + x.w.length, 0);
    const brk = /[.,!?।;:—]$/.test(w.w) || cur.length >= 4 || chars > 22 || (sc.words[i + 1] && sc.words[i + 1].s - w.e > 0.35);
    if (brk || i === sc.words.length - 1) { chunks.push(cur); cur = []; }
  });
  const ci = chunks.findIndex((c, k) => t >= c[0].s - 0.08 && t < (chunks[k + 1] ? chunks[k + 1][0].s - 0.08 : c[c.length - 1].e + 0.5));
  if (ci < 0) return null;
  const ch = chunks[ci];
  const deva = /[ऀ-ॿ]/.test(ch.map((x) => x.w).join(''));
  const size = theme.size ?? (deva ? 70 : 74);
  const key = theme.key ?? '#ffd43b';
  const pop = Math.min(1, (t - ch[0].s + 0.08) / 0.12);
  // Reels safe zone: the card's bottom must stay above y 1600 (app UI below). Estimate the card height from the text
  // (one or two lines) and lift the card if a style's caption line (e.g. 1560) plus a wrap would run into the UI.
  const fitTop = (top: number, sz: number) => {
    const chars = ch.reduce((a, x) => a + x.w.length + 1, 0);
    const lines = chars * sz * 0.56 > 820 ? 2 : 1;
    return Math.min(top, 1590 - (lines * sz * 1.12 + 26));
  };
  if (theme.variant === 'cine') {
    // cinematic documentary captions: clean white bold with a soft shadow, no box (the picture stays the star);
    // the spoken word turns warm amber, emphasised words pop
    const cs = deva ? 60 : 62;
    return (
      <div style={{ position: 'absolute', left: 65, width: 885, top: fitTop((theme.y ?? 1560) - cs * 0.9, cs), display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        {/* legibility over any picture (a white shirt in a close-up washed the words out): a 3 px dark outline built from
            8 offset shadows, plus a soft scrim behind the line that fades to nothing at its edges (no hard box) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px 14px', opacity: pop, fontFamily: deva ? `'Noto Sans Devanagari', sans-serif` : (theme.font ?? F.heavy),
          padding: '10px 34px 14px', background: 'radial-gradient(ellipse at 50% 55%, rgba(8,6,12,0.55) 0%, rgba(8,6,12,0.32) 45%, rgba(8,6,12,0) 72%)',
          fontWeight: 800, fontSize: cs, lineHeight: 1.12,
          textShadow: '3px 0 0 #0b0a0f, -3px 0 0 #0b0a0f, 0 3px 0 #0b0a0f, 0 -3px 0 #0b0a0f, 2px 2px 0 #0b0a0f, -2px 2px 0 #0b0a0f, 2px -2px 0 #0b0a0f, -2px -2px 0 #0b0a0f, 0 5px 2px rgba(0,0,0,0.8), 0 0 22px rgba(0,0,0,0.85)' }}>
          {ch.map((w, i) => {
            const active = t >= w.s - 0.03 && t < w.e + 0.06; const said = t >= w.s - 0.03;
            return <span key={i} style={{ display: 'inline-block', color: active ? (theme.key ?? '#ffcf5a') : '#ffffff', opacity: said ? 1 : 0.78,
              transform: `scale(${popScale(w as any, t, active, 1.1)})`, transformOrigin: '50% 70%' }}>{w.w.replace(/[.,!?।;:]+$/, '')}</span>;
          })}
        </div>
      </div>
    );
  }
  if (theme.variant === 'doc') {
    // documentary: engraved serif on a parchment slip; the spoken word inks in red with a hand-ruled underline
    const ds = deva ? 62 : 66;
    return (
      <div style={{ position: 'absolute', left: 65, width: 885, top: fitTop((theme.y ?? 1166) - ds * 0.9, ds), display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 16px', padding: '10px 30px 14px', borderRadius: 6, opacity: pop,
          background: 'linear-gradient(180deg, #f3e7cc 0%, #e6d4ad 100%)', border: '2px solid #6b5a44', boxShadow: '0 6px 18px rgba(0,0,0,0.35), inset 0 0 18px rgba(120,80,30,0.25)',
          fontFamily: deva ? `'Noto Sans Devanagari', serif` : F.serif, fontWeight: deva ? 700 : 400, fontSize: ds, lineHeight: 1.12 }}>
          {ch.map((w, i) => {
            const active = t >= w.s - 0.03 && t < w.e + 0.06; const said = t >= w.s - 0.03;
            return <span key={i} style={{ display: 'inline-block', color: active ? (theme.key ?? '#8b1e1e') : '#2b2118', opacity: said ? 1 : 0.55,
              transform: `scale(${popScale(w as any, t, active, 1.16)})`, transformOrigin: '50% 70%',
              borderBottom: active ? `3px solid ${theme.key ?? '#8b1e1e'}` : '3px solid transparent', fontStyle: active && !deva ? 'italic' : 'normal' }}>{w.w.replace(/[.,!?।;:]+$/, '')}</span>;
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', left: 65, width: 885, top: fitTop((theme.y ?? 1166) - size * 0.9, size), display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px', maxWidth: 885, transform: `scale(${0.94 + 0.06 * pop})`, opacity: pop,
        background: theme.bg ?? 'rgba(12,12,18,0.55)', borderRadius: 22, padding: '10px 18px',
        fontFamily: deva ? `'Noto Sans Devanagari', sans-serif` : (theme.font ?? F.heavy), fontWeight: 800, fontSize: size, lineHeight: 1.12 }}>
        {ch.map((w, i) => {
          const active = t >= w.s - 0.03 && t < w.e + 0.06;
          const said = t >= w.s - 0.03;
          const txt = w.w.replace(/[.,!?।;:]+$/, '');
          return (
            <span key={i} style={{ display: 'inline-block', padding: '2px 14px', borderRadius: 16, background: active ? key : 'transparent',
              color: active ? (theme.bg ? '#111' : '#111') : '#fff', opacity: said ? 1 : 0.72, transform: `scale(${popScale(w as any, t, active, 1.24)})`,
              textTransform: theme.upper ? 'uppercase' : 'none',
              textShadow: active ? 'none' : '0 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.7)',
              WebkitTextStroke: active ? undefined : `2px rgba(0,0,0,0.85)`, paintOrder: 'stroke fill' }}>{txt}</span>
          );
        })}
      </div>
    </div>
  );
};
