import type { GrantReward } from '../types';

export type QuestId =
  | 'open_daily'
  | 'visit_library'
  | 'open_chest'
  | 'spend_shop'
  | 'open_paid_case'
  | 'ink_today'
  | 'claim_pass_or_ach';

export interface QuestDef {
  id: QuestId;
  title: string;
  description: string;
  reward: GrantReward;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'open_daily',
    title: 'Бонус дня',
    description: 'Открой ежедневный бонус',
    reward: { kind: 'coins', amount: 12 },
  },
  {
    id: 'visit_library',
    title: 'В библиотеку',
    description: 'Открой экран библиотеки',
    reward: { kind: 'coins', amount: 8 },
  },
  {
    id: 'open_chest',
    title: 'Сундук',
    description: 'Открой бесплатный сундук или Сундук+',
    reward: { kind: 'ink', amount: 3 },
  },
  {
    id: 'spend_shop',
    title: 'В магазине',
    description: 'Потрать монеты на покупку',
    reward: { kind: 'coins', amount: 15 },
  },
  {
    id: 'open_paid_case',
    title: 'Рулетка',
    description: 'Открой платный кейс Soft / Mid / Hot',
    reward: { kind: 'bonusCase', amount: 1 },
  },
  {
    id: 'ink_today',
    title: 'Чернила дня',
    description: 'Заработай чернила или купи карту за них',
    reward: { kind: 'ink', amount: 4 },
  },
  {
    id: 'claim_pass_or_ach',
    title: 'Прогресс',
    description: 'Забери награду сезона или ачивку',
    reward: { kind: 'coins', amount: 20 },
  },
];

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function questClaimKey(questId: QuestId, day = utcDayKey()): string {
  return `${day}:${questId}`;
}

export function isSameUtcDay(iso: string | null, day = utcDayKey()): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === day;
}
