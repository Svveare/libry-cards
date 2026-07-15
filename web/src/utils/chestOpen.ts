/** Chest open gate — wraps shared cooldown helpers. */
import { config, getChestCooldownMs } from '../content/loader';
import { canOpenAfter, getRemainingMs } from './cooldown';

export function canOpenChest(lastChestOpenAt: string | null): boolean {
  if (config.chest.unlimitedOpens) return true;
  return canOpenAfter(lastChestOpenAt, getChestCooldownMs());
}

export function getTimeUntilNextChest(lastChestOpenAt: string | null): number {
  if (config.chest.unlimitedOpens) return 0;
  return getRemainingMs(lastChestOpenAt, getChestCooldownMs());
}
