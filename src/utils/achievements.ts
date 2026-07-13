import type { UserProgress } from '../types';
import { getAllCards } from '../content/loader';

export type AchievementId =
  | 'cards_10'
  | 'cards_50'
  | 'cards_100'
  | 'daily_15'
  | 'chest_5'
  | 'commons_50'
  | 'full_book'
  | 'ink_50'
  | 'ink_buy_1';

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  rewardCoins: number;
}

/** One scan of the catalog for profile achievement checks. */
export function scanCollectionStats(collectedIds: string[]): {
  commons: number;
  hasFullBook: boolean;
} {
  try {
    const set = new Set(collectedIds);
    let commons = 0;
    const books = new Map<string, { total: number; got: number }>();
    for (const card of getAllCards()) {
      if (set.has(card.id) && card.rarity === 'common') commons += 1;
      const cur = books.get(card.bookId) ?? { total: 0, got: 0 };
      cur.total += 1;
      if (set.has(card.id)) cur.got += 1;
      books.set(card.bookId, cur);
    }
    let hasFullBook = false;
    for (const b of books.values()) {
      if (b.total > 0 && b.got >= b.total) {
        hasFullBook = true;
        break;
      }
    }
    return { commons, hasFullBook };
  } catch {
    return { commons: 0, hasFullBook: false };
  }
}

export function isAchievementComplete(
  id: AchievementId,
  progress: UserProgress,
  stats?: { commons: number; hasFullBook: boolean },
): boolean {
  switch (id) {
    case 'cards_10':
      return progress.collectedCardIds.length >= 10;
    case 'cards_50':
      return progress.collectedCardIds.length >= 50;
    case 'cards_100':
      return progress.collectedCardIds.length >= 100;
    case 'daily_15':
      return progress.lifetimeDailyOpens >= 15;
    case 'chest_5':
      return progress.lifetimeChestOpens >= 5;
    case 'commons_50':
      return (stats?.commons ?? 0) >= 50;
    case 'full_book':
      return Boolean(stats?.hasFullBook);
    case 'ink_50':
      return progress.lifetimeInkEarned >= 50;
    case 'ink_buy_1':
      return progress.inkPurchases >= 1;
    default:
      return false;
  }
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'cards_10',
    title: 'Первые десять',
    description: 'Собери 10 карт',
    rewardCoins: 5,
  },
  {
    id: 'cards_50',
    title: 'Полка растёт',
    description: 'Собери 50 карт',
    rewardCoins: 10,
  },
  {
    id: 'cards_100',
    title: 'Сотня',
    description: 'Собери 100 карт',
    rewardCoins: 15,
  },
  {
    id: 'daily_15',
    title: 'Ритм дня',
    description: 'Открой ежедневку 15 раз',
    rewardCoins: 10,
  },
  {
    id: 'chest_5',
    title: 'Охотник за сундуками',
    description: 'Открой сундук 5 раз',
    rewardCoins: 10,
  },
  {
    id: 'commons_50',
    title: 'Обычный запас',
    description: 'Собери 50 обычных карт',
    rewardCoins: 10,
  },
  {
    id: 'full_book',
    title: 'Книга целиком',
    description: 'Собери все карты одной книги',
    rewardCoins: 15,
  },
  {
    id: 'ink_50',
    title: 'Чернильница',
    description: 'Заработай 50 чернил за всё время',
    rewardCoins: 8,
  },
  {
    id: 'ink_buy_1',
    title: 'Переплёт',
    description: 'Купи карту за чернила',
    rewardCoins: 5,
  },
];
