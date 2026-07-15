import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Atmosphere, CardFace, ShelfRow } from '../primitives';
import {
  DustMotes,
  GlowBloom,
  overshootScale,
  softExit,
  SparkBurst,
} from '../motion';
import { colors } from '../theme';
import { fontDisplay } from '../fonts';

const SECRETS = [
  { title: 'Тень+', accent: colors.secret },
  { title: 'Печать+', accent: colors.secret },
  { title: 'Эхо+', accent: colors.secret },
  { title: 'Ключ+', accent: colors.secret },
];

/** Silver secret cards + bloom + denser sparks + short hold. */
export const SecretScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 360, mass: 0.35 },
    durationInFrames: 9,
  });

  const stampAt = 16;
  const stamp = spring({
    frame: frame - stampAt,
    fps,
    config: { damping: 12, stiffness: 400, mass: 0.32 },
    durationInFrames: 9,
  });

  const sparkP = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomP = interpolate(frame, [stampAt - 2, stampAt + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={0.9} />
      <DustMotes count={9} color={colors.secret} seed={3} />
      <AbsoluteFill
        style={{
          opacity: enter * (1 - exit * 0.85),
          transform: `scale(${(1.1 + enter * 0.08) * exitScale}) translateY(${exit * -24}px)`,
          perspective: 1200,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '28%',
            width: 720,
            transform: 'translate(-50%, -50%)',
            opacity: 0.55,
            zIndex: 1,
          }}
        >
          <ShelfRow books={7} litIndex={3} glowAll={0.6} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '48%',
            display: 'flex',
            gap: 14,
            transform: 'translate(-50%, -50%)',
            zIndex: 4,
          }}
        >
          {SECRETS.map((c, i) => {
            const t = spring({
              frame: frame - 3 - i * 3,
              fps,
              config: { damping: 12, stiffness: 400, mass: 0.32 },
              durationInFrames: 10,
            });
            const z = interpolate(t, [0, 1], [600, 0]);
            const y = interpolate(t, [0, 1], [100, 0]);
            const rotY = interpolate(t, [0, 1], [50 - i * 10, 0]);
            const scale = overshootScale(t, 1.48, 1);

            return (
              <div
                key={c.title}
                style={{
                  opacity: interpolate(t, [0, 0.12], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                  transform: `translate3d(0, ${y}px, ${z}px) rotateY(${rotY}deg) scale(${scale})`,
                  filter: `drop-shadow(0 0 ${16 + t * 28}px ${colors.secret})`,
                }}
              >
                <CardFace
                  title={c.title}
                  subtitle="Secret"
                  accent={c.accent}
                  glow={0.95}
                  width={170}
                  height={250}
                />
              </div>
            );
          })}
        </div>

        <GlowBloom
          active={frame >= stampAt - 2}
          progress={bloomP}
          color={colors.secret}
          size={540}
        />
        <SparkBurst active progress={sparkP} color={colors.secret} count={20} />

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '68%',
            transform: `translate(-50%, 0) scale(${overshootScale(stamp, 1.48, 1)})`,
            opacity: stamp,
            fontSize: 64,
            fontWeight: 800,
            color: colors.ivory,
            letterSpacing: 6,
            textTransform: 'uppercase',
            textShadow: `0 0 40px ${colors.secret}, 0 6px 20px rgba(0,0,0,0.7)`,
            zIndex: 6,
          }}
        >
          Секрет
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
