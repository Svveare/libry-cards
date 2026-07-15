import type { GrantReward } from '../types';

export type QuestId =
  | 'open_daily'
  | 'new_card'
  | 'pull_epic'
  | 'ink_buy'
  | 'open_chest'
  | 'risk_case'
  | 'midday_hunt';

export type MiddayHuntKind =
  | 'bonus_spin'
  | 'rare_or_better'
  | 'ink_missing'
  | 'money_hit_25'
  | 'hot_or_pack';

export interface QuestDef {
  id: QuestId;
  title: string;
  description: string;
  reward: GrantReward;
  /** Battle Pass XP on claim. */
  xp: number;
}

const MIDDAY_KINDS: MiddayHuntKind[] = [
  'bonus_spin',
  'rare_or_better',
  'ink_missing',
  'money_hit_25',
  'hot_or_pack',
];

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function middayHuntKindForDay(day = utcDayKey()): MiddayHuntKind {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  return MIDDAY_KINDS[Math.abs(h) % MIDDAY_KINDS.length]!;
}

export function middayHuntCopy(kind: MiddayHuntKind): {
  title: string;
  description: string;
} {
  switch (kind) {
    case 'bonus_spin':
      return {
        title: 'Охота: бонус-кейс',
        description: 'После разблокировки открой бонусный кейс',
      };
    case 'rare_or_better':
      return {
        title: 'Охота: редкость',
        description: 'После разблокировки выбей редкую карту или выше',
      };
    case 'ink_missing':
      return {
        title: 'Охота: чернила',
        description: 'После разблокировки купи недостающую карту за чернила',
      };
    case 'money_hit_25':
      return {
        title: 'Охота: +25',
        description: 'После разблокировки выбей монеты ≥25 в бонусе дня',
      };
    case 'hot_or_pack':
      return {
        title: 'Охота: Hot / пак',
        description:
          'После разблокировки открой Hot или пак эпик/легенда',
      };
  }
}

export const QUESTS: QuestDef[] = [
  {
    id: 'open_daily',
    title: 'Бонус дня',
    description: 'Открой ежедневный бонус',
    reward: { kind: 'coins', amount: 10 },
    xp: 28,
  },
  {
    id: 'new_card',
    title: 'Новая карта',
    description: 'Получи карту, которой ещё не было в коллекции',
    reward: { kind: 'ink', amount: 3 },
    xp: 0,
  },
  {
    id: 'pull_epic',
    title: 'Эпик или выше',
    description: 'Выбей эпическую или легендарную из крутки / сундука',
    reward: { kind: 'ink', amount: 2 },
    xp: 40,
  },
  {
    id: 'ink_buy',
    title: 'Чёрнильный зал',
    description: 'Купи карту в магазине чернил',
    reward: { kind: 'ink', amount: 4 },
    xp: 28,
  },
  {
    id: 'open_chest',
    title: 'Сундук',
    description: 'Открой бесплатный сундук или Сундук+',
    reward: { kind: 'ink', amount: 3 },
    xp: 28,
  },
  {
    id: 'risk_case',
    title: 'Риск-рулетка',
    description: 'Открой платный кейс Mid или Hot',
    reward: { kind: 'ink', amount: 5 },
    xp: 40,
  },
  {
    id: 'midday_hunt',
    title: 'Дневная охота',
    description: 'Откроется через 5 ч после первой игры за день',
    reward: { kind: 'coins', amount: 18 },
    xp: 40,
  },
];

export function questClaimKey(questId: QuestId, day = utcDayKey()): string {
  return `${day}:${questId}`;
}

export function isSameUtcDay(iso: string | null, day = utcDayKey()): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === day;
}
