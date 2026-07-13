/** Shared cooldown helpers for daily / chest timers. */

export function getRemainingMs(
  lastAt: string | null,
  cooldownMs: number,
): number {
  if (!lastAt || cooldownMs <= 0) return 0;
  const remaining = cooldownMs - (Date.now() - new Date(lastAt).getTime());
  return Math.max(0, remaining);
}

export function canOpenAfter(
  lastAt: string | null,
  cooldownMs: number,
): boolean {
  if (cooldownMs <= 0) return true;
  if (!lastAt) return true;
  return getRemainingMs(lastAt, cooldownMs) === 0;
}

export function formatCooldown(ms: number): string {
  if (ms <= 0) return '';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
