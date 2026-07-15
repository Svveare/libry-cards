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
  { title: 'Легенда', accent: colors.legend },
  { title: 'Обычная', accent: colors.brass },
  { title: 'Мифик', accent: colors.mythic },
];

const CARD_W = 220;
const CARD_H = 320;
const GAP = 18;
const STEP = CARD_W + GAP;
const WINNER = 7; // Легенда
const LOOPS = 3;

/** Spin → stop ~halfway → ~14–16f hero lift + bloom. */
export const CaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 360, mass: 0.35 },
    durationInFrames: 8,
  });

  // Stop ~halfway through ~50f scene windows
  const stopAt = Math.round(dur * 0.48);
  const spinProgress = interpolate(frame, [2, stopAt], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3.6),
  });

  const winAbsIndex = (LOOPS - 1) * STRIP.length + WINNER;
  const startIndex = WINNER;
  const travel = (winAbsIndex - startIndex) * STEP;
  const offset = -startIndex * STEP - spinProgress * travel;

  const cells = Array.from({ length: STRIP.length * LOOPS }, (_, i) => ({
    ...STRIP[i % STRIP.length],
    key: i,
    isWinnerSlot: i === winAbsIndex,
  }));

  const stopped = frame >= stopAt;
  const lift = spring({
    frame: frame - stopAt,
    fps,
    config: { damping: 12, stiffness: 400, mass: 0.32 },
    durationInFrames: 14,
  });
  const sparkP = interpolate(frame, [stopAt, stopAt + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomP = interpolate(frame, [stopAt, stopAt + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exit = softExit(frame, dur);
  const exitScale = 1 - exit * 0.03;
  const liftScale = overshootScale(lift, 1.48, 1.48);

  const winCard = STRIP[WINNER];

  return (
    <AbsoluteFill style={{ fontFamily: fontDisplay }}>
      <Atmosphere lamp={1} />
      <AbsoluteFill
        style={{
          opacity: enter * (1 - exit * 0.85),
          transform: `scale(${(1.05 + enter * 0.1) * exitScale}) translateX(${exit * -35}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '18%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
            fontSize: 32,
            fontWeight: 800,
            color: colors.ivory,
            letterSpacing: 4,
            textTransform: 'uppercase',
            textShadow: `0 0 20px ${colors.glow}`,
            zIndex: 6,
            opacity: stopped ? 1 - lift * 0.5 : 1,
          }}
        >
          Кейс
        </div>

        {!stopped && (
          <div
            style={{
              position: 'absolute',
              top: '34%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '20px solid transparent',
              borderRight: '20px solid transparent',
              borderTop: `30px solid ${colors.gold}`,
              filter: `drop-shadow(0 0 14px ${colors.glow})`,
              zIndex: 8,
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            top: '36%',
            left: 0,
            right: 0,
            height: 360,
            overflow: 'hidden',
            opacity: stopped ? interpolate(lift, [0, 1], [1, 0.25]) : 1,
            transform: `scale(${stopped ? 0.92 : 1})`,
            zIndex: 3,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 4,
              pointerEvents: 'none',
              background: `linear-gradient(90deg, ${colors.oil} 0%, transparent 10%, transparent 90%, ${colors.oil} 100%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 20,
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
                  filter: stopped ? 'brightness(0.4)' : 'brightness(1.05)',
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

        {stopped && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '46%',
              transform: `translate(-50%, -50%) scale(${liftScale})`,
              zIndex: 20,
              filter: `drop-shadow(0 0 ${28 + lift * 50}px ${colors.legend}) brightness(${1.1 + lift * 0.25})`,
            }}
          >
            <GlowBloom
              active
              progress={bloomP}
              color={colors.legend}
              size={480}
            />
            <CardFace
              title={winCard.title}
              accent={winCard.accent}
              glow={1}
              width={CARD_W}
              height={CARD_H}
            />
          </div>
        )}

        <SparkBurst
          active={stopped}
          progress={sparkP}
          color={colors.legend}
          count={18}
        />

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '46%',
            transform: `translate(-50%, ${180 + lift * 40}px) scale(${overshootScale(lift, 1.35, 1.05)})`,
            opacity: lift,
            fontSize: 44,
            fontWeight: 800,
            color: colors.legend,
            letterSpacing: 3,
            textTransform: 'uppercase',
            textShadow: `0 0 32px ${colors.legend}`,
            zIndex: 21,
            whiteSpace: 'nowrap',
          }}
        >
          Легенда!
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
