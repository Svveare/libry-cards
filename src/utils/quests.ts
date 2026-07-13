export type QuestId = 'open_case' | 'visit_library' | 'open_chest';

export interface QuestDef {
  id: QuestId;
  title: string;
  description: string;
  rewardCoins: number;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'open_case',
    title: 'Открой кейс',
    description: 'Получи ежедневный бонус',
    rewardCoins: 10,
  },
  {
    id: 'visit_library',
    title: 'Загляни в библиотеку',
    description: 'Открой экран библиотеки',
    rewardCoins: 8,
  },
  {
    id: 'open_chest',
    title: 'Открой сундук',
    description: 'Выбери карту из сундука',
    rewardCoins: 15,
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
