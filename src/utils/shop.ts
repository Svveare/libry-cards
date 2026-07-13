import type { Card, DailyReward, Rarity } from '../types';
import { getPermanentCards, getShelfById } from '../content/loader';

const RARITY_ORDER: Rarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
];

function rarityAtLeast(min: Rarity): Rarity[] {
  const idx = RARITY_ORDER.indexOf(min);
  return RARITY_ORDER.slice(Math.max(0, idx));
}

/** Random uncollected card with rarity >= min from permanent pool. */
export function pickShopCardMinRarity(
  collectedIds: string[],
  min: Rarity,
): Card | null {
  const allowed = new Set(rarityAtLeast(min));
  const collected = new Set(collectedIds);
  const pool = getPermanentCards().filter(
    (c) =>
      allowed.has(c.rarity) &&
      c.rarity !== 'secret' &&
      !collected.has(c.id),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

/** Random uncollected card from a shelf (YouTube / TikTok …). */
export function pickUncollectedFromShelf(
  shelfId: string,
  collectedIds: string[],
): Card | null {
  const shelf = getShelfById(shelfId);
  if (!shelf) return null;
  const collected = new Set(collectedIds);
  const pool = shelf.books.flatMap((b) =>
    b.pages.flatMap((p) =>
      p.cards.filter((c) => c.rarity !== 'secret' && !collected.has(c.id)),
    ),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export type ShopBuyResult =
  | { status: 'ok'; reward?: DailyReward; message?: string }
  | { status: 'case'; reward: DailyReward; price: number }
  | { status: 'chest_plus' }
  | { status: 'broke' }
  | { status: 'unknown' }
  | { status: 'empty'; message: string };
