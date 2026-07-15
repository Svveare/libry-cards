import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Atmosphere, BookFlipPages, ShelfRow } from '../primitives';
import {
  DustMotes,
  flyArc,
  overshootScale,
  softExit,
  SparkBurst,
} from '../motion';
import { colors } from '../theme';
import { fontDisplay } from '../fonts';

const PAGES = [
  [
    { filled: false as const },
    { filled: false as const },
    { filled: false as const },
    { filled: false as const },
  ],
  [
    { filled: true as const, title: 'Перо', accent: colors.brass },
    { filled: true as const, title: 'Эхо', accent: colors.rare },
    { filled: false as const },
    { filled: false as const },
  ],
  [
    { filled: true as const, title: 'Печать', accent: colors.legend },
    { filled: true as const, title: 'Тень', accent: colors.epic },
    { filled: true as const, title: 'Ключ', accent: colors.mythic },
    { filled: true as const, title: 'Огни', accent: colors.brass },
  ],
];

/**
 * Dive → book opens → ~8f flips + ~3f holds → page3 readable.
 * «Листай» only between flips (not mid-turn).
 */
export const ShelfScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const dive = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 360, mass: 0.32 },
    durationInFrames: 8,
  });
  const camZ = interpolate(dive, [0, 1], [-160, 40]);
  const camY = interpolate(dive, [0, 1], [30, -8]);

  const fly = spring({
    frame: frame - 6,
    fps,
    config: { damping: 12, stiffness: 320, mass: 0.36 },
    durationInFrames: 10,
  });
  const pos = flyArc(
    fly,
    { x: -80, y: -280, z: 120 },
    { x: 0, y: 20, z: 0 },
    -160,
  );
  const bookScale = overshootScale(fly, 1.38, 1);
  const bookTilt = interpolate(fly, [0, 0.7, 1], [-18, 8, -2]);

  const open = spring({
    frame: frame - 14,
    fps,
    config: { damping: 12, stiffness: 380, mass: 0.32 },
    durationInFrames: 8,
  });

  // Flip windows relative to scene length (~52f): 8f flip + 3f hold
  const f1Start = 20;
  const f1End = 28;
  const hold1End = 31;
  const f2Start = 31;
  const f2End = 39;
  const hold2End = 42;

  const flip1 = interpolate(frame, [f1Start, f1End], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flip2 = interpolate(frame, [f2Start, f2End], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let pageIndex = 0;
  let flipProgress = 0;
  let flipping = false;
  if (frame < f1Start) {
    pageIndex = 0;
    flipProgress = 0;
  } else if (frame < f1End) {
    pageIndex = 0;
    flipProgress = flip1;
    flipping = true;
  } else if (frame < hold1End) {
    pageIndex = 1;
    flipProgress = 0;
  } else if (frame < f2End) {
    pageIndex = 1;
    flipProgress = flip2;
    flipping = true;
  } else {
    pageIndex = 2;
    flipProgress = 0;
  }

  const intoBook = spring({
    frame: frame - hold2End,
    fps,
    config: { damping: 14, stiffness: 280, mass: 0.4 },
    durationInFrames: 8,
  });
  const pushCam = interpolate(intoBook, [0, 1], [0, 80]);

  // Caption only on holds / pre-flip, not during page turn
  const captionWanted = !flipping && frame >= 18 && frame < hold2End + 4;
  const caption = spring({
    frame: captionWanted ? frame - 18 : -20,
    fps,
    config: { damping: 12, stiffness: 400, mass: 0.3 },
    durationInFrames: 7,
  });
  const captionOp = captionWanted
    ? caption * interpolate(frame, [f1Start - 2, f1Start, f1End, hold1End], [1, 0, 0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const sparkP = interpolate(frame, [14, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;
  const showOpen = open > 0.35;

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={1.05} />
      <DustMotes count={10} color={colors.gold} seed={2} />
      <AbsoluteFill
        style={{
          perspective: 1400,
          perspectiveOrigin: '50% 40%',
          transform: `scale(${(1.15 + dive * 0.08) * exitScale}) translateX(${exit * 35}px)`,
          opacity: 1 - exit * 0.85,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '36%',
            width: 780,
            transform: `translate(-50%, -50%) translateZ(${camZ}px) translateY(${camY}px) scale(${0.92 + dive * 0.22})`,
            transformStyle: 'preserve-3d',
            opacity: interpolate(open, [0.4, 0.9], [1, 0.35], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            zIndex: 1,
          }}
        >
          <ShelfRow books={8} litIndex={3} glowAll={dive * 0.4} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '24%',
            transform: `translateX(-50%) scale(${overshootScale(caption, 1.28, 1)})`,
            opacity: captionOp * (1 - exit),
            fontSize: 30,
            fontWeight: 800,
            color: colors.gold,
            letterSpacing: 3,
            textTransform: 'uppercase',
            textShadow: `0 0 24px ${colors.glow}`,
            zIndex: 6,
          }}
        >
          Листай
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '52%',
            transform: `translate(-50%, -50%) translate3d(${pos.x}px, ${pos.y}px, ${pos.z + pushCam}px) rotateZ(${bookTilt}deg) scale(${bookScale * (1 + intoBook * 0.12)})`,
            transformStyle: 'preserve-3d',
            opacity: interpolate(fly, [0, 0.1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            filter: `drop-shadow(0 28px 36px rgba(0,0,0,0.55))`,
            zIndex: 4,
          }}
        >
          {showOpen ? (
            <BookFlipPages
              title="Книга"
              open={open}
              pageIndex={pageIndex}
              flipProgress={flipProgress}
              pages={PAGES}
              width={560}
              height={380}
            />
          ) : (
            <div
              style={{
                width: 280,
                height: 380,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${colors.woodLite}, ${colors.wood} 40%, #2a180c)`,
                border: `2.5px solid ${colors.brass}`,
                boxShadow: `0 0 ${18 + open * 30}px ${colors.glow}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.parchment,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              Книга
            </div>
          )}
        </div>

        <SparkBurst
          active={open > 0.5}
          progress={sparkP}
          color={colors.gold}
          count={14}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
