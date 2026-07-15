import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Atmosphere, CardFace, MicroLogo } from '../primitives';
import { afterglow, GlowBloom, overshootScale, softExit, SparkBurst } from '../motion';
import { colors } from '../theme';
import { fontDisplay } from '../fonts';

const CARDS = [
  { title: 'Эхо', accent: colors.rare },
  { title: 'Перо', accent: colors.brass },
  { title: 'Ключ', accent: colors.legend },
  { title: 'Тень', accent: colors.epic },
  { title: 'Огни', accent: colors.mythic },
];

/** Cards fly-in; Libry stamp early; bloom + soft exit. */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const stampAt = 12;
  const stamp = spring({
    frame: frame - stampAt,
    fps,
    config: { damping: 12, stiffness: 400, mass: 0.32 },
    durationInFrames: 9,
  });
  const stampScale = overshootScale(stamp, 1.45, 1);
  const stampOp = interpolate(frame, [stampAt, stampAt + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sparkP = interpolate(frame, [6, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomP = interpolate(frame, [stampAt, stampAt + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ag = afterglow(frame, stampAt + 4, 12);

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={0.95 + frame / 100} />
      <MicroLogo
        opacity={interpolate(frame, [3, 9], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
        scale={1 + stamp * 0.08}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 1200,
          perspectiveOrigin: '50% 42%',
          transform: `scale(${1.18 * exitScale}) translateX(${exit * -40}px)`,
          opacity: 1 - exit * 0.85,
        }}
      >
        {CARDS.map((c, i) => {
          const delay = i * 2;
          const t = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 400, mass: 0.32 },
            durationInFrames: 10,
          });
          const stripX = (i - 2) * 140;
          const z = interpolate(t, [0, 1], [780, 0]);
          const y = interpolate(t, [0, 1], [50 + (i % 2) * 20, -20]);
          const rotY = interpolate(t, [0, 1], [50 - i * 8, 0]);
          const rotZ = interpolate(t, [0, 1], [(i - 2) * 16, 0]);
          const scale = overshootScale(t, 1.42, 1);
          const op = interpolate(t, [0, 0.12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={c.title}
              style={{
                position: 'absolute',
                opacity: op,
                zIndex: 2 + i,
                transform: `translate3d(${stripX}px, ${y}px, ${z}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
                filter: 'brightness(1.12)',
              }}
            >
              <CardFace
                title={c.title}
                accent={c.accent}
                glow={0.8 + (1 - t) * 0.5}
                scale={scale}
                width={200}
                height={290}
              />
            </div>
          );
        })}

        <GlowBloom active={frame >= stampAt} progress={bloomP} color={colors.gold} size={560} />
        <SparkBurst active progress={sparkP} color={colors.gold} count={16} />

        {/* Afterglow halo under stamp */}
        <div
          style={{
            position: 'absolute',
            top: '52%',
            left: '50%',
            width: 280,
            height: 80,
            marginLeft: -140,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${colors.gold}88, transparent 70%)`,
            opacity: ag * 0.55,
            filter: 'blur(12px)',
            zIndex: 9,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '58%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: stampOp,
            transform: `scale(${stampScale})`,
            fontSize: 68,
            fontWeight: 800,
            color: colors.ivory,
            letterSpacing: 5,
            textTransform: 'uppercase',
            textShadow: `0 0 40px ${colors.glow}, 0 8px 24px rgba(0,0,0,0.7)`,
            zIndex: 10,
          }}
        >
          Libry
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
