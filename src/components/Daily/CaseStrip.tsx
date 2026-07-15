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
/** Overshoot stays inside the winner cell (visual land = awarded cell). */
const OVERSHOOT_MIN = 8;
const OVERSHOOT_MAX = 28;
const EDGE_PAD = 4;

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

    const cell = track.children[WINNER_INDEX] as HTMLElement | undefined;
    const itemLeft = cell?.offsetLeft ?? WINNER_INDEX * (ITEM_WIDTH + ITEM_GAP);
    const itemWidth = cell?.offsetWidth ?? ITEM_WIDTH;

    const center = viewport.clientWidth / 2;
    const minHit = itemLeft + JITTER_INSET;
    const maxHit = itemLeft + itemWidth - JITTER_INSET;
    const hitX = minHit + Math.random() * Math.max(0, maxHit - minHit);
    const target = Math.round(hitX - center);

    const hitOffset = hitX - itemLeft;
    const maxOvershoot = Math.max(
      0,
      itemWidth - JITTER_INSET - hitOffset - EDGE_PAD,
    );
    const rawOvershoot =
      OVERSHOOT_MIN + Math.random() * (OVERSHOOT_MAX - OVERSHOOT_MIN);
    const overshoot = Math.min(rawOvershoot, maxOvershoot);
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

    setX(0, 'none');

    let settleFallback = 0;
    let rollFallback = 0;
    let phase: 'roll' | 'settle' = 'roll';
    let cancelled = false;

    const onTransitionEnd = (e: TransitionEvent) => {
      if (cancelled || e.propertyName !== 'transform') return;
      if (phase === 'roll') {
        phase = 'settle';
        window.clearTimeout(rollFallback);
        setX(target, `transform ${SETTLE_MS}ms ${EASE_SETTLE}`);
        settleFallback = window.setTimeout(finish, SETTLE_MS + 80);
        return;
      }
      window.clearTimeout(settleFallback);
      finish();
    };

    track.addEventListener('transitionend', onTransitionEnd);

    const raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      void track.offsetWidth;
      setX(peak, `transform ${ROLL_MS}ms ${EASE_ROLL}`);
      rollFallback = window.setTimeout(() => {
        if (cancelled || endedRef.current || phase !== 'roll') return;
        phase = 'settle';
        setX(target, `transform ${SETTLE_MS}ms ${EASE_SETTLE}`);
        settleFallback = window.setTimeout(finish, SETTLE_MS + 80);
      }, ROLL_MS + 80);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      window.clearTimeout(rollFallback);
      window.clearTimeout(settleFallback);
      track.removeEventListener('transitionend', onTransitionEnd);
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
