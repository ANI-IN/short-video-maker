import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { CaptionTheme, VideoProps } from './types';
import { F } from './fonts';

// Bold word captions, 2-4 words at a time, current word highlighted. Sits above the Shorts/Reels UI.
export const Captions: React.FC<{ props: VideoProps; theme: CaptionTheme }> = ({ props, theme }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const T = f / fps;
  const sc = props.scenes.find((s) => T >= s.start && T < s.start + s.dur);
  if (!sc) return null;
  const t = T - sc.start;
  const chunks: { w: string; s: number; e: number }[][] = [];
  let cur: any[] = [];
  sc.words.forEach((w, i) => { cur.push(w); const end = /[.,!?।]$/.test(w.w) || cur.length >= 3; if (end || i === sc.words.length - 1) { chunks.push(cur); cur = []; } });
  const ch = chunks.find((c) => t >= c[0].s - 0.05 && t < (c[c.length - 1].e + 0.25)) ;
  if (!ch) return null;
  const size = theme.size ?? 72;
  return (
    <div style={{ position: 'absolute', left: 60, right: 140, top: (theme.y ?? 1250) - size, display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.3em', padding: theme.bg ? '10px 26px' : 0, background: theme.bg, borderRadius: theme.radius ?? 18,
        fontFamily: theme.font ?? F.heavy, fontWeight: theme.weight ?? 800, fontSize: size, lineHeight: 1.15, textAlign: 'center' }}>
        {ch.map((w, i) => {
          const on = t >= w.s;
          const txt = w.w.replace(/[.,!?।]+$/, '');
          return <span key={i} style={{ color: on && t < w.e + 0.1 ? (theme.key ?? '#ffd43b') : (theme.color ?? '#fff'), opacity: on ? 1 : 0.55,
            textTransform: theme.upper ? 'uppercase' : 'none', WebkitTextStroke: theme.stroke ? `${Math.round(size / 9)}px ${theme.stroke}` : undefined, paintOrder: 'stroke fill',
            transform: `scale(${on && t < w.s + 0.12 ? 1.08 : 1})`, display: 'inline-block' }}>{txt}</span>;
        })}
      </div>
    </div>
  );
};
