import type { GrantReward, UserProgress } from '../types';
import { getAllCards, getShelfById } from '../content/loader';
import { formatGrantReward } from './grantReward';

export type AchievementId =
  | 'cards_10'
  | 'cards_50'
  | 'cards_100'
  | 'streak_7'
  | 'streak_30'
  | 'daily_15'
  | 'daily_30'
  | 'chest_5'
  | 'chest_15'
  | 'commons_50'
  | 'full_book'
  | 'full_shelf'
  | 'ink_50'
  | 'ink_buy_1'
  | 'paid_cases_5'
  | 'epics_5'
  | 'legendary_1'
  | 'pass_pro'
  | 'referrals_3';

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  reward: GrantReward;
}

/** One scan of the catalog for profile achievement checks. */
export function scanCollectionStats(collectedIds: string[]): {
  commons: number;
  epics: number;
  legendaries: number;
  hasFullBook: boolean;
  hasFullShelf: boolean;
} {
  try {
    const set = new Set(collectedIds);
    let commons = 0;
    let epics = 0;
    let legendaries = 0;
    const books = new Map<string, { total: number; got: number }>();
    const shelves = new Map<string, { total: number; got: number }>();

    for (const card of getAllCards()) {
      if (set.has(card.id)) {
        if (card.rarity === 'common') commons += 1;
        if (card.rarity === 'epic') epics += 1;
        if (card.rarity === 'legendary') legendaries += 1;
      }
      const book = books.get(card.bookId) ?? { total: 0, got: 0 };
      book.total += 1;
      if (set.has(card.id)) book.got += 1;
      books.set(card.bookId, book);

      const shelf = shelves.get(card.shelfId) ?? { total: 0, got: 0 };
      shelf.total += 1;
      if (set.has(card.id)) shelf.got += 1;
      shelves.set(card.shelfId, shelf);
    }

    let hasFullBook = false;
    for (const b of books.values()) {
      if (b.total > 0 && b.got >= b.total) {
        hasFullBook = true;
        break;
      }
    }

    let hasFullShelf = false;
    for (const [shelfId, s] of shelves) {
      if (s.total <= 0 || s.got < s.total) continue;
      if (getShelfById(shelfId)) {
        hasFullShelf = true;
        break;
      }
    }

    return { commons, epics, legendaries, hasFullBook, hasFullShelf };
  } catch {
    return {
      commons: 0,
      epics: 0,
      legendaries: 0,
      hasFullBook: false,
      hasFullShelf: false,
    };
  }
}

export function isAchievementComplete(
  id: AchievementId,
  progress: UserProgress,
  stats?: ReturnType<typeof scanCollectionStats>,
): boolean {
  switch (id) {
    case 'cards_10':
      return progress.collectedCardIds.length >= 10;
    case 'cards_50':
      return progress.collectedCardIds.length >= 50;
    case 'cards_100':
      return progress.collectedCardIds.length >= 100;
    case 'streak_7':
      return progress.dailyStreak >= 7;
    case 'streak_30':
      return progress.dailyStreak >= 30;
    case 'daily_15':
      return progress.lifetimeDailyOpens >= 15;
    case 'daily_30':
      return progress.lifetimeDailyOpens >= 30;
    case 'chest_5':
      return progress.lifetimeChestOpens >= 5;
    case 'chest_15':
      return progress.lifetimeChestOpens >= 15;
    case 'commons_50':
      return (stats?.commons ?? 0) >= 50;
    case 'full_book':
      return Boolean(stats?.hasFullBook);
    case 'full_shelf':
      return Boolean(stats?.hasFullShelf);
    case 'ink_50':
      return progress.lifetimeInkEarned >= 50;
    case 'ink_buy_1':
      return progress.inkPurchases >= 1;
    case 'paid_cases_5':
      return progress.lifetimePaidCases >= 5;
    case 'epics_5':
      return (stats?.epics ?? 0) >= 5;
    case 'legendary_1':
      return (stats?.legendaries ?? 0) >= 1;
    case 'pass_pro':
      return progress.battlePass.premium;
    case 'referrals_3':
      return progress.referralCount >= 3;
    default:
      return false;
  }
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'cards_10',
    title: 'Первые десять',
    description: 'Собери 10 карт',
    reward: { kind: 'coins', amount: 15 },
  },
  {
    id: 'cards_50',
    title: 'Полка растёт',
    description: 'Собери 50 карт',
    reward: { kind: 'coins', amount: 40 },
  },
  {
    id: 'cards_100',
    title: 'Сотня',
    description: 'Собери 100 карт',
    reward: { kind: 'bonusCase', amount: 1 },
  },
  {
    id: 'streak_7',
    title: 'Неделя огня',
    description: 'Держи серию ежедневки 7 дней',
    reward: { kind: 'bonusCase', amount: 1 },
  },
  {
    id: 'streak_30',
    title: 'Месяц ритма',
    description: 'Серия ежедневки 30 дней',
    reward: { kind: 'bonusCase', amount: 2 },
  },
  {
    id: 'daily_15',
    title: 'Ритм дня',
    description: 'Открой ежедневку 15 раз',
    reward: { kind: 'coins', amount: 25 },
  },
  {
    id: 'daily_30',
    title: 'Постоянство',
    description: 'Открой ежедневку 30 раз',
    reward: { kind: 'ink', amount: 12 },
  },
  {
    id: 'chest_5',
    title: 'Охотник',
    description: 'Открой сундук 5 раз',
    reward: { kind: 'coins', amount: 20 },
  },
  {
    id: 'chest_15',
    title: 'Сундучный мастер',
    description: 'Открой сундук 15 раз',
    reward: { kind: 'book', amount: 1 },
  },
  {
    id: 'commons_50',
    title: 'Обычный запас',
    description: 'Собери 50 обычных карт',
    reward: { kind: 'ink', amount: 10 },
  },
  {
    id: 'full_book',
    title: 'Книга целиком',
    description: 'Собери все карты одной книги',
    reward: { kind: 'coins', amount: 50 },
  },
  {
    id: 'full_shelf',
    title: 'Полка закрыта',
    description: 'Собери все карты одной полки',
    reward: { kind: 'bonusCase', amount: 1 },
  },
  {
    id: 'ink_50',
    title: 'Чернильница',
    description: 'Заработай 50 чернил за всё время',
    reward: { kind: 'coins', amount: 20 },
  },
  {
    id: 'ink_buy_1',
    title: 'Переплёт',
    description: 'Купи карту за чернила',
    reward: { kind: 'ink', amount: 5 },
  },
  {
    id: 'paid_cases_5',
    title: 'Рулетчик',
    description: 'Открой 5 платных кейсов',
    reward: { kind: 'coins', amount: 35 },
  },
  {
    id: 'epics_5',
    title: 'Эпический вкус',
    description: 'Собери 5 эпических карт',
    reward: { kind: 'ink', amount: 15 },
  },
  {
    id: 'legendary_1',
    title: 'Легенда в руках',
    description: 'Добыть первую легендарную карту',
    reward: { kind: 'bonusCase', amount: 1 },
  },
  {
    id: 'pass_pro',
    title: 'Пропуск Pro',
    description: 'Купи Pro-трек сезона',
    reward: { kind: 'coins', amount: 100 },
  },
  {
    id: 'referrals_3',
    title: 'Дружеский круг',
    description: 'Пригласи 3 друзей',
    reward: { kind: 'bonusCase', amount: 1 },
  },
];

export function achievementRewardLabel(def: AchievementDef): string {
  return formatGrantReward(def.reward);
}

export const ALL_ACHIEVEMENT_IDS: AchievementId[] = ACHIEVEMENTS.map((a) => a.id);
