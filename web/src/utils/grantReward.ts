import type { CardRarityRoll, GrantReward, UserProgress } from '../types';
import {
  findBookForCardId,
  getBookById,
  isBookBaseComplete,
  getPermanentCards,
} from '../content/loader';

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

/** Grant +1 page per newly base-completed book not yet in claimedFullBookIds. */
export function maybeGrantFullBookPage(
  prev: UserProgress,
  next: UserProgress,
): UserProgress {
  if (next.collectedCardIds.length <= prev.collectedCardIds.length) {
    return next;
  }

  const prevSet = new Set(prev.collectedCardIds);
  const nextSet = new Set(next.collectedCardIds);
  const claimed = new Set(next.claimedFullBookIds);
  const newlyClaimed: string[] = [];

  const newCardIds = next.collectedCardIds.filter((id) => !prevSet.has(id));
  const booksToCheck = new Set<string>();
  for (const cardId of newCardIds) {
    const book = findBookForCardId(cardId);
    if (book?.enabled) booksToCheck.add(book.id);
  }

  for (const bookId of booksToCheck) {
    const book = getBookById(bookId);
    if (!book || !book.enabled || claimed.has(book.id)) continue;
    if (!isBookBaseComplete(book, nextSet)) continue;
    if (isBookBaseComplete(book, prevSet)) continue;
    newlyClaimed.push(book.id);
    claimed.add(book.id);
  }

  if (newlyClaimed.length === 0) return next;
  return {
    ...next,
    pages: next.pages + newlyClaimed.length,
    claimedFullBookIds: [...next.claimedFullBookIds, ...newlyClaimed],
  };
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
    case 'pages':
      return reward.amount === 1
        ? '+1 страница'
        : `+${reward.amount} страниц`;
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
  if (reward.kind === 'pages') {
    next.pages = prev.pages + reward.amount;
    return next;
  }
  // Legacy grant saves
  if ((reward as { kind: string }).kind === 'book') {
    const amount = (reward as { amount: number }).amount;
    next.pages = prev.pages + amount;
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
    return maybeGrantFullBookPage(prev, next);
  }

  const amount = FALLBACK_INK[reward.rarity];
  next.ink = prev.ink + amount;
  next.lifetimeInkEarned = prev.lifetimeInkEarned + amount;
  return next;
}
