/** Daily open gate — wraps shared cooldown helpers. */
import { config, getDailyCooldownMs } from '../content/loader';
import { canOpenAfter, getRemainingMs } from './cooldown';

/** Bonus stack paces one open every 8h while free daily is on cooldown. */
export const BONUS_CASE_COOLDOWN_MS = 8 * 60 * 60 * 1000;

export function canOpenBonusCase(lastBonusCaseOpenAt: string | null): boolean {
  return canOpenAfter(lastBonusCaseOpenAt, BONUS_CASE_COOLDOWN_MS);
}

export function getTimeUntilBonusCase(lastBonusCaseOpenAt: string | null): number {
  return getRemainingMs(lastBonusCaseOpenAt, BONUS_CASE_COOLDOWN_MS);
}

export function canOpenDaily(
  lastDailyOpenAt: string | null,
  bonusCaseOpens = 0,
  lastBonusCaseOpenAt: string | null = null,
): boolean {
  if (config.daily.unlimitedOpens) return true;
  if (canOpenAfter(lastDailyOpenAt, getDailyCooldownMs())) return true;
  if (bonusCaseOpens <= 0) return false;
  return canOpenBonusCase(lastBonusCaseOpenAt);
}

/** True when opening will consume a bonus open rather than the daily slot. */
export function willUseBonusCaseOpen(
  lastDailyOpenAt: string | null,
  bonusCaseOpens: number,
): boolean {
  if (config.daily.unlimitedOpens) return false;
  if (!lastDailyOpenAt || bonusCaseOpens <= 0) return false;
  return getRemainingMs(lastDailyOpenAt, getDailyCooldownMs()) > 0;
}

export function getTimeUntilNextOpen(lastDailyOpenAt: string | null): number {
  if (config.daily.unlimitedOpens) return 0;
  return getRemainingMs(lastDailyOpenAt, getDailyCooldownMs());
}
