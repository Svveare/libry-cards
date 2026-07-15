import React from 'react';
import { Composition } from 'remotion';
import { LibryPromo, LibryPromo169 } from './LibryPromo';
import { DURATION_FRAMES, FPS } from './theme';
import './fonts';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LibryPromo916"
        component={LibryPromo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="LibryPromo169"
        component={LibryPromo169}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
