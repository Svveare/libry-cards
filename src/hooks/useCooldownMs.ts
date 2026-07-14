import { useEffect, useState } from 'react';

const NEAR_MS = 60_000;
const FAST_TICK_MS = 1000;
const SLOW_TICK_MS = 10_000;

/**
 * Ticks remaining cooldown ms while `active` and the tab is visible.
 * Uses 1s ticks only in the last minute; otherwise ~10s. Stops when hidden.
 */
export function useCooldownMs(
  lastAt: string | null,
  getRemaining: (lastAt: string | null) => number,
  active: boolean,
): number {
  const [ms, setMs] = useState(() => getRemaining(lastAt));

  useEffect(() => {
    setMs(getRemaining(lastAt));
  }, [lastAt, getRemaining]);

  useEffect(() => {
    if (!active) return;

    let interval: number | null = null;

    const clear = () => {
      if (interval == null) return;
      window.clearInterval(interval);
      interval = null;
    };

    const schedule = () => {
      clear();
      const remaining = getRemaining(lastAt);
      setMs(remaining);
      if (remaining <= 0) return;
      const delay = remaining <= NEAR_MS ? FAST_TICK_MS : SLOW_TICK_MS;
      interval = window.setInterval(() => {
        const next = getRemaining(lastAt);
        setMs(next);
        if (next <= 0) {
          clear();
          return;
        }
        const wantFast = next <= NEAR_MS;
        const currentFast = delay === FAST_TICK_MS;
        if (wantFast !== currentFast) {
          schedule();
        }
      }, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule();
      else clear();
    };

    if (document.visibilityState === 'visible') schedule();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clear();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, lastAt, getRemaining]);

  return ms;
}
