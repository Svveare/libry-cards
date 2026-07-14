import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { CaseStripItem } from '../../utils/dailyRoll';
import { WINNER_INDEX } from '../../utils/dailyRoll';
import { REWARD_KIND_COLORS } from '../../types';
import styles from './CaseStrip.module.css';

const ITEM_WIDTH = 100;
const ITEM_GAP = 8;
/** Fast roll then soft land — total ~4.1s */
const ROLL_MS = 3200;
const SETTLE_MS = 900;
const JITTER_INSET = 16;
const OVERSHOOT_MIN = 36;
const OVERSHOOT_MAX = 88;

/** Smooth ease-out: keeps speed then soft brake (no mid-curve kink). */
const EASE_ROLL = 'cubic-bezier(0.12, 0.7, 0.16, 1)';
const EASE_SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';

interface CaseStripProps {
  items: CaseStripItem[];
  spinning: boolean;
  onSpinEnd?: () => void;
}

export function CaseStrip({ items, spinning, onSpinEnd }: CaseStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const onSpinEndRef = useRef(onSpinEnd);
  onSpinEndRef.current = onSpinEnd;

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const setX = (px: number, transition: string) => {
      track.style.transition = transition;
      track.style.transform = `translate3d(${Math.round(-px)}px, 0, 0)`;
    };

    if (!spinning || items.length === 0) {
      setX(0, 'none');
      endedRef.current = false;
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const center = viewport.clientWidth / 2;
    const itemSpan = ITEM_WIDTH + ITEM_GAP;
    const itemLeft = WINNER_INDEX * itemSpan;
    const minHit = itemLeft + JITTER_INSET;
    const maxHit = itemLeft + ITEM_WIDTH - JITTER_INSET;
    const hitX = minHit + Math.random() * (maxHit - minHit);
    const target = Math.round(hitX - center);
    const overshoot =
      OVERSHOOT_MIN + Math.random() * (OVERSHOOT_MAX - OVERSHOOT_MIN);
    const peak = Math.round(target + overshoot);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    endedRef.current = false;

    const finish = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      setX(target, 'none');
      onSpinEndRef.current?.();
    };

    if (prefersReduced) {
      finish();
      return;
    }

    // Reset without transition, then next frames start GPU transitions.
    setX(0, 'none');

    let settleTimer = 0;
    let rollTimer = 0;
    let cancelled = false;

    const raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      // Force style flush so the browser sees 0 before animating to peak.
      void track.offsetWidth;
      setX(peak, `transform ${ROLL_MS}ms ${EASE_ROLL}`);

      rollTimer = window.setTimeout(() => {
        if (cancelled) return;
        setX(target, `transform ${SETTLE_MS}ms ${EASE_SETTLE}`);
        settleTimer = window.setTimeout(() => {
          if (cancelled) return;
          finish();
        }, SETTLE_MS + 20);
      }, ROLL_MS + 20);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      window.clearTimeout(rollTimer);
      window.clearTimeout(settleTimer);
    };
  }, [spinning, items]);

  return (
    <div className={styles.wrap}>
      <div className={styles.marker} aria-hidden />
      <div className={styles.viewport} ref={viewportRef}>
        <div
          ref={trackRef}
          className={`${styles.track} ${spinning ? styles.trackSpinning : ''}`}
          style={{ gap: ITEM_GAP } as CSSProperties}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className={styles.item}
              style={
                {
                  width: ITEM_WIDTH,
                  '--item-color': REWARD_KIND_COLORS[item.kind],
                } as CSSProperties
              }
            >
              <span className={styles.itemLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
