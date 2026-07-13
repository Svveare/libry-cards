import { useEffect, useState } from 'react';

/**
 * Ticks remaining cooldown ms while `active` and the tab is visible.
 * Interval is stopped while the document is hidden.
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

    const tick = () => {
      setMs(getRemaining(lastAt));
    };

    const start = () => {
      if (interval != null) return;
      tick();
      interval = window.setInterval(tick, 1000);
    };

    const stop = () => {
      if (interval == null) return;
      window.clearInterval(interval);
      interval = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, lastAt, getRemaining]);

  return ms;
}
