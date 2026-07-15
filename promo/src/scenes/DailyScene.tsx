import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Atmosphere, CardFace } from '../primitives';
import { GlowBloom, overshootScale, softExit, SparkBurst } from '../motion';
import { colors } from '../theme';
import { fontDisplay } from '../fonts';

const STRIP = [
  { title: 'Обычная', accent: colors.brass },
  { title: 'Редкая', accent: colors.rare },
  { title: 'Эпик', accent: colors.epic },
  { title: 'Легенда', accent: colors.legend },
  { title: 'Мифик', accent: colors.mythic },
  { title: 'Редкая', accent: colors.rare },
  { title: 'Эпик', accent: colors.epic },
  { title: 'Обычная', accent: colors.brass },
];

const CARD_W = 180;
const CARD_H = 260;
const GAP = 14;
const STEP = CARD_W + GAP;

/** Fast strip → early stamp + hold «Ежедневно». */
export const DailyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 400, mass: 0.3 },
    durationInFrames: 7,
  });

  const stampAt = 14;
  const spin = interpolate(frame, [2, stampAt], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2.8),
  });
  const offset = -spin * STRIP.length * STEP;

  const cells = Array.from({ length: STRIP.length * 2 }, (_, i) => ({
    ...STRIP[i % STRIP.length],
    key: i,
  }));

  const stamp = spring({
    frame: frame - stampAt,
    fps,
    config: { damping: 11, stiffness: 440, mass: 0.28 },
    durationInFrames: 8,
  });
  const stampScale = overshootScale(stamp, 1.48, 1);

  const sparkP = interpolate(frame, [stampAt, stampAt + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomP = interpolate(frame, [stampAt, stampAt + 11], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;
  const stamped = frame >= stampAt;

  // Hold «Ежедневно» visible before and after stamp (dims slightly on stamp)
  const dailyLabelOp = interpolate(
    frame,
    [0, 4, stampAt, stampAt + 4, dur - 4],
    [0, 1, 1, 0.7, 0.7],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={1.02} />
      <AbsoluteFill
        style={{
          opacity: enter * (1 - exit * 0.85),
          transform: `scale(${(1.08 + enter * 0.1) * exitScale}) translateY(${exit * -28}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 30,
            fontWeight: 800,
            color: colors.ivory,
            letterSpacing: 4,
            textTransform: 'uppercase',
            textShadow: `0 0 20px ${colors.glow}`,
            zIndex: 6,
            opacity: dailyLabelOp,
          }}
        >
          Ежедневно
        </div>

        <div
          style={{
            position: 'absolute',
            top: '34%',
            left: 0,
            right: 0,
            height: 300,
            overflow: 'hidden',
            opacity: stamped
              ? interpolate(stamp, [0, 1], [1, 0.3])
              : 1,
            transform: `scale(${stamped ? 0.9 : 1})`,
            zIndex: 3,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 4,
              pointerEvents: 'none',
              background: `linear-gradient(90deg, ${colors.oil} 0%, transparent 12%, transparent 88%, ${colors.oil} 100%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 16,
              display: 'flex',
              gap: GAP,
              transform: `translateX(${offset - CARD_W / 2}px)`,
              willChange: 'transform',
            }}
          >
            {cells.map((c) => (
              <div
                key={c.key}
                style={{
                  flexShrink: 0,
                  width: CARD_W,
                  filter: stamped ? 'brightness(0.45)' : 'brightness(1.05)',
                }}
              >
                <CardFace
                  title={c.title}
                  accent={c.accent}
                  glow={0.35}
                  width={CARD_W}
                  height={CARD_H}
                />
              </div>
            ))}
          </div>
        </div>

        {stamped && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '52%',
              transform: `translate(-50%, -50%) scale(${stampScale})`,
              opacity: stamp,
              zIndex: 20,
              textAlign: 'center',
            }}
          >
            <GlowBloom active progress={bloomP} color={colors.gold} size={440} />
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: colors.gold,
                letterSpacing: 2,
                textTransform: 'uppercase',
                textShadow: `0 0 36px ${colors.glow}, 0 8px 24px rgba(0,0,0,0.7)`,
                whiteSpace: 'nowrap',
              }}
            >
              +1 кейс
            </div>
          </div>
        )}

        <SparkBurst
          active={stamped}
          progress={sparkP}
          color={colors.gold}
          count={16}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
