import type { Rarity } from '../types';

/** Ink gained when a duplicate card drops. */
export const INK_FROM_DUPE: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 4,
  legendary: 8,
  mythic: 12,
  secret: 48,
};

/** Ink shop purchase prices by rarity. */
export const INK_SHOP_PRICES: Record<Rarity, number> = {
  common: 8,
  rare: 18,
  epic: 36,
  legendary: 70,
  mythic: 120,
  secret: 200,
};

export const INK_SHOP_REFRESH_MS = 24 * 60 * 60 * 1000;

export const REFERRAL_INVITEE_COINS = 25;

export type InkCatalogItemId =
  | 'coins25'
  | 'bonus1'
  | 'bonus2'
  | 'resetChest';

export type InkCatalogKind = 'coins' | 'bonusCase' | 'resetChest';

export interface InkCatalogItem {
  id: InkCatalogItemId;
  price: number;
  label: string;
  kind: InkCatalogKind;
  amount?: number;
}

export const INK_CATALOG: InkCatalogItem[] = [
  { id: 'coins25', price: 40, label: '+25 монет', kind: 'coins', amount: 25 },
  {
    id: 'bonus1',
    price: 70,
    label: '+1 бонус-кейс',
    kind: 'bonusCase',
    amount: 1,
  },
  {
    id: 'bonus2',
    price: 120,
    label: '+2 бонус-кейса',
    kind: 'bonusCase',
    amount: 2,
  },
  {
    id: 'resetChest',
    price: 90,
    label: 'Сброс ожидания сундука',
    kind: 'resetChest',
  },
];

export function inkForDupe(rarity: Rarity): number {
  return INK_FROM_DUPE[rarity] ?? 1;
}

export function inkShopPrice(rarity: Rarity): number {
  return INK_SHOP_PRICES[rarity] ?? 8;
}
