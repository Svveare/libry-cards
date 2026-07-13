import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CaseStripItem } from '../../utils/dailyRoll';
import { WINNER_INDEX } from '../../utils/dailyRoll';
import { REWARD_KIND_COLORS } from '../../types';
import styles from './CaseStrip.module.css';

const ITEM_WIDTH = 100;
const ITEM_GAP = 8;
const ANIM_MS = 2800;
const JITTER_INSET = 12;

interface CaseStripProps {
  items: CaseStripItem[];
  spinning: boolean;
  onSpinEnd?: () => void;
}

export function CaseStrip({ items, spinning, onSpinEnd }: CaseStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
  const endedRef = useRef(false);

  useLayoutEffect(() => {
    if (!spinning || items.length === 0) {
      setAnimate(false);
      setOffset(0);
      setSpinDone(false);
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

    setAnimate(false);
    setSpinDone(false);
    setOffset(0);
    endedRef.current = false;

    const raf = requestAnimationFrame(() => {
      setAnimate(true);
      setOffset(target);
    });

    return () => cancelAnimationFrame(raf);
  }, [spinning, items]);

  useEffect(() => {
    if (!spinning || !animate || !onSpinEnd) return;

    const timer = window.setTimeout(() => {
      if (endedRef.current) return;
      endedRef.current = true;
      setSpinDone(true);
      onSpinEnd();
    }, ANIM_MS + 60);

    return () => clearTimeout(timer);
  }, [spinning, animate, onSpinEnd]);

  return (
    <div className={styles.wrap}>
      <div className={styles.marker} aria-hidden />
      <div className={styles.viewport} ref={viewportRef}>
        <div
          className={`${styles.track} ${animate && !spinDone ? styles.trackSpinning : ''} ${spinDone ? styles.trackDone : ''}`}
          style={
            {
              transform: `translate3d(${-offset}px, 0, 0)`,
              transition: animate
                ? `transform ${ANIM_MS}ms cubic-bezier(0.05, 0.85, 0.05, 1)`
                : 'none',
              gap: ITEM_GAP,
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
