import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Atmosphere, CardFace } from '../primitives';
import { GlowBloom, flyArc, overshootScale, softExit, SparkBurst } from '../motion';
import { colors } from '../theme';
import { fontDisplay } from '../fonts';

const SLOT_W = 280;
const SLOT_H = 390;
const CARD_W = 250;
const CARD_H = 355;

/** Arc lands early; bar settles on 20/20 + sparks. */
export const CollectScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const landAt = 12;

  const fly = spring({
    frame: frame - 1,
    fps,
    config: { damping: 12, stiffness: 300, mass: 0.38 },
    durationInFrames: 12,
  });
  const pos = flyArc(
    fly,
    { x: -420, y: -360, z: 220 },
    { x: 0, y: 0, z: 0 },
    -200,
  );
  const rot = interpolate(fly, [0, 1], [-40, 0]);
  const cardScale = overshootScale(fly, 1.42, 1);

  const land = frame >= landAt;
  const landPunch = spring({
    frame: frame - landAt,
    fps,
    config: { damping: 11, stiffness: 420, mass: 0.28 },
    durationInFrames: 8,
  });
  const slotSquash = land
    ? interpolate(landPunch, [0, 0.35, 1], [1, 0.9, 1])
    : 1;

  const bar = spring({
    frame: frame - (landAt + 2),
    fps,
    config: { damping: 14, stiffness: 260, mass: 0.42 },
    durationInFrames: 12,
  });
  const count = Math.round(interpolate(bar, [0, 1], [19, 20]));

  const sparkP = interpolate(frame, [landAt, landAt + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomP = interpolate(frame, [landAt, landAt + 11], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={1} />
      <AbsoluteFill
        style={{
          perspective: 1200,
          transform: `scale(${1.18 * exitScale}) translateX(${exit * 35}px)`,
          opacity: 1 - exit * 0.85,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '48%',
            width: SLOT_W,
            height: SLOT_H,
            transform: `translate(-50%, -50%) scale(${slotSquash})`,
            zIndex: 4,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: -56,
              textAlign: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: colors.ivory,
              letterSpacing: 3,
              textTransform: 'uppercase',
              textShadow: `0 0 16px ${colors.glow}`,
            }}
          >
            В коллекцию
          </div>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24,
              border: `3px dashed ${colors.brass}`,
              background: 'rgba(20,14,10,0.55)',
              boxShadow: land
                ? `0 0 ${34 + landPunch * 44}px ${colors.glow}, inset 0 0 40px rgba(0,0,0,0.4)`
                : 'inset 0 0 40px rgba(0,0,0,0.4)',
              zIndex: 1,
            }}
          />

          {land && (
            <GlowBloom
              active
              progress={bloomP}
              color={colors.gold}
              size={420}
            />
          )}

          <div
            style={{
              position: 'absolute',
              left: (SLOT_W - CARD_W) / 2,
              top: (SLOT_H - CARD_H) / 2,
              transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) rotateZ(${rot}deg) scale(${cardScale})`,
              transformStyle: 'preserve-3d',
              opacity: interpolate(fly, [0, 0.08], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              filter: `drop-shadow(0 20px 30px rgba(0,0,0,0.5)) brightness(${1.1 + (1 - fly) * 0.35})`,
              zIndex: 2,
            }}
          >
            <CardFace
              title="Печать"
              accent={colors.legend}
              glow={0.95}
              width={CARD_W}
              height={CARD_H}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: -72,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: colors.gold,
                textShadow: `0 0 20px ${colors.glow}`,
                transform: `scale(${overshootScale(bar, 1.32, 1.07)})`,
                marginBottom: 10,
              }}
            >
              {count}/20
            </div>
            <div
              style={{
                height: 14,
                borderRadius: 99,
                background: 'rgba(0,0,0,0.45)',
                border: `1px solid ${colors.brass}88`,
                overflow: 'hidden',
                margin: '0 24px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${interpolate(bar, [0, 1], [90, 100])}%`,
                  background: `linear-gradient(90deg, ${colors.brass}, ${colors.gold})`,
                  boxShadow: `0 0 18px ${colors.glow}`,
                }}
              />
            </div>
          </div>
        </div>

        <SparkBurst
          active={land}
          progress={sparkP}
          color={colors.gold}
          count={18}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
