import type { DailyReward, UserProgress } from '../types';
import {
  bumpDayStats,
  isAfterMiddayUnlock,
  touchFirstActive,
} from './dayStats';
import { addBattlePassXp, xpForNewCard } from './passXp';

/** Track quest-related outcomes after a reward is applied. */
export function trackRewardOutcome(
  before: UserProgress,
  after: UserProgress,
  reward: DailyReward,
  flags: {
    usedBonus?: boolean;
    riskCase?: boolean;
    hotOrPack?: boolean;
  } = {},
): UserProgress {
  let next = touchFirstActive(after);
  const midday = isAfterMiddayUnlock(next.dayStats);

  if (flags.usedBonus) {
    next = bumpDayStats(next, { bonusCaseOpens: 1 });
    if (midday) next = bumpDayStats(next, { middayBonusOpens: 1 });
  }
  if (flags.riskCase) {
    next = bumpDayStats(next, { riskCases: 1 });
  }
  if (flags.hotOrPack) {
    if (midday) next = bumpDayStats(next, { middayHotOrPack: 1 });
  }

  if (reward.kind === 'money') {
    if (reward.amount > next.dayStats.moneyHitMax) {
      next = {
        ...next,
        dayStats: { ...next.dayStats, moneyHitMax: reward.amount },
      };
    }
    if (midday && reward.amount >= 25) {
      next = bumpDayStats(next, { middayMoneyHit25: 1 });
    }
    return next;
  }

  if (reward.kind !== 'card') return next;

  const wasNew = !before.collectedCardIds.includes(reward.card.id);
  if (wasNew) {
    next = bumpDayStats(next, { newCards: 1 });
    next = addBattlePassXp(next, xpForNewCard(reward.card.rarity));
  }

  const r = reward.card.rarity;
  if (r === 'rare' || r === 'epic' || r === 'legendary' || r === 'mythic') {
    next = bumpDayStats(next, { rarePlus: 1 });
    if (midday) next = bumpDayStats(next, { middayRarePlus: 1 });
  }
  if (r === 'epic' || r === 'legendary' || r === 'mythic') {
    next = bumpDayStats(next, { epicPlus: 1 });
  }

  return next;
}
