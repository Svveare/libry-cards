import type { UserProgress } from '../types';
import { applyGrant } from './grantReward';
import { utcDayKey } from './quests';

export const STREAK_MILESTONES = [3, 7, 14, 30] as const;

/** Bonus case opens granted at each streak milestone. */
export const STREAK_REWARDS: Record<number, number> = {
  3: 1,
  7: 1,
  14: 2,
  30: 3,
};

function yesterdayKey(day = utcDayKey()): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Tick streak once per UTC day on daily open.
 * Returns updated progress and newly granted milestone days.
 */
export function tickDailyStreak(progress: UserProgress): {
  progress: UserProgress;
  newlyClaimed: number[];
} {
  const today = utcDayKey();
  if (progress.dailyStreakLastDate === today) {
    return { progress, newlyClaimed: [] };
  }

  let streak = 1;
  let claimed = [...progress.claimedStreakMilestones];

  if (progress.dailyStreakLastDate === yesterdayKey(today)) {
    streak = progress.dailyStreak + 1;
  } else {
    claimed = [];
  }

  let next: UserProgress = {
    ...progress,
    dailyStreak: streak,
    dailyStreakLastDate: today,
    claimedStreakMilestones: claimed,
  };

  const newlyClaimed: number[] = [];
  for (const m of STREAK_MILESTONES) {
    if (streak >= m && !claimed.includes(m)) {
      const cases = STREAK_REWARDS[m] ?? 1;
      next = applyGrant(next, { kind: 'bonusCase', amount: cases });
      claimed = [...claimed, m];
      newlyClaimed.push(m);
    }
  }

  next = { ...next, claimedStreakMilestones: claimed };
  return { progress: next, newlyClaimed };
}
