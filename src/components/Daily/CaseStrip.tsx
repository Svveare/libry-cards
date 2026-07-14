import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CaseStripItem } from '../../utils/dailyRoll';
import { WINNER_INDEX } from '../../utils/dailyRoll';
import { REWARD_KIND_COLORS } from '../../types';
import styles from './CaseStrip.module.css';

const ITEM_WIDTH = 100;
const ITEM_GAP = 8;
const ANIM_MS = 4400;
const JITTER_INSET = 16;
const OVERSHOOT_MIN = 28;
const OVERSHOOT_MAX = 72;

interface CaseStripProps {
  items: CaseStripItem[];
  spinning: boolean;
  onSpinEnd?: () => void;
}

function rouletteOffset(t: number, target: number, overshoot: number): number {
  const x = Math.min(1, Math.max(0, t));
  const peak = target + overshoot;

  if (x < 0.7) {
    const u = x / 0.7;
    const easeIn = u * u * (3 - 2 * u);
    return peak * easeIn;
  }

  const u = (x - 0.7) / 0.3;
  const settle = u * u * u * (u * (u * 6 - 15) + 10);
  return peak + (target - peak) * settle;
}

export function CaseStrip({ items, spinning, onSpinEnd }: CaseStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [spinningHard, setSpinningHard] = useState(false);
  const endedRef = useRef(false);
  const onSpinEndRef = useRef(onSpinEnd);
  onSpinEndRef.current = onSpinEnd;

  useLayoutEffect(() => {
    const track = trackRef.current;

    const setX = (px: number) => {
      if (track) track.style.transform = `translate3d(${-px}px, 0, 0)`;
    };

    if (!spinning || items.length === 0) {
      setX(0);
      setSpinningHard(false);
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
    const target = hitX - center;
    const overshoot =
      OVERSHOOT_MIN + Math.random() * (OVERSHOOT_MAX - OVERSHOOT_MIN);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setX(target);
      setSpinningHard(false);
      if (!endedRef.current) {
        endedRef.current = true;
        onSpinEndRef.current?.();
      }
      return;
    }

    setX(0);
    setSpinningHard(true);
    endedRef.current = false;

    let raf = 0;
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / ANIM_MS);
      setX(rouletteOffset(t, target, overshoot));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }

      setX(target);
      setSpinningHard(false);
      if (!endedRef.current) {
        endedRef.current = true;
        onSpinEndRef.current?.();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinning, items]);

  return (
    <div className={styles.wrap}>
      <div className={styles.marker} aria-hidden />
      <div className={styles.viewport} ref={viewportRef}>
        <div
          ref={trackRef}
          className={`${styles.track} ${spinningHard ? styles.trackSpinning : ''} ${spinning && !spinningHard ? styles.trackDone : ''}`}
          style={
            {
              gap: ITEM_GAP,
              filter: spinningHard ? 'blur(0.35px)' : 'none',
            } as CSSProperties
          }
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
