import type { Card, Rarity } from '../types';
import { getPermanentCards } from '../content/loader';
import { INK_SHOP_REFRESH_MS } from './ink';

const TARGET: { rarity: Rarity | 'legend_plus'; count: number }[] = [
  { rarity: 'common', count: 2 },
  { rarity: 'rare', count: 2 },
  { rarity: 'epic', count: 1 },
  { rarity: 'legend_plus', count: 1 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pickFrom(
  pool: Card[],
  used: Set<string>,
  filter: (c: Card) => boolean,
): Card | null {
  const candidates = pool.filter((c) => !used.has(c.id) && filter(c));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

/** Up to 6 uncollected cards: 2 common / 2 rare / 1 epic / 1 legendary+. */
export function rollInkShopOffers(collectedIds: string[]): Card[] {
  const collected = new Set(collectedIds);
  const pool = getPermanentCards().filter(
    (c) => c.rarity !== 'secret' && !collected.has(c.id),
  );
  if (pool.length === 0) return [];

  const used = new Set<string>();
  const offers: Card[] = [];

  for (const slot of TARGET) {
    for (let i = 0; i < slot.count; i++) {
      let card: Card | null = null;
      if (slot.rarity === 'legend_plus') {
        card = pickFrom(
          pool,
          used,
          (c) => c.rarity === 'legendary' || c.rarity === 'mythic',
        );
        if (!card) {
          card = pickFrom(pool, used, (c) => c.rarity === 'epic');
        }
      } else {
        card = pickFrom(pool, used, (c) => c.rarity === slot.rarity);
      }
      if (!card) {
        card = pickFrom(pool, used, () => true);
      }
      if (card) {
        used.add(card.id);
        offers.push(card);
      }
    }
  }

  return shuffle(offers).slice(0, 6);
}

export function needsInkShopRefresh(
  rolledAt: string | null,
  offerIds: string[],
  collectedIds: string[],
  now = Date.now(),
): boolean {
  const collected = new Set(collectedIds);
  const stillValid = offerIds.filter((id) => !collected.has(id));
  if (stillValid.length === 0) return true;
  if (!rolledAt) return true;
  const age = now - new Date(rolledAt).getTime();
  return age >= INK_SHOP_REFRESH_MS;
}

export function inkShopRefreshRemainingMs(
  rolledAt: string | null,
  now = Date.now(),
): number {
  if (!rolledAt) return 0;
  const end = new Date(rolledAt).getTime() + INK_SHOP_REFRESH_MS;
  return Math.max(0, end - now);
}
