import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Atmosphere, CardBack, CardFace } from '../primitives';
import { GlowBloom, overshootScale, softExit, SparkBurst } from '../motion';
import { colors } from '../theme';
import { fontDisplay } from '../fonts';

const TILES = [
  { title: 'Перо', accent: colors.brass },
  { title: 'Печать', accent: colors.legend },
  { title: 'Эхо', accent: colors.rare },
  { title: 'Тень', accent: colors.epic },
];
const WIN = 1;
const CARD_W = 230;
const CARD_H = 310;

/**
 * Face-down → pick WIN → 6–8f celebrate → then dim losers.
 */
export const ChestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 380, mass: 0.35 },
    durationInFrames: 8,
  });

  const pickFrame = 12;
  const celebrate = 7;
  const revealLosers = pickFrame + celebrate;

  const pick = spring({
    frame: frame - pickFrame,
    fps,
    config: { damping: 11, stiffness: 420, mass: 0.3 },
    durationInFrames: 8,
  });

  const sparkP = interpolate(frame, [pickFrame, pickFrame + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomP = interpolate(frame, [pickFrame, pickFrame + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={1.05} />
      <AbsoluteFill
        style={{
          opacity: enter * (1 - exit * 0.85),
          transform: `scale(${(1.12 + enter * 0.08) * exitScale}) translateY(${exit * 30}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '20%',
            transform: 'translate(-50%, -50%)',
            fontSize: 32,
            fontWeight: 800,
            color: colors.ivory,
            letterSpacing: 4,
            textTransform: 'uppercase',
            textShadow: `0 0 20px ${colors.glow}`,
            zIndex: 5,
          }}
        >
          Сундук+
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            perspective: 1200,
            zIndex: 3,
          }}
        >
          {TILES.map((t, i) => {
            const isWin = i === WIN;
            const deal = spring({
              frame: frame - i * 2,
              fps,
              config: { damping: 14, stiffness: 360, mass: 0.35 },
              durationInFrames: 7,
            });

            const winFlip = isWin
              ? spring({
                  frame: frame - pickFrame,
                  fps,
                  config: { damping: 12, stiffness: 400, mass: 0.32 },
                  durationInFrames: 8,
                })
              : 0;

            const loseFlip = !isWin
              ? spring({
                  frame: frame - (revealLosers + i),
                  fps,
                  config: { damping: 12, stiffness: 380, mass: 0.32 },
                  durationInFrames: 8,
                })
              : 0;

            const faceUp = isWin ? winFlip : loseFlip;
            const rotY = interpolate(faceUp, [0, 1], [0, 180]);

            const picked = isWin && frame >= pickFrame;
            const scale = picked ? overshootScale(pick, 1.42, 1.2) : 1;
            const dimLosers = frame >= revealLosers + 4 && !isWin;

            return (
              <div
                key={t.title}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  position: 'relative',
                  transform: `scale(${deal * scale})`,
                  opacity: interpolate(deal, [0, 0.2], [0, dimLosers ? 0.55 : 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                  filter: picked
                    ? `drop-shadow(0 0 ${24 + pick * 44}px ${colors.legend})`
                    : undefined,
                  zIndex: picked ? 5 : 1,
                  transformStyle: 'preserve-3d',
                }}
              >
                {picked && (
                  <GlowBloom
                    active
                    progress={bloomP}
                    color={colors.legend}
                    size={360}
                  />
                )}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    transform: `rotateY(${rotY}deg)`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <CardBack width={CARD_W} height={CARD_H} glow={0.45} />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <CardFace
                      title={t.title}
                      accent={t.accent}
                      glow={picked ? 1 : 0.45}
                      width={CARD_W}
                      height={CARD_H}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <SparkBurst
          active={frame >= pickFrame}
          progress={sparkP}
          color={colors.gold}
          count={18}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
