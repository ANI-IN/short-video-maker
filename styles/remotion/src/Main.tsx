import React from 'react';
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { Scene, StyleDef, VideoProps } from './lib/types';
import { useFonts, F } from './lib/fonts';
import { KaraokeCaptions } from './lib/Karaoke';
import { FootageScene } from './lib/Footage';
import { Icon, Headline } from './lib/util';
import { STYLES } from './styles';
import { DOC_GRADE } from './styles/DocumentaryHistory';

const XF = 0.32; // cross-dissolve length (s) between scenes

// Cross-dissolve in (with a gentle zoom-through) for every scene after the first.
const Dissolve: React.FC<{ on: boolean; children: React.ReactNode; zoom?: boolean }> = ({ on, children, zoom }) => {
  const f = useCurrentFrame(); const n = Math.round(XF * 30);
  const p = on ? interpolate(f, [0, n], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) }) : 1;
  return <AbsoluteFill style={{ opacity: p, transform: zoom ? `scale(${1.035 - 0.035 * p})` : undefined }}>{children}</AbsoluteFill>;
};

// Documentary look for a scene whose footage was rejected as not relevant enough: never a random stock picture.
const DocFallback: React.FC<{ scene: Scene }> = ({ scene }) => (
  <AbsoluteFill style={{ background: 'linear-gradient(180deg, #3a2f24 0%, #1c1712 55%, #2c241b 100%)', alignItems: 'center' }}>
    <div style={{ position: 'absolute', inset: 0, opacity: 0.12, display: 'flex', flexWrap: 'wrap', alignContent: 'space-around', justifyContent: 'space-around' }}>
      {Array.from({ length: 24 }).map((_, i) => <Icon key={i} name={scene.icon} size={130} color="#ffcf5a" stroke={1.2} />)}</div>
    {scene.emoji ? <div style={{ position: 'absolute', top: 1260, fontSize: 300 }}>{scene.emoji}</div> : null}
    <Headline text={scene.headline} style={{ position: 'absolute', top: 260, left: 70, right: 150, fontFamily: F.serif, fontSize: 96, color: '#fff', lineHeight: 1.04 }} keyStyle={{ color: '#ffcf5a', fontStyle: 'italic' }} />
    <div style={{ position: 'absolute', top: 620 }}><Icon name={scene.icon} size={440} color="#ffcf5a" stroke={1.3} /></div>
  </AbsoluteFill>
);

export const Main: React.FC<VideoProps> = (props) => {
  useFonts();
  const doc = props.style === 'real-footage';
  // explainroo-engine styles have no Remotion def: they need the karaoke layer (kinetic-typography's def skips it, which
  // left terminal/whiteboard/chalkboard/split-screen... videos without captions)
  const def: StyleDef = STYLES[props.style] || (props.baseVideo ? ({ Scene: () => null, captions: { variant: 'bold', y: 1300 } } as any) : STYLES['kinetic-typography']);
  const fps = 30;
  const asset = props.assetDir || '';
  const theme = { ...(def.captions || {}), ...(props.captionStyle || {}) } as any;
  return (
    <AbsoluteFill style={{ background: '#000', filter: props.style === 'documentary-history' && !props.cinema ? DOC_GRADE : undefined }} lang={props.lang}>
      {props.baseVideo ? <OffthreadVideo src={staticFile(props.baseVideo)} muted style={{ width: '100%', height: '100%' }} /> : null}
      {!props.baseVideo && !doc && def.Background ? <def.Background props={props} /> : null}
      {props.scenes.map((sc, i) => {
        const hasFoot = !!(sc.footage && sc.footage.src);
        const reenact = (sc as any).visual === 'reenact' && !!(sc as any).stage && !hasFoot;
        // mixed-per-scene mode: a scene may name its own Remotion style ("style": "flat-icons"); the video's style keeps the
        // captions / transitions, so the mix still reads as one video
        const own = (sc as any).style && (sc as any).style !== props.style ? STYLES[(sc as any).style] : undefined;
        if (props.baseVideo && !hasFoot && !reenact && !own) return null;        // explainroo already drew this scene (map / timeline / card / style)
        const hard = props.style === 'documentary-history';      // film editing: hard cuts (reference: 673 cuts, no dissolves)
        const lead = i > 0 && !hard ? XF : 0;
        const from = Math.max(0, Math.round((sc.start - lead) * fps));
        const last = i === props.scenes.length - 1;
        const len = Math.round((sc.dur + lead + (last ? 0.5 : 0)) * fps);
        const label = sc.role && sc.role !== 'hook' ? undefined : undefined;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={len} name={sc.id}>
            <Dissolve on={i > 0 && !hard} zoom={hasFoot || doc}>
              {reenact && (def as any).Reenact ? React.createElement((def as any).Reenact, { scene: sc, index: i, total: props.scenes.length })
                : reenact ? React.createElement(STYLES['character-story'].Scene, { scene: sc, index: i, total: props.scenes.length })
                : hasFoot ? <AbsoluteFill><FootageScene scene={sc} index={i} total={props.scenes.length} assetDir={asset} label={(sc as any).kicker || label} /></AbsoluteFill>
                : own ? <AbsoluteFill>{own.Background ? <own.Background props={props} /> : null}<own.Scene scene={sc} index={i} total={props.scenes.length} /></AbsoluteFill>
                : doc ? <DocFallback scene={sc} /> : <def.Scene scene={sc} index={i} total={props.scenes.length} />}
            </Dissolve>
          </Sequence>
        );
      })}
      {def.Overlay && !doc ? <def.Overlay props={props} /> : null}
      {/* kinetic-typography IS word-level captions, so it skips the karaoke layer; every other style gets it */}
      {def.captions === false && !doc ? null : <KaraokeCaptions props={props} theme={doc ? { key: '#ffcf5a' } : { key: theme.key, font: theme.font, upper: theme.upper, variant: theme.variant, y: theme.y, bg: theme.bg }}
        themeFor={(sc: any) => {   // mixed per scene: a scene in its own style uses THAT style's tested caption zone and colours
          const o = sc && sc.style && sc.style !== props.style ? (STYLES[sc.style] as any) : undefined;
          const c = o && o.captions ? o.captions : undefined;
          return c ? { key: c.key, font: c.font, upper: c.upper, variant: c.variant, y: c.y, bg: c.bg } : undefined;
        }} />}
    </AbsoluteFill>
  );
};
