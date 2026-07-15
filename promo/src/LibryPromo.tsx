import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { CUT_OVERLAP, FRAME, FPS, colors } from './theme';
import { fontDisplay } from './fonts';
import { ImpactFlash, impactShake, whipOffset } from './motion';
import { HookScene } from './scenes/HookScene';
import { ShelfScene } from './scenes/ShelfScene';
import { CaseScene } from './scenes/CaseScene';
import { ChestScene } from './scenes/ChestScene';
import { CollectScene } from './scenes/CollectScene';
import { DailyScene } from './scenes/DailyScene';
import { SecretScene } from './scenes/SecretScene';
import { PayoffScene } from './scenes/PayoffScene';
import { OutroScene } from './scenes/OutroScene';

const O = CUT_OVERLAP;

/**
 * Build overlapped sequence windows:
 * next scene starts CUT_OVERLAP frames before previous end.
 */
function seqRange(prevEnd: number, end: number): { from: number; dur: number } {
  const from = Math.max(0, prevEnd - O);
  return { from, dur: end - from };
}

export const LibryPromo: React.FC = () => {
  const frame = useCurrentFrame();

  const hook = { from: 0, dur: FRAME.hookEnd + O };
  const world = seqRange(FRAME.hookEnd, FRAME.worldEnd);
  const caseS = seqRange(FRAME.worldEnd, FRAME.caseEnd);
  const chest = seqRange(FRAME.caseEnd, FRAME.chestEnd);
  const collect = seqRange(FRAME.chestEnd, FRAME.collectEnd);
  const daily = seqRange(FRAME.collectEnd, FRAME.dailyEnd);
  const secret = seqRange(FRAME.dailyEnd, FRAME.secretEnd);
  const payoff = seqRange(FRAME.secretEnd, FRAME.payoffEnd);
  const outro = seqRange(FRAME.payoffEnd, FRAME.outroEnd);

  const whip =
    whipOffset(frame, FRAME.hookEnd, 55) +
    whipOffset(frame, FRAME.worldEnd, -50) +
    whipOffset(frame, FRAME.caseEnd, 55) +
    whipOffset(frame, FRAME.chestEnd, -48) +
    whipOffset(frame, FRAME.collectEnd, 50) +
    whipOffset(frame, FRAME.dailyEnd, -42) +
    whipOffset(frame, FRAME.secretEnd, 40);

  const shake =
    impactShake(frame, FRAME.hookEnd, 4).x +
    impactShake(frame, FRAME.caseEnd, 4.5).x +
    impactShake(frame, FRAME.collectEnd, 4).x;

  const shakeY =
    impactShake(frame, FRAME.worldEnd, 3.5).y +
    impactShake(frame, FRAME.chestEnd, 4).y +
    impactShake(frame, FRAME.secretEnd, 3.5).y;

  const musicVol = interpolate(
    frame,
    [0, 9, FRAME.payoffEnd, FRAME.outroEnd - 1],
    [0, 0.28, 0.28, 0.16],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        background: colors.oil,
        fontFamily: fontDisplay,
        transform: `translate(${whip + shake}px, ${shakeY}px)`,
      }}
    >
      <Sequence from={hook.from} durationInFrames={hook.dur} premountFor={FPS}>
        <HookScene />
      </Sequence>
      <Sequence from={world.from} durationInFrames={world.dur} premountFor={FPS}>
        <ShelfScene />
      </Sequence>
      <Sequence from={caseS.from} durationInFrames={caseS.dur} premountFor={FPS}>
        <CaseScene />
      </Sequence>
      <Sequence from={chest.from} durationInFrames={chest.dur} premountFor={FPS}>
        <ChestScene />
      </Sequence>
      <Sequence
        from={collect.from}
        durationInFrames={collect.dur}
        premountFor={FPS}
      >
        <CollectScene />
      </Sequence>
      <Sequence from={daily.from} durationInFrames={daily.dur} premountFor={FPS}>
        <DailyScene />
      </Sequence>
      <Sequence
        from={secret.from}
        durationInFrames={secret.dur}
        premountFor={FPS}
      >
        <SecretScene />
      </Sequence>
      <Sequence
        from={payoff.from}
        durationInFrames={payoff.dur}
        premountFor={FPS}
      >
        <PayoffScene />
      </Sequence>
      <Sequence from={outro.from} durationInFrames={outro.dur} premountFor={FPS}>
        <OutroScene />
      </Sequence>

      <ImpactFlash frame={frame} at={FRAME.hookEnd} />
      <ImpactFlash frame={frame} at={FRAME.worldEnd} />
      <ImpactFlash frame={frame} at={FRAME.caseEnd} />
      <ImpactFlash frame={frame} at={FRAME.chestEnd} />
      <ImpactFlash frame={frame} at={FRAME.collectEnd} />
      <ImpactFlash frame={frame} at={FRAME.dailyEnd} />
      <ImpactFlash
        frame={frame}
        at={FRAME.secretEnd}
        color="rgba(140, 150, 170, 0.7)"
      />
      <ImpactFlash
        frame={frame}
        at={FRAME.payoffEnd}
        color="rgba(224, 184, 74, 0.7)"
      />

      <Audio src={staticFile('whoosh-bed.wav')} volume={0.26} />
      <Audio src={staticFile('promo-bg.mp3')} volume={musicVol} />
    </AbsoluteFill>
  );
};

/** 16:9 wrapper — height-fit the 9:16 master with oil pillarbox. */
export const LibryPromo169: React.FC = () => {
  const masterW = 1080;
  const masterH = 1920;
  const fitHeight = 1080 / masterH;
  const scale = fitHeight * 1.08;

  return (
    <AbsoluteFill style={{ background: colors.oil, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: masterW,
          height: masterH,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <LibryPromo />
      </div>
    </AbsoluteFill>
  );
};
