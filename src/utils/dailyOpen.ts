/** Daily open gate — wraps shared cooldown helpers. */
import { config, getDailyCooldownMs } from '../content/loader';
import { canOpenAfter, getRemainingMs } from './cooldown';

export function canOpenDaily(
  lastDailyOpenAt: string | null,
  bonusCaseOpens = 0,
): boolean {
  if (config.daily.unlimitedOpens) return true;
  if (canOpenAfter(lastDailyOpenAt, getDailyCooldownMs())) return true;
  return bonusCaseOpens > 0;
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
