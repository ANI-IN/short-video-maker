// Real-footage scene: licensed photo or clip with Ken Burns, 2.5D parallax (depth-matted foreground layer),
// documentary lower-third headline. Licence credits are NEVER drawn into the frame: they go to final/*.CREDITS.txt and the caption.
import React from 'react';
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Scene } from './types';
import { F } from './fonts';
import { plain, tokens } from './util';

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.5]];
export const FootageScene: React.FC<{ scene: Scene; index: number; total: number; assetDir: string; label?: string }> = ({ scene, index, assetDir, label }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const ft = scene.footage!;
  const p = interpolate(f / fps, [0, Math.max(1, scene.dur + 0.6)], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const [dx, dy] = DIRS[index % DIRS.length];
  const src = staticFile(`${assetDir}/${ft.src}`);
  const aspect = (ft.w || 16) / (ft.h || 9);
  const fullBleed = true;   // always fill the 9:16 frame edge to edge (wide images pan across); no blurred backdrops
  const wide = false;
  const zoomBg = 1.1 + 0.12 * p;
  // The picture is laid out at its true size (covering 1080x1920, overflowing on the long axis) and the camera travels
  // across it. Travel is limited to what the picture really has at the current zoom, so an edge never comes into view.
  // (Before: the 1080x1920 box itself was translated while object-fit:cover cropped the image to it, which exposed black
  // bars on wide images - caught in mahabharat-doc at 38.9 s.)
  const IW = aspect >= 1080 / 1920 ? 1920 * aspect : 1080, IH = aspect >= 1080 / 1920 ? 1920 : 1080 / aspect;
  const layer = (file: string, k: number, extra: React.CSSProperties = {}) => {
    const z = zoomBg + (k - 1) * 0.05 * p;
    const maxX = Math.max(0, (z * IW - 1080) / 2 / z - 4), maxY = Math.max(0, (z * IH - 1920) / 2 / z - 4);
    const wideImg = IW > 1080 * 1.05, tallImg = IH > 1920 * 1.05;
    const dirX = wideImg ? (index % 2 ? -1 : 1) : dx, dirY = tallImg ? (index % 2 ? 1 : -1) : wideImg ? 0 : dy;
    const travel = (p - 0.5) * 2 * (k > 1 ? 1.15 : 1);                    // -1..1 over the scene; the foreground moves a bit more
    const tx = Math.max(-maxX, Math.min(maxX, dirX * travel * Math.min(maxX, wideImg ? 420 : 38)));
    const ty = Math.max(-maxY, Math.min(maxY, dirY * travel * Math.min(maxY, tallImg ? 300 : 38)));
    return <Img src={staticFile(`${assetDir}/${file}`)} style={{ position: 'absolute', left: (1080 - IW) / 2, top: (1920 - IH) / 2, width: IW, height: IH,
      transform: `scale(${z}) translate(${tx}px, ${ty}px)`, ...extra }} />;
  };
  const media = ft.kind === 'video'
    ? <OffthreadVideo src={src} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + 0.06 * p})` }} />
    : <>{layer(ft.src, 1)}{ft.fg ? layer(ft.fg, 1.9) : null}</>;
  if ((ft as any).render) {
    // original 3D render (Blender): full-bleed, no Ken Burns (the camera already moves), a quiet chapter title that clears in 2.4 s
    const op = interpolate(f / fps, [0.15, 0.55, 2.0, 2.5], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
      <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
        <OffthreadVideo src={src} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.35) 100%)' }} />
        {index > 0 ? <div style={{ position: 'absolute', top: 230, left: 0, right: 0, textAlign: 'center', opacity: op, transform: `translateY(${(1 - op) * 10}px)` }}>
          <div style={{ fontFamily: F.sans, fontSize: 30, letterSpacing: 12, color: '#9dffb0', textTransform: 'uppercase', textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}>
            {plain(scene.headline)}</div>
          <div style={{ width: 80, height: 3, background: '#9dffb0', margin: '16px auto 0', opacity: 0.8 }} />
        </div> : null}
      </AbsoluteFill>
    );
  }
  const toks = tokens(scene.headline);
  const intro = index === 0 ? 1 : interpolate(f / fps, [0.1, 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });  // hook: thumbnail-ready on frame 0
  return (
    <AbsoluteFill style={{ background: '#0b0b0d', overflow: 'hidden' }}>
      {wide && ft.kind === 'image' ? (
        <>
          {(ft as any).blur ? <Img src={staticFile(`${assetDir}/${(ft as any).blur}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.05 + 0.05 * p})` }} />
            : <Img src={src} style={{ position: 'absolute', inset: -80, width: 'calc(100% + 160px)', height: 'calc(100% + 160px)', objectFit: 'cover', filter: 'blur(42px) brightness(0.45) saturate(1.2)', transform: `scale(${1.05 + 0.05 * p})` }} />}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 400, height: Math.min(740, 1080 / aspect), overflow: 'hidden', borderRadius: 0, borderTop: '3px solid rgba(255,207,90,0.6)', borderBottom: '3px solid rgba(255,207,90,0.6)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)', transform: `translateY(${(1 - intro) * 40}px)` }}>{media}</div>
        </>
      ) : media}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.0) 26%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.35) 66%, rgba(0,0,0,0.0) 78%)' }} />   {/* light: only behind the headline and the caption line */}
      <div style={{ position: 'absolute', top: 250, left: 70, right: 150, opacity: intro, transform: `translateX(${(1 - intro) * -30}px)` }}>
        {label ? <div style={{ fontFamily: F.sans, fontSize: 34, letterSpacing: 6, color: '#ffcf5a', textTransform: 'uppercase', marginBottom: 14 }}>{label}</div> : null}
        <div style={{ width: 90 * intro, height: 5, background: '#ffcf5a', marginBottom: 18 }} />
        <div style={{ fontFamily: F.serif, fontSize: plain(scene.headline).length > 22 ? 92 : 112, lineHeight: 1.02, color: '#fff', textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          {toks.map((w, i) => <span key={i} style={{ color: w.k ? '#ffcf5a' : '#fff', fontStyle: w.k ? 'italic' : 'normal' }}>{w.t} </span>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
