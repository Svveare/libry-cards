import type { DayStats, UserProgress } from '../types';
import { utcDayKey } from './quests';

export function emptyDayStats(day = utcDayKey()): DayStats {
  return {
    day,
    spentCoins: 0,
    paidCases: 0,
    inkEarned: 0,
    inkBuys: 0,
    passClaims: 0,
    achievementClaims: 0,
    chestOpens: 0,
    firstActiveAt: null,
    newCards: 0,
    epicPlus: 0,
    rarePlus: 0,
    bonusCaseOpens: 0,
    moneyHitMax: 0,
    riskCases: 0,
    middayBonusOpens: 0,
    middayRarePlus: 0,
    middayInkBuys: 0,
    middayMoneyHit25: 0,
    middayHotOrPack: 0,
  };
}

function pruneClaimedQuestIds(ids: string[], day: string): string[] {
  const prefix = `${day}:`;
  return ids.filter((id) => id.startsWith(prefix));
}

/** Reset dayStats when the UTC day rolls over; prune old quest claim keys. */
export function withCurrentDayStats(progress: UserProgress): UserProgress {
  const day = utcDayKey();
  const sameDay = progress.dayStats?.day === day;
  const pruned = pruneClaimedQuestIds(progress.claimedQuestIds, day);
  const claimsChanged = pruned.length !== progress.claimedQuestIds.length;

  if (sameDay && !claimsChanged) return progress;

  return {
    ...progress,
    dayStats: sameDay ? progress.dayStats : emptyDayStats(day),
    claimedQuestIds: claimsChanged ? pruned : progress.claimedQuestIds,
  };
}

export function bumpDayStats(
  progress: UserProgress,
  patch: Partial<Omit<DayStats, 'day'>>,
): UserProgress {
  const base = withCurrentDayStats(progress);
  const nextStats: DayStats = { ...base.dayStats, day: base.dayStats.day };

  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof Omit<DayStats, 'day'>;
    if (key === 'firstActiveAt') {
      if (typeof v === 'string' || v === null) {
        nextStats.firstActiveAt = v as string | null;
      }
      continue;
    }
    if (typeof v === 'number') {
      const prev = nextStats[key];
      if (typeof prev === 'number') {
        (nextStats as unknown as Record<string, number>)[key as string] =
          prev + v;
      }
    }
  }

  return { ...base, dayStats: nextStats };
}

export function touchFirstActive(progress: UserProgress): UserProgress {
  const base = withCurrentDayStats(progress);
  if (base.dayStats.firstActiveAt) return base;
  return {
    ...base,
    dayStats: {
      ...base.dayStats,
      firstActiveAt: new Date().toISOString(),
    },
  };
}

export function isAfterMiddayUnlock(stats: DayStats, now = Date.now()): boolean {
  if (!stats.firstActiveAt) return false;
  const unlock = new Date(stats.firstActiveAt).getTime() + MIDDAY_UNLOCK_MS;
  return now >= unlock;
}

export const MIDDAY_UNLOCK_MS = 5 * 60 * 60 * 1000;

export function middayUnlockRemainingMs(
  stats: DayStats,
  now = Date.now(),
): number {
  if (!stats.firstActiveAt) return MIDDAY_UNLOCK_MS;
  const unlock = new Date(stats.firstActiveAt).getTime() + MIDDAY_UNLOCK_MS;
  return Math.max(0, unlock - now);
}
