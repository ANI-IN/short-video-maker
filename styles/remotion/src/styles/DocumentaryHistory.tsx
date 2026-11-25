// documentary-history (Remotion part): one continuous aged-archive feel over every source the engine cuts between
// (explainroo parchment maps/timelines underneath, licensed footage, character reenactment inserts).
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { AbsoluteFill } from 'remotion';
import type { SceneProps, StyleDef } from '../lib/types';
import { F } from '../lib/fonts';
import { characterStory } from './CharacterStory';

// "Historical" is signalled by colour grade + serif parchment captions only (no grain, scratches, vignette or blur):
// Main applies DOC_GRADE to every scene of this style so archive photos, maps, timelines and reenactments share one palette.
export const DOC_GRADE = 'saturate(0.86) sepia(0.10) contrast(1.04)';

// Reenactment insert: the character-story stage, warmed to the archive palette, with a DRAMATIZATION tag (as real documentaries do).
// the tag shows for the first 2.2 s of a reenactment, then fades: it was sitting on in-world signs and labels
const Reenact: React.FC<SceneProps> = (p) => {
  const t = useCurrentFrame() / 30;
  // only on the FIRST reenactment: documentaries label it once, and on lit sets the tag sat over wall signs and screens
  const first = (p as any).index === 0 || (p as any).scene?.dramatizationTag;
  const o = first ? interpolate(t, [0, 0.2, 2.0, 2.4], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <AbsoluteFill>
      <characterStory.Scene {...p} />
      {o > 0 ? <div style={{ position: 'absolute', top: 175, right: 150, opacity: o, fontFamily: F.sans, fontSize: 26, letterSpacing: 6, color: 'rgba(255,244,220,0.85)',
        background: 'rgba(40,24,8,0.55)', padding: '6px 14px', borderRadius: 6 }}>DRAMATIZATION</div> : null}
    </AbsoluteFill>
  );
};

const Empty: React.FC<SceneProps> = () => null;   // maps/timelines/cards come from the explainroo base video
export const documentaryHistory: StyleDef & { Reenact: React.FC<SceneProps> } = {
  Scene: Empty, Reenact, transition: 'fade',
  captions: { variant: 'cine', key: '#ffcf5a', y: 1560 } as any,   // cinematic white captions (reference analysis A8); 'doc' parchment slip kept as an option   // low: the middle of the frame belongs to maps, cards and timelines
};
