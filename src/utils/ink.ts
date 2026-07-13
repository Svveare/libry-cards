import type { Rarity } from '../types';

/** Ink gained when a duplicate card drops. */
export const INK_FROM_DUPE: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 4,
  legendary: 8,
  mythic: 12,
  secret: 12,
};

/** Ink shop purchase prices by rarity. */
export const INK_SHOP_PRICES: Record<Rarity, number> = {
  common: 8,
  rare: 18,
  epic: 36,
  legendary: 70,
  mythic: 120,
  secret: 120,
};

export const INK_SHOP_REFRESH_MS = 48 * 60 * 60 * 1000;

export const REFERRAL_INVITEE_COINS = 25;

export function inkForDupe(rarity: Rarity): number {
  return INK_FROM_DUPE[rarity] ?? 1;
}

export function inkShopPrice(rarity: Rarity): number {
  return INK_SHOP_PRICES[rarity] ?? 8;
}
