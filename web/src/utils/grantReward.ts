import type { CardRarityRoll, GrantReward, UserProgress } from '../types';
import { getPermanentCards } from '../content/loader';

const FALLBACK_INK: Record<CardRarityRoll, number> = {
  common: 2,
  rare: 4,
  epic: 8,
  legendary: 16,
};

function pickUncollectedOfRarity(
  rarity: CardRarityRoll,
  collected: Set<string>,
) {
  const pool = getPermanentCards().filter(
    (c) => c.rarity === rarity && !collected.has(c.id),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function normalizeGrantOption(
  opt: GrantReward | GrantReward[],
): GrantReward[] {
  return Array.isArray(opt) ? opt : [opt];
}

export function formatGrantReward(reward: GrantReward): string {
  switch (reward.kind) {
    case 'coins':
      return `+${reward.amount} монет`;
    case 'ink':
      return `+${reward.amount} чернил`;
    case 'book':
      return `+${reward.amount} токен${reward.amount === 1 ? '' : 'а'} книги`;
    case 'bonusCase':
      return `+${reward.amount} бонус-кейс${reward.amount === 1 ? '' : 'а'}`;
    case 'cardRarity': {
      const labels: Record<CardRarityRoll, string> = {
        common: 'обычная карта',
        rare: 'редкая карта',
        epic: 'эпик карта',
        legendary: 'легенда',
      };
      return labels[reward.rarity];
    }
    case 'choice':
      return 'выбор награды';
  }
}

export function formatGrantList(rewards: GrantReward[]): string {
  return rewards.map(formatGrantReward).join(' · ');
}

/** Apply one or more grant rewards onto progress. */
export function applyGrant(
  prev: UserProgress,
  reward: GrantReward | GrantReward[],
): UserProgress {
  const list = Array.isArray(reward) ? reward : [reward];
  let next = { ...prev };
  for (const r of list) {
    next = applyOne(next, r);
  }
  return next;
}

function applyOne(prev: UserProgress, reward: GrantReward): UserProgress {
  if (reward.kind === 'choice') {
    return prev;
  }
  const next = { ...prev };
  if (reward.kind === 'coins') {
    next.coins = prev.coins + reward.amount;
    return next;
  }
  if (reward.kind === 'ink') {
    next.ink = prev.ink + reward.amount;
    next.lifetimeInkEarned = prev.lifetimeInkEarned + reward.amount;
    return next;
  }
  if (reward.kind === 'book') {
    next.bookTokens = prev.bookTokens + reward.amount;
    return next;
  }
  if (reward.kind === 'bonusCase') {
    next.bonusCaseOpens = prev.bonusCaseOpens + reward.amount;
    return next;
  }

  const collected = new Set(prev.collectedCardIds);
  const card = pickUncollectedOfRarity(reward.rarity, collected);
  if (card) {
    next.collectedCardIds = [...prev.collectedCardIds, card.id];
    next.rating = prev.rating + 1;
    return next;
  }

  const amount = FALLBACK_INK[reward.rarity];
  next.ink = prev.ink + amount;
  next.lifetimeInkEarned = prev.lifetimeInkEarned + amount;
  return next;
}
