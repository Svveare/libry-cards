import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Atmosphere, SAFE } from '../primitives';
import { overshootScale } from '../motion';
import { colors } from '../theme';
import { fontDisplay, fontBody } from '../fonts';

/** High-contrast Telegram CTA — livelier ~78f pulse, no softExit. */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = spring({
    frame: frame - 2,
    fps,
    config: { damping: 13, stiffness: 320, mass: 0.4 },
    durationInFrames: 12,
  });
  const sub = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 280, mass: 0.4 },
    durationInFrames: 12,
  });
  const cta = spring({
    frame: frame - 16,
    fps,
    config: { damping: 12, stiffness: 340, mass: 0.35 },
    durationInFrames: 12,
  });

  // ~78-frame beat pulse (≈2.6s @ 30fps)
  const pulse =
    1 +
    Math.sin(frame * ((2 * Math.PI) / 78)) * 0.055 * cta +
    Math.sin(frame * ((2 * Math.PI) / 39)) * 0.02 * cta;

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={1.15} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 60% at 50% 40%, rgba(240,208,120,0.22), transparent 65%)`,
        }}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          padding: SAFE,
        }}
      >
        <div
          style={{
            opacity: title,
            transform: `scale(${overshootScale(title, 1.42, 1)})`,
            fontSize: 72,
            fontWeight: 800,
            color: colors.ivory,
            letterSpacing: 2,
            textAlign: 'center',
            lineHeight: 1.1,
            padding: '4px 8px',
            textShadow: `0 0 48px ${colors.glow}, 0 8px 28px rgba(0,0,0,0.75)`,
          }}
        >
          Libry Cards
        </div>

        <div
          style={{
            opacity: sub,
            transform: `translateY(${(1 - sub) * 40}px)`,
            fontFamily: fontBody,
            fontSize: 34,
            fontWeight: 700,
            color: colors.gold,
            letterSpacing: 1,
            textAlign: 'center',
            textShadow: `0 0 20px ${colors.glow}`,
          }}
        >
          Играй в Telegram
        </div>

        <div
          style={{
            opacity: cta,
            transform: `scale(${pulse * overshootScale(cta, 1.35, 1)})`,
            marginTop: 18,
            padding: '22px 48px',
            borderRadius: 999,
            background: `linear-gradient(135deg, ${colors.brass}, ${colors.gold})`,
            color: colors.ink,
            fontFamily: fontBody,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 1,
            boxShadow: `0 0 ${40 + pulse * 12}px ${colors.glow}, 0 12px 32px rgba(0,0,0,0.45)`,
          }}
        >
          @LibryCards
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          opacity: interpolate(frame, [50, 70], [0, 0.08], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          background: colors.gold,
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
