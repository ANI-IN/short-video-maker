// 22. Emoji / sticker pop: candy background, die-cut stickers pop with elastic springs, emoji confetti rain.
import React from 'react';
import { AbsoluteFill, spring } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { StickerRow } from '../lib/Edges';
import { useT, rand, tokens, tv, statText } from '../lib/util';

const BGS = ['#ffd6e8', '#fff3b0', '#c9f2ff', '#d9ffcc'];
const sticker = 'drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(8px 12px 6px rgba(0,0,0,0.25))';
const EXTRA = ['✨', '🔥', '💥', '👀', '💡', '🎉', '⭐', '💯'];
const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { f, fps, t } = useT();
  const pop = (d: number) => spring({ frame: f - Math.round(d * fps), fps, config: { damping: 6, stiffness: 180, mass: 0.7 } });
  const main = scene.emoji || '✨';
  const others = [EXTRA[index % 8], EXTRA[(index + 3) % 8], EXTRA[(index + 5) % 8]];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 20%, #ffffff 0%, ${BGS[index % 4]} 55%)`, overflow: 'hidden' }}>
      {Array.from({ length: 26 }).map((_, i) => { const y = ((t * (120 + rand(i) * 160) + rand(i * 3) * 1920) % 2100) - 100; return <div key={i} style={{ position: 'absolute', left: rand(i * 5) * 1000, top: y, fontSize: 56 + rand(i) * 50, opacity: 0.6, transform: `rotate(${t * 90 * (rand(i) - 0.5)}deg)` }}>{EXTRA[i % 8]}</div>; })}
      <div style={{ position: 'absolute', top: 260, left: 50, right: 50, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 22px' }}>
        {tokens(scene.headline).map((w, i) => { const s = pop(i * 0.08); return (
          <span key={i} style={{ display: 'inline-block', fontFamily: F.heavy, fontWeight: 900, fontSize: 112, lineHeight: 1.05, color: w.k ? '#ff3e7f' : '#2b2b2b', WebkitTextStroke: '0px', filter: sticker,
            transform: `scale(${s}) rotate(${(rand(i + index * 9) - 0.5) * 10}deg)` }}>{w.t}</span>); })}
      </div>
      <div style={{ position: 'absolute', top: 600, left: 0, right: 0, textAlign: 'center', fontSize: 470, filter: sticker, transform: `scale(${pop(tv(scene, 0.08))}) rotate(${Math.sin(t * 3) * 6}deg)` }}>{main}</div>
      {others.map((e, i) => { const s = pop(tv(scene, 0.35 + i * 0.15)); const pos = [[110, 560], [830, 820], [150, 1150]][i]; return <div key={i} style={{ position: 'absolute', left: pos[0], top: pos[1], fontSize: 150, filter: sticker, transform: `scale(${s}) rotate(${(i - 1) * 18}deg)` }}>{e}</div>; })}
      {scene.stat ? <div style={{ position: 'absolute', top: 1220, right: 90, background: '#ff3e7f', color: '#fff', fontFamily: F.heavy, fontWeight: 900, fontSize: 80, padding: '14px 34px', borderRadius: 30, filter: sticker, transform: `scale(${pop(tv(scene, 0.5))}) rotate(6deg)` }}>{statText(scene.stat)}</div> : null}
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><StickerRow y={-6} emojis={[sc.emoji || '✨', '✨', '💥', '👀']} size={96} /><StickerRow y={1680} emojis={['🔥', sc.emoji || '⭐', '💯', '🎉']} size={130} dir={-1} /></AbsoluteFill>);
};
export const emojiPop: StyleDef = { Scene: Framed, captions: { font: F.heavy, size: 66, color: '#2b2b2b', key: '#ff3e7f', bg: '#ffffff', radius: 30, y: 1560 } };
