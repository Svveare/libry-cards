import type { Rarity, UserProgress } from '../types';
import {
  BP_MAX_XP,
  BP_OVERFLOW_XP,
  currentBattlePassSeasonId,
  defaultBattlePassProgress,
} from '../data/battlePass';
import { applyGrant } from './grantReward';
import { bumpDayStats, withCurrentDayStats } from './dayStats';

/** BP XP for first-time collect of a card. Dupes grant 0. */
export const XP_FOR_NEW_CARD: Record<Rarity, number> = {
  common: 10,
  rare: 25,
  epic: 40,
  legendary: 70,
  mythic: 100,
  secret: 100,
};

export function xpForNewCard(rarity: Rarity): number {
  return XP_FOR_NEW_CARD[rarity] ?? 10;
}

export function ensureBattlePass(progress: UserProgress): UserProgress {
  if (progress.battlePass?.seasonId === currentBattlePassSeasonId()) {
    return progress;
  }
  return { ...progress, battlePass: defaultBattlePassProgress() };
}

export function trackInkFromReward(
  before: UserProgress,
  after: UserProgress,
): UserProgress {
  const gained = after.lifetimeInkEarned - before.lifetimeInkEarned;
  if (gained <= 0) return after;
  return bumpDayStats(after, { inkEarned: gained });
}

/** Add battle pass XP and auto-grant overflow rewards past max. */
export function addBattlePassXp(
  progress: UserProgress,
  amount: number,
): UserProgress {
  if (amount <= 0) return progress;
  let next = ensureBattlePass(withCurrentDayStats(progress));
  next = {
    ...next,
    battlePass: {
      ...next.battlePass,
      xp: next.battlePass.xp + amount,
    },
  };

  while (
    Math.max(
      0,
      Math.floor((next.battlePass.xp - BP_MAX_XP) / BP_OVERFLOW_XP),
    ) > next.battlePass.overflowClaims
  ) {
    const before = next;
    const overflowReward = next.battlePass.premium
      ? ({ kind: 'bonusCase', amount: 1 } as const)
      : ({ kind: 'ink', amount: 8 } as const);
    next = applyGrant(next, overflowReward);
    next = trackInkFromReward(before, next);
    next = {
      ...next,
      battlePass: {
        ...next.battlePass,
        overflowClaims: next.battlePass.overflowClaims + 1,
      },
    };
  }

  return next;
}
