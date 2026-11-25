// 23. Old-film: sepia silent-film intertitle cards and sepia-graded shots. (Grain/scratch/blur overlay removed by request:
// the period feel comes from colour grade + typography only, everything stays sharp.)
import React from 'react';
import { AbsoluteFill, spring } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { DecoBand } from '../lib/Edges';
import { useT, rand, plain, Icon, tv, statText } from '../lib/util';

const Scene: React.FC<SceneProps> = ({ scene, index }) => {
  const { f, fps, t } = useT();
  const s = spring({ frame: f - Math.round(tv(scene, 0.2) * fps), fps, config: { damping: 20 } });
  const card = t < tv(scene, 0.45); // intertitle first, then the "shot"
  return (
    <AbsoluteFill style={{ background: '#1d1710' }}>
      {card ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 900, minHeight: 1240, border: '6px double #e9dcc0', outline: '3px solid #e9dcc0', outlineOffset: 18, padding: '90px 60px', marginTop: -60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 50 }}>
            <div style={{ color: '#e9dcc0', fontSize: 60, letterSpacing: 20 }}>❦ ✦ ❦</div>
            <div style={{ fontFamily: F.serif, fontSize: plain(scene.headline).length > 22 ? 108 : 130, lineHeight: 1.1, color: '#f3e8cf', textAlign: 'center', fontStyle: 'italic' }}>{plain(scene.headline)}</div>
            <div style={{ color: '#e9dcc0', fontSize: 60, letterSpacing: 20 }}>❦ ✦ ❦</div>
          </div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #8a7352 0%, #3b2f20 70%)' }}>
          <div style={{ position: 'absolute', left: 60, right: 60, top: 230, bottom: 260, border: '4px solid #e9dcc0', outline: '2px solid #e9dcc0', outlineOffset: 14 }} />
          {[[60, 230], [1020, 230], [60, 1660], [1020, 1660]].map(([x, y], k) => <div key={k} style={{ position: 'absolute', left: x - 26, top: y - 26, width: 52, height: 52, border: '3px solid #e9dcc0', transform: 'rotate(45deg)', background: '#3b2f20' }} />)}
          {/* one column inside the frame: picture, then the stat, then a small ornamented title. Nothing overlaps, and the
              frame's lower half carries content instead of empty sepia. Captions sit below at y 1520. */}
          <div style={{ position: 'absolute', left: 90, right: 90, top: 290, height: 1150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
            <div style={{ transform: `scale(${0.8 + 0.2 * s})`, filter: 'grayscale(1) sepia(0.8) contrast(1.2)', lineHeight: 1 }}>
              {scene.emoji ? <div style={{ fontSize: 520 }}>{scene.emoji}</div> : <Icon name={scene.icon} size={440} color="#f3e8cf" stroke={1.5} />}
            </div>
            {scene.stat ? <div style={{ fontFamily: F.serif, fontSize: 92, lineHeight: 1.1, color: '#f3e8cf', fontStyle: 'italic', textAlign: 'center', maxWidth: 860, opacity: s }}>{statText(scene.stat)} {scene.stat.label}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: s }}>
              <div style={{ color: '#e9dcc0', fontSize: 44, letterSpacing: 16 }}>❦ ✦ ❦</div>
              <div style={{ fontFamily: F.serif, fontSize: 66, lineHeight: 1.1, color: '#e9dcc0', fontStyle: 'italic', textAlign: 'center', maxWidth: 820 }}>{plain(scene.headline)}</div>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
// edge-to-edge composition (top + bottom bands): see lib/Edges.tsx
const Framed: React.FC<SceneProps> = (p) => {
  const sc = p.scene; const words = sc.words.map((w) => w.w.replace(/[.,!?।]/g, '')); const head = (sc.headline || '').replace(/\*/g, '').split(' ');
  return (<AbsoluteFill><Scene {...p} /><DecoBand y={20} color="#e9dcc0" /><DecoBand y={1690} color="#e9dcc0" flip /></AbsoluteFill>);
};
export const oldFilm: StyleDef = { Scene: Framed, captions: { font: F.serif, weight: 400, size: 74, color: '#f3e8cf', key: '#ffd88a', stroke: '#1d1710', y: 1520 } };
