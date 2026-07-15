import React from 'react';
import { AbsoluteFill } from 'remotion';
import { colors } from './theme';

/** Safe margin from edges on 9:16 master. */
export const SAFE = 64;

type CardFaceProps = {
  title: string;
  subtitle?: string;
  accent?: string;
  width?: number;
  height?: number;
  glow?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  scale?: number;
  z?: number;
};

export const CardFace: React.FC<CardFaceProps> = ({
  title,
  subtitle = 'Libry',
  accent = colors.brass,
  width = 220,
  height = 320,
  glow = 0.55,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  scale = 1,
  z = 0,
}) => {
  const label = (title || '').trim() || 'Карта';
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        transform: `translateZ(${z}px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
        transformStyle: 'preserve-3d',
        background: `linear-gradient(155deg, ${colors.oilMid} 0%, #3a2818 40%, ${colors.oil} 100%)`,
        border: `2.5px solid ${accent}`,
        boxShadow: `
        0 0 ${20 + glow * 50}px ${accent}aa,
        0 0 ${40 + glow * 70}px ${accent}55,
        0 22px 48px rgba(0,0,0,0.65),
        inset 0 1px 0 rgba(255,255,255,0.12)
      `,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 16,
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(125deg, rgba(255,255,255,0.14) 0%, transparent 42%, transparent 58%, rgba(0,0,0,0.28) 100%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: 12,
          border: `1px solid ${accent}88`,
          background: `radial-gradient(circle at 28% 18%, ${accent}55, transparent 55%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '16%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: width * 0.44,
          height: width * 0.44,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}cc, ${accent}33 55%, transparent)`,
          filter: 'blur(0.5px)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
            color: accent,
            fontWeight: 800,
            marginBottom: 4,
            textShadow: `0 0 12px ${accent}`,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: colors.ivory,
            lineHeight: 1.1,
            textShadow: '0 2px 12px rgba(0,0,0,0.75)',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

export const Atmosphere: React.FC<{ lamp?: number }> = ({ lamp = 0.85 }) => (
  <AbsoluteFill
    style={{
      background: `
        radial-gradient(ellipse 90% 55% at 50% 12%, rgba(240,208,120,${0.32 * lamp}) 0%, transparent 58%),
        radial-gradient(ellipse 70% 40% at 50% 70%, rgba(224,184,74,${0.12 * lamp}) 0%, transparent 60%),
        linear-gradient(180deg, #221810 0%, ${colors.oilMid} 38%, ${colors.oil} 100%)
      `,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '4%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 160,
        height: 200,
        opacity: lamp,
        background: `radial-gradient(ellipse at 50% 20%, ${colors.gold}, transparent 70%)`,
        filter: 'blur(22px)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.45) 100%)',
        pointerEvents: 'none',
      }}
    />
  </AbsoluteFill>
);

export const MicroLogo: React.FC<{ opacity?: number; scale?: number }> = ({
  opacity = 1,
  scale = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      top: SAFE,
      right: SAFE - 8,
      opacity,
      transform: `scale(${scale})`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      zIndex: 20,
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: `2px solid ${colors.brass}`,
        background: `linear-gradient(145deg, ${colors.oilMid}, ${colors.oil})`,
        boxShadow: `0 0 18px ${colors.glow}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.gold,
        fontSize: 16,
        fontWeight: 800,
      }}
    >
      L
    </div>
  </div>
);

export const BookCover: React.FC<{
  title: string;
  width?: number;
  height?: number;
  open?: number;
  tilt?: number;
  glow?: number;
}> = ({ title, width = 280, height = 380, open = 0, tilt = 0, glow = 0 }) => {
  const pageShift = open * 18;
  return (
    <div
      style={{
        width,
        height,
        transform: `rotateZ(${tilt}deg) rotateY(${open * -28}deg)`,
        transformStyle: 'preserve-3d',
        position: 'relative',
        filter: glow > 0 ? `drop-shadow(0 0 ${18 + glow * 30}px ${colors.gold})` : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.woodLite}, ${colors.wood} 40%, #2a180c)`,
          border: `2.5px solid ${colors.brass}`,
          boxShadow: `0 28px 56px rgba(0,0,0,0.6), 0 0 ${glow * 40}px ${colors.glow}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 20,
            bottom: 20,
            width: 5,
            background: colors.brass,
            opacity: 0.85,
            borderRadius: 2,
            boxShadow: `0 0 10px ${colors.glow}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 28,
            border: `1px solid ${colors.brass}88`,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            color: colors.parchment,
            fontSize: 28,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.15,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </div>
      </div>
      {/* Open interior — clear parchment with 4 brass dashed slots (not dark chocolate tiles) */}
      {open > 0.05 && (
        <div
          style={{
            position: 'absolute',
            left: width * 0.1 + pageShift,
            top: height * 0.07,
            width: width * 0.8,
            height: height * 0.86,
            borderRadius: 8,
            background: `linear-gradient(180deg, ${colors.ivory} 0%, ${colors.parchment} 100%)`,
            border: `1.5px solid ${colors.brass}99`,
            boxShadow: 'inset 0 0 20px rgba(120,80,30,0.18), 8px 12px 28px rgba(0,0,0,0.4)',
            transform: `translateX(${open * 44}px)`,
            opacity: Math.min(1, open * 1.4),
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            padding: 16,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: 10,
                border: `2px dashed ${colors.brass}`,
                background: 'rgba(255,248,230,0.55)',
                boxShadow: 'inset 0 0 12px rgba(200,150,60,0.15)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CardBack: React.FC<{
  width?: number;
  height?: number;
  glow?: number;
}> = ({ width = 220, height = 310, glow = 0.4 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 18,
      background: `linear-gradient(155deg, #2a1c12 0%, ${colors.oil} 55%, #080604 100%)`,
      border: `2.5px solid ${colors.brass}`,
      boxShadow: `
        0 0 ${18 + glow * 40}px ${colors.brass}88,
        0 18px 40px rgba(0,0,0,0.55),
        inset 0 1px 0 rgba(255,255,255,0.1)
      `,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 12,
        borderRadius: 12,
        border: `1px solid ${colors.brass}66`,
      }}
    />
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        border: `2px solid ${colors.brass}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.gold,
        fontSize: 32,
        fontWeight: 800,
        boxShadow: `0 0 20px ${colors.glow}`,
        background: `linear-gradient(145deg, ${colors.oilMid}, ${colors.oil})`,
      }}
    >
      L
    </div>
  </div>
);

type PageSlot =
  | { filled: false }
  | { filled: true; title: string; accent: string };

/** Open book with flip-able right page showing a 2×2 grid of slots/mini-cards. */
export const BookFlipPages: React.FC<{
  title?: string;
  width?: number;
  height?: number;
  /** 0 closed → 1 open spread */
  open: number;
  /** Which page face is showing (0,1,2) — flips animate via flipProgress */
  pageIndex: number;
  /** 0→1 flip of current page turning */
  flipProgress?: number;
  pages: PageSlot[][];
}> = ({
  title = 'Книга',
  width = 520,
  height = 360,
  open,
  pageIndex,
  flipProgress = 0,
  pages,
}) => {
  const coverW = width * 0.42;
  const pageW = width * 0.52;
  const slots = pages[Math.min(pageIndex, pages.length - 1)] ?? pages[0]!;
  const nextSlots =
    pages[Math.min(pageIndex + 1, pages.length - 1)] ?? slots;
  const turning = flipProgress > 0.02 && flipProgress < 0.98;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        transform: `scale(${0.85 + open * 0.15})`,
        transformStyle: 'preserve-3d',
        perspective: 1200,
        opacity: Math.min(1, open * 1.6),
      }}
    >
      {/* Left cover / page */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: coverW,
          height,
          borderRadius: '10px 4px 4px 10px',
          background: `linear-gradient(135deg, ${colors.woodLite}, ${colors.wood} 50%, #2a180c)`,
          border: `2.5px solid ${colors.brass}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `rotateY(${open * -8}deg)`,
          transformOrigin: 'right center',
        }}
      >
        <div
          style={{
            color: colors.parchment,
            fontSize: 26,
            fontWeight: 700,
            textAlign: 'center',
            padding: 16,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </div>
      </div>

      {/* Right page stack */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: height * 0.04,
          width: pageW,
          height: height * 0.92,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Under page (next content, visible mid-flip) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            background: `linear-gradient(180deg, ${colors.ivory}, ${colors.parchment})`,
            border: `1.5px solid ${colors.brass}88`,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            zIndex: 1,
          }}
        >
          {nextSlots.map((s, i) => (
            <PageCell key={`n-${i}`} slot={s} />
          ))}
        </div>

        {/* Flipping page */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            background: `linear-gradient(180deg, ${colors.ivory}, ${colors.parchment})`,
            border: `1.5px solid ${colors.brass}99`,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            transformOrigin: 'left center',
            transform: `rotateY(${-flipProgress * 165}deg)`,
            backfaceVisibility: 'hidden',
            boxShadow: turning
              ? '-12px 8px 28px rgba(0,0,0,0.35)'
              : '4px 8px 20px rgba(0,0,0,0.25)',
            zIndex: 2,
          }}
        >
          {slots.map((s, i) => (
            <PageCell key={`c-${i}`} slot={s} />
          ))}
        </div>
      </div>
    </div>
  );
};

function PageCell({ slot }: { slot: PageSlot }) {
  if (!slot.filled) {
    return (
      <div
        style={{
          borderRadius: 8,
          border: `2px dashed ${colors.brass}`,
          background: 'rgba(255,248,230,0.55)',
          minHeight: 90,
        }}
      />
    );
  }
  return (
    <div style={{ minHeight: 90, display: 'flex', justifyContent: 'center' }}>
      <CardFace
        title={slot.title}
        accent={slot.accent}
        glow={0.55}
        width={110}
        height={100}
        scale={1}
      />
    </div>
  );
}

export const ShelfRow: React.FC<{
  books?: number;
  push?: number;
  litIndex?: number;
  glowAll?: number;
}> = ({ books = 7, push = 0, litIndex = -1, glowAll = 0 }) => {
  const hues = [colors.wood, '#5a3820', '#3a2414', colors.woodLite, '#4a3018'];
  const spines = Array.from({ length: books }, (_, i) => {
    const lit = i === litIndex || glowAll > 0.3;
    return (
      <div
        key={i}
        style={{
          width: 44 + (i % 3) * 6,
          height: 170 + (i % 4) * 20,
          marginTop: 'auto',
          borderRadius: '4px 4px 2px 2px',
          background: lit
            ? `linear-gradient(90deg, ${colors.brass}, ${hues[i % hues.length]})`
            : `linear-gradient(90deg, ${hues[i % hues.length]}, #1a1008)`,
          border: `1px solid ${colors.brass}${lit ? 'cc' : '66'}`,
          transform:
            i === Math.floor(books / 2)
              ? `translateY(${push}px) rotateZ(${push * 0.1}deg)`
              : undefined,
          boxShadow: lit
            ? `0 0 ${16 + glowAll * 24}px ${colors.glow}, 2px 4px 12px rgba(0,0,0,0.45)`
            : '2px 4px 10px rgba(0,0,0,0.45)',
        }}
      />
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 7,
        padding: '0 24px',
        position: 'relative',
      }}
    >
      {spines}
      <div
        style={{
          position: 'absolute',
          bottom: -10,
          left: '6%',
          right: '6%',
          height: 26,
          background: `linear-gradient(180deg, ${colors.woodLite}, ${colors.wood})`,
          borderRadius: 4,
          boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
          borderTop: `1px solid ${colors.brass}55`,
        }}
      />
    </div>
  );
};
