import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import type { VideoProps } from './lib/types';
import sample from './sample-props.json';
import { McpReel } from './mcpreel/McpReel';
import { RagReel } from './mcpreel/RagReel';
import { UpiReel } from './mcpreel/UpiReel';

import mcpEnProps from './mcpreel/mcp-en-props.json';

import ragEnProps from './mcpreel/rag-en-props.json';

import upiEnProps from './mcpreel/upi-en-props.json';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Main"
      component={Main as any}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={sample as unknown as VideoProps}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.max(30, Math.ceil(((props as VideoProps).duration + 0.4) * 30)) })}
    />
    <Composition
      id="McpReelEn"
      component={McpReel as any}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={mcpEnProps as any}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(((props as any).duration) * 30) })}
    />
    <Composition
      id="RagReelEn"
      component={RagReel as any}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={ragEnProps as any}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(((props as any).duration) * 30) })}
    />
    <Composition
      id="UpiReelEn"
      component={UpiReel as any}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={upiEnProps as any}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(((props as any).duration) * 30) })}
    />
  </>
);
