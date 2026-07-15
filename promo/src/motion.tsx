import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors } from './theme';

/** Hard slam — sharp advertising hit. */
export const SLAM = { damping: 13, stiffness: 440, mass: 0.35 } as const;
export const SNAP = { damping: 11, stiffness: 400, mass: 0.36 } as const;
export const WHIP = { damping: 14, stiffness: 480, mass: 0.3 } as const;

export function useSlam(startFrame: number, durationInFrames = 8) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - startFrame,
    fps,
    config: SLAM,
    durationInFrames,
  });
}

export function useSnap(startFrame: number, durationInFrames = 7) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - startFrame,
    fps,
    config: SNAP,
    durationInFrames,
  });
}

/** Parabolic arc from A → B with height apex (0–1 progress). */
export function flyArc(
  t: number,
  from: { x: number; y: number; z?: number },
  to: { x: number; y: number; z?: number },
  apex = -220,
): { x: number; y: number; z: number } {
  const p = Math.max(0, Math.min(1, t));
  const x = from.x + (to.x - from.x) * p;
  const yLinear = from.y + (to.y - from.y) * p;
  const y = yLinear + apex * 4 * p * (1 - p);
  const z0 = from.z ?? 0;
  const z1 = to.z ?? 0;
  const z = z0 + (z1 - z0) * p;
  return { x, y, z };
}

/** Overshoot scale punch: peaks then settles. Soulful default peak 1.45. */
export function overshootScale(t: number, peak = 1.45, settle = 1) {
  const p = Math.max(0, Math.min(1, t));
  if (p < 0.12) return interpolate(p, [0, 0.12], [0.92, 0.88]); // anticipation
  if (p < 0.45) return interpolate(p, [0.12, 0.45], [0.88, peak]);
  return interpolate(p, [0.45, 1], [peak, settle]);
}

/** Short whip for scene joins (4 frames). */
export function whipOffset(frame: number, at: number, amp = 55): number {
  const local = frame - at;
  if (local < 0 || local > 4) return 0;
  return interpolate(local, [0, 1, 4], [0, amp, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** 3-frame camera punch on impact. */
export function impactShake(frame: number, at: number, amp = 4): {
  x: number;
  y: number;
} {
  const local = frame - at;
  if (local < 0 || local > 3) return { x: 0, y: 0 };
  const t = local / 3;
  return {
    x: Math.sin(t * Math.PI * 3) * amp * (1 - t),
    y: Math.cos(t * Math.PI * 2.5) * amp * 0.7 * (1 - t),
  };
}

/**
 * Soft exit progress 0→1 over `len` frames (default 4).
 * Apply: scale `1 - t * 0.03`, opacity `1 - t * 0.85`.
 */
export function softExit(frame: number, dur: number, len = 4): number {
  return interpolate(frame, [dur - len, dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Alias — prefer softExit. */
export function snapExit(frame: number, dur: number, len = 4): number {
  return softExit(frame, dur, len);
}

/** Residual glow envelope after a beat (0→1→0 over ~12f). */
export function afterglow(frame: number, at: number, len = 12): number {
  const local = frame - at;
  if (local < 0 || local > len) return 0;
  return interpolate(local, [0, 2, len], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

type Spark = { id: number; angle: number; dist: number; size: number; ring: number };

export function SparkBurst({
  active,
  progress,
  color = colors.gold,
  count = 16,
}: {
  active: boolean;
  progress: number;
  color?: string;
  count?: number;
}) {
  if (!active || progress <= 0) return null;
  const sparks: Spark[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * Math.PI * 2 + 0.3,
    dist: 48 + (i % 4) * 32,
    size: 4 + (i % 3) * 2,
    ring: 0,
  }));
  // Second outer ring — fewer, larger shards
  const outerCount = Math.max(6, Math.round(count * 0.45));
  for (let i = 0; i < outerCount; i++) {
    sparks.push({
      id: count + i,
      angle: (i / outerCount) * Math.PI * 2 + 0.55,
      dist: 90 + (i % 3) * 28,
      size: 3 + (i % 2),
      ring: 1,
    });
  }
  const op = interpolate(progress, [0, 0.2, 1], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      {sparks.map((s) => {
        const travel = s.ring === 0 ? 2.8 : 3.2;
        const d = s.dist * progress * travel;
        const x = Math.cos(s.angle) * d;
        const y = Math.sin(s.angle) * d;
        const ringOp = s.ring === 0 ? op : op * 0.7;
        return (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: s.size,
              height: s.size * 2.8,
              borderRadius: 2,
              background: color,
              boxShadow: `0 0 14px ${color}`,
              opacity: ringOp,
              transform: `translate(${x}px, ${y}px) rotate(${(s.angle * 180) / Math.PI}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

/** 4-frame bright impact cut. */
export function ImpactFlash({
  frame,
  at,
  color = colors.flash,
}: {
  frame: number;
  at: number;
  color?: string;
}) {
  const local = frame - at;
  if (local < 0 || local > 4) return null;
  const op = interpolate(local, [0, 1, 4], [0, 0.72, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: color,
        opacity: op,
        pointerEvents: 'none',
        zIndex: 80,
        mixBlendMode: 'screen',
      }}
    />
  );
}

/** Radial brass/gold bloom — opacity envelope ~10–12f from `at`. */
export function GlowBloom({
  active,
  progress,
  color = colors.gold,
  size = 520,
}: {
  active: boolean;
  progress: number;
  color?: string;
  size?: number;
}) {
  if (!active || progress <= 0) return null;
  const op = interpolate(progress, [0, 0.2, 0.55, 1], [0, 0.85, 0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(progress, [0, 1], [0.55, 1.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}cc 0%, ${color}55 28%, transparent 68%)`,
        opacity: op,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
        zIndex: 35,
        mixBlendMode: 'screen',
        filter: 'blur(6px)',
      }}
    />
  );
}

type Mote = { id: number; x: number; y: number; size: number; drift: number; speed: number };

/** Slow floating dust motes for atmospheric scenes. */
export function DustMotes({
  count = 10,
  color = colors.gold,
  seed = 1,
}: {
  count?: number;
  color?: string;
  seed?: number;
}) {
  const frame = useCurrentFrame();
  const n = Math.max(8, Math.min(12, count));
  const motes: Mote[] = Array.from({ length: n }, (_, i) => {
    const s = (i + 1) * 17.3 * seed;
    return {
      id: i,
      x: ((Math.sin(s) * 0.5 + 0.5) * 88 + 6) % 94,
      y: ((Math.cos(s * 1.3) * 0.5 + 0.5) * 80 + 8) % 88,
      size: 2 + (i % 3),
      drift: 8 + (i % 5) * 4,
      speed: 0.012 + (i % 4) * 0.004,
    };
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 25,
        overflow: 'hidden',
      }}
    >
      {motes.map((m) => {
        const ox = Math.sin(frame * m.speed + m.id) * m.drift;
        const oy = Math.cos(frame * m.speed * 0.85 + m.id * 1.7) * m.drift * 0.7;
        const op =
          0.25 +
          0.35 *
            (0.5 + 0.5 * Math.sin(frame * m.speed * 1.4 + m.id * 2.1));
        return (
          <div
            key={m.id}
            style={{
              position: 'absolute',
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: m.size,
              height: m.size,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${6 + m.size * 2}px ${color}`,
              opacity: op,
              transform: `translate(${ox}px, ${oy}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
