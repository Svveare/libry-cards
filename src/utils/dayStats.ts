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
  };
}

function pruneClaimedQuestIds(
  ids: string[],
  day: string,
): string[] {
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
  return {
    ...base,
    dayStats: {
      ...base.dayStats,
      ...Object.fromEntries(
        Object.entries(patch).map(([k, v]) => {
          const key = k as keyof Omit<DayStats, 'day'>;
          const prev = base.dayStats[key] ?? 0;
          return [k, prev + (typeof v === 'number' ? v : 0)];
        }),
      ),
      day: base.dayStats.day,
    },
  };
}
