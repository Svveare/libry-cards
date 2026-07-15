import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Atmosphere, BookCover, ShelfRow } from '../primitives';
import {
  DustMotes,
  GlowBloom,
  SparkBurst,
  overshootScale,
  softExit,
} from '../motion';
import { colors } from '../theme';
import { fontDisplay } from '../fonts';

/** Zoomed payoff — dust + breathing glow. */
export const PayoffScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 320, mass: 0.35 },
    durationInFrames: 10,
  });
  const glowBase = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, stiffness: 220, mass: 0.42 },
    durationInFrames: 16,
  });
  // Breathing glow after settle
  const breath = 0.5 + 0.5 * Math.sin(frame * ((2 * Math.PI) / 48));
  const glow = glowBase * (0.88 + breath * 0.14);

  const text = spring({
    frame: frame - 14,
    fps,
    config: { damping: 12, stiffness: 340, mass: 0.34 },
    durationInFrames: 10,
  });
  const sparkP = interpolate(frame, [8, 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomP = interpolate(frame, [10, 28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={1.1} />
      <DustMotes count={11} color={colors.gold} seed={5} />
      <AbsoluteFill
        style={{
          opacity: enter * (1 - exit * 0.85),
          transform: `scale(${(1.15 + enter * 0.08) * exitScale}) translateY(${exit * -22}px)`,
          perspective: 1200,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '36%',
            width: 800,
            transform: `translate(-50%, -50%) scale(${1 + glow * 0.06})`,
            zIndex: 1,
          }}
        >
          <ShelfRow books={8} litIndex={3} glowAll={glow} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '46%',
            transform: `translate(-50%, -50%) scale(${overshootScale(enter, 1.32, 1)})`,
            filter: `drop-shadow(0 0 ${24 + glow * 55}px ${colors.gold})`,
            zIndex: 3,
          }}
        >
          <GlowBloom
            active={frame >= 8}
            progress={bloomP * (0.7 + breath * 0.3)}
            color={colors.gold}
            size={500}
          />
          <BookCover
            title="Книга"
            open={0}
            glow={glow}
            width={280}
            height={380}
          />
        </div>

        <SparkBurst active progress={sparkP} color={colors.gold} count={16} />

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '68%',
            transform: `translate(-50%, 0) scale(${overshootScale(text, 1.42, 1)})`,
            opacity: text,
            textAlign: 'center',
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: colors.ivory,
              letterSpacing: 2,
              textShadow: `0 0 36px ${colors.glow}, 0 6px 20px rgba(0,0,0,0.7)`,
              marginBottom: 10,
            }}
          >
            Твоя библиотека
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.gold,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            20/20 · Коллекция
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
