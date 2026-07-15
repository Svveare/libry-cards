import type { Card, ChestVariant, DailyReward, Rarity } from '../types';
import {
  getPermanentCards,
  getUnlockedSecretCards,
} from '../content/loader';
import { rollMoneyAmount } from './dailyRoll';
import { inkForDupe } from './ink';
import { pickWeighted } from './weighted';

/** Free 48h chest: softer + money slots (~8%). */
const FREE_WEIGHTS: { kind: Rarity; weight: number }[] = [
  { kind: 'rare', weight: 50 },
  { kind: 'epic', weight: 28 },
  { kind: 'legendary', weight: 10 },
  { kind: 'mythic', weight: 2 },
];

const FREE_MONEY_SLOT_CHANCE = 0.08;
const FREE_PAGES_SLOT_CHANCE = 0.015;
const PLUS_PAGES_SLOT_CHANCE = 0.025;
/** Chest+ only: chance a slot rolls an unlocked secret card (~6%, under mythic ~8%). */
const PLUS_SECRET_SLOT_CHANCE = 0.06;

/** Chest+: no money, stronger. */
const PLUS_WEIGHTS: { kind: Rarity; weight: number }[] = [
  { kind: 'rare', weight: 22 },
  { kind: 'epic', weight: 38 },
  { kind: 'legendary', weight: 32 },
  { kind: 'mythic', weight: 8 },
];

export type ChestSlot =
  | { type: 'card'; card: Card; grantsCard: boolean }
  | { type: 'money'; amount: number }
  | { type: 'pages'; amount: number };

function pickFromPool(pool: Card[], excludeIds: Set<string>): Card | null {
  const candidates = pool.filter((c) => !excludeIds.has(c.id));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

function rollCardSlot(
  collected: Set<string>,
  used: Set<string>,
  weights: { kind: Rarity; weight: number }[],
  pool: Card[],
  uncollected: Card[],
): ChestSlot | null {
  const rarity = pickWeighted(weights);
  const uncollectedOfRarity = uncollected.filter(
    (c) => c.rarity === rarity && !used.has(c.id),
  );

  let card =
    uncollectedOfRarity.length > 0
      ? uncollectedOfRarity[
          Math.floor(Math.random() * uncollectedOfRarity.length)
        ]!
      : pickFromPool(uncollected, used);

  let grantsCard = true;
  if (!card) {
    card = pickFromPool(pool, used);
    grantsCard = false;
  } else if (collected.has(card.id)) {
    grantsCard = false;
  }

  if (!card) return null;
  used.add(card.id);
  return { type: 'card', card, grantsCard };
}

function rollSecretSlot(
  collected: Set<string>,
  used: Set<string>,
  unlockedSecretBookIds: string[],
): ChestSlot | null {
  const secretPool = getUnlockedSecretCards(unlockedSecretBookIds).filter(
    (c) => !used.has(c.id),
  );
  if (secretPool.length === 0) return null;
  const preferUncollected = secretPool.filter((c) => !collected.has(c.id));
  const pool =
    preferUncollected.length > 0 ? preferUncollected : secretPool;
  const card = pool[Math.floor(Math.random() * pool.length)]!;
  used.add(card.id);
  return {
    type: 'card',
    card,
    grantsCard: !collected.has(card.id),
  };
}

export function rollChestSlots(
  collectedIds: string[],
  variant: ChestVariant = 'free',
  unlockedSecretBookIds: string[] = [],
): ChestSlot[] {
  const collected = new Set(collectedIds);
  const pool = getPermanentCards().filter((c) => c.rarity !== 'secret');
  const uncollected = pool.filter((c) => !collected.has(c.id));
  const used = new Set<string>();
  const slots: ChestSlot[] = [];
  const weights = variant === 'plus' ? PLUS_WEIGHTS : FREE_WEIGHTS;
  const allowMoney = variant === 'free';
  const pagesChance =
    variant === 'plus' ? PLUS_PAGES_SLOT_CHANCE : FREE_PAGES_SLOT_CHANCE;

  for (let i = 0; i < 4; i++) {
    if (Math.random() < pagesChance) {
      slots.push({ type: 'pages', amount: 1 });
      continue;
    }

    if (allowMoney && Math.random() < FREE_MONEY_SLOT_CHANCE) {
      slots.push({ type: 'money', amount: rollMoneyAmount() });
      continue;
    }

    if (variant === 'plus' && Math.random() < PLUS_SECRET_SLOT_CHANCE) {
      const secretSlot = rollSecretSlot(
        collected,
        used,
        unlockedSecretBookIds,
      );
      if (secretSlot) {
        slots.push(secretSlot);
        continue;
      }
    }

    const slot = rollCardSlot(collected, used, weights, pool, uncollected);
    if (slot) slots.push(slot);
  }

  while (slots.length < 4 && pool.length > 0) {
    const card = pool[slots.length % pool.length]!;
    if (!used.has(card.id)) used.add(card.id);
    slots.push({
      type: 'card',
      card,
      grantsCard: !collected.has(card.id),
    });
  }

  return slots.slice(0, 4);
}

export function resolveChestPick(slot: ChestSlot): DailyReward {
  if (slot.type === 'money') {
    return { kind: 'money', amount: slot.amount };
  }
  if (slot.type === 'pages') {
    return { kind: 'pages', amount: slot.amount };
  }
  if (slot.grantsCard) {
    return { kind: 'card', card: slot.card };
  }
  return { kind: 'ink', amount: inkForDupe(slot.card.rarity) };
}
