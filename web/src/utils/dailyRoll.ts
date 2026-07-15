import type {
  Card,
  CaseTier,
  DailyReward,
  DailyRewardKind,
  Rarity,
} from '../types';
import { config, getPermanentCards } from '../content/loader';
import { pickWeighted } from './weighted';

/** Weights sum to 100. No mythic; ink is not a daily slot kind. */
const WEIGHTS: {
  kind: Exclude<DailyRewardKind, 'ink'>;
  weight: number;
}[] = [
  { kind: 'money', weight: 20 },
  { kind: 'common', weight: 42 },
  { kind: 'rare', weight: 22 },
  { kind: 'epic', weight: 10 },
  { kind: 'legendary', weight: 4 },
  { kind: 'book', weight: 2 },
];

type NoMoneyKind = Exclude<DailyRewardKind, 'money' | 'ink'>;

const CASE_WEIGHTS: Record<
  CaseTier,
  { kind: NoMoneyKind; weight: number }[]
> = {
  soft: [
    { kind: 'common', weight: 35 },
    { kind: 'rare', weight: 40 },
    { kind: 'epic', weight: 18 },
    { kind: 'legendary', weight: 5 },
    { kind: 'book', weight: 2 },
  ],
  mid: [
    { kind: 'common', weight: 22 },
    { kind: 'rare', weight: 40 },
    { kind: 'epic', weight: 25 },
    { kind: 'legendary', weight: 10 },
    { kind: 'book', weight: 3 },
  ],
  hot: [
    { kind: 'common', weight: 10 },
    { kind: 'rare', weight: 30 },
    { kind: 'epic', weight: 35 },
    { kind: 'legendary', weight: 22 },
    { kind: 'book', weight: 3 },
  ],
};
const RARITY_FALLBACK: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

const MONEY_AMOUNTS = [10, 25, 50, 100] as const;

export function rollMoneyAmount(): number {
  const tiers = config.daily.moneyTiers;
  const total = tiers.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const tier of tiers) {
    roll -= tier.weight;
    if (roll < 0) return tier.amount;
  }
  return tiers[0]?.amount ?? 25;
}

function pickCardOfRarity(
  rarity: Rarity,
  collected: Set<string>,
  pool: Card[],
): Card | null {
  const candidates = pool.filter(
    (c) => c.rarity === rarity && !collected.has(c.id),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

function pickCardWithFallback(
  preferred: Rarity,
  collected: Set<string>,
  pool: Card[],
): Card | null {
  const order = [preferred, ...RARITY_FALLBACK.filter((r) => r !== preferred)];
  for (const rarity of order) {
    const card = pickCardOfRarity(rarity, collected, pool);
    if (card) return card;
  }
  return null;
}

function permanentPoolNoMythic(): Card[] {
  return getPermanentCards().filter(
    (c) => c.rarity !== 'mythic' && c.rarity !== 'secret',
  );
}

/**
 * Roll daily reward. Mythic/Secret never drop from daily.
 */
export function rollDailyReward(collectedIds: string[]): DailyReward {
  const kind = pickWeighted(WEIGHTS);
  const pool = permanentPoolNoMythic();
  const collected = new Set(collectedIds);

  if (kind === 'money') {
    return { kind: 'money', amount: rollMoneyAmount() };
  }

  if (kind === 'book') {
    return { kind: 'book', tokens: 1 };
  }

  const card = pickCardWithFallback(kind as Rarity, collected, pool);
  if (card) return { kind: 'card', card };

  return { kind: 'ink', amount: 2 };
}

/** Paid case tiers: no coins; empty pool → book token. */
export function rollPaidCaseReward(
  collectedIds: string[],
  tier: CaseTier = 'mid',
): DailyReward {
  const kind = pickWeighted(CASE_WEIGHTS[tier]);
  const pool = permanentPoolNoMythic();
  const collected = new Set(collectedIds);

  if (kind === 'book') {
    return { kind: 'book', tokens: 1 };
  }

  const card = pickCardWithFallback(kind as Rarity, collected, pool);
  if (card) return { kind: 'card', card };

  return { kind: 'book', tokens: 1 };
}

/** Strip cell used for case animation (visual only). */
export interface CaseStripItem {
  id: string;
  kind: DailyRewardKind;
  label: string;
}

/** Far enough that the winner stays off-screen until late in the spin. */
export const WINNER_INDEX = 34;
const STRIP_LENGTH = 42;

function kindLabel(kind: DailyRewardKind, moneyAmount?: number): string {
  switch (kind) {
    case 'money':
      return moneyAmount != null
        ? `+${moneyAmount}`
        : `+${MONEY_AMOUNTS[Math.floor(Math.random() * MONEY_AMOUNTS.length)]}`;
    case 'book':
      return 'Книга';
    case 'ink':
      return 'Чернила';
    case 'common':
      return 'Обычная';
    case 'rare':
      return 'Редкая';
    case 'epic':
      return 'Эпик';
    case 'legendary':
      return 'Легенда';
  }
}

function rewardToStripKind(reward: DailyReward): DailyRewardKind {
  if (reward.kind === 'money') return 'money';
  if (reward.kind === 'book') return 'book';
  if (reward.kind === 'ink') return 'ink';
  return reward.card.rarity as DailyRewardKind;
}

type TeaseCell = { kind: DailyRewardKind; moneyAmount?: number };

/** “Near miss” baits next to the winner. At most one legendary neighbor. */
function pickTeaseNeighbors(
  excludeMoney: boolean,
  winnerIsMoney: boolean,
): [TeaseCell, TeaseCell] {
  // Soft pool next to money — avoids “saw legendary, got coins” after a long linger.
  const softPool: TeaseCell[] = [
    { kind: 'book' },
    { kind: 'epic' },
    { kind: 'rare' },
    { kind: 'ink' },
    { kind: 'common' },
  ];
  const hotPool: TeaseCell[] = excludeMoney
    ? [
        { kind: 'legendary' },
        { kind: 'book' },
        { kind: 'epic' },
        { kind: 'rare' },
      ]
    : [
        { kind: 'legendary' },
        { kind: 'book' },
        { kind: 'epic' },
        { kind: 'money', moneyAmount: 50 },
        { kind: 'rare' },
        { kind: 'ink' },
      ];

  const pool = winnerIsMoney ? softPool : hotPool;
  const shuffle = [...pool];
  for (let i = shuffle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffle[i], shuffle[j]] = [shuffle[j]!, shuffle[i]!];
  }

  const left = shuffle[0]!;
  let right =
    shuffle.find(
      (c) =>
        c.kind !== left.kind ||
        (c.kind === 'money' && c.moneyAmount !== left.moneyAmount),
    ) ??
    shuffle[1] ??
    left;

  // Never put legendary on both sides; never put legendary next to money winner.
  if (
    left.kind === 'legendary' &&
    right.kind === 'legendary'
  ) {
    right = softPool.find((c) => c.kind !== 'legendary') ?? { kind: 'epic' };
  }
  if (winnerIsMoney && left.kind === 'legendary') {
    return [
      softPool.find((c) => c.kind !== 'legendary') ?? { kind: 'epic' },
      right.kind === 'legendary' ? { kind: 'rare' } : right,
    ];
  }
  if (winnerIsMoney && right.kind === 'legendary') {
    right = softPool.find((c) => c.kind !== 'legendary') ?? { kind: 'rare' };
  }

  return [left, right];
}

function stripCell(
  id: string,
  kind: DailyRewardKind,
  moneyAmount?: number,
): CaseStripItem {
  return { id, kind, label: kindLabel(kind, moneyAmount) };
}

/** Labels are rarity/type only — never card names (no spoilers). */
export function buildCaseStrip(
  reward: DailyReward,
  options?: { excludeMoney?: boolean },
): CaseStripItem[] {
  const excludeMoney = options?.excludeMoney ?? false;
  const fillerKinds: DailyRewardKind[] = excludeMoney
    ? ['common', 'rare', 'epic', 'legendary', 'book']
    : ['money', 'common', 'rare', 'epic', 'legendary', 'book'];

  const [teaseLeft, teaseRight] = pickTeaseNeighbors(
    excludeMoney,
    reward.kind === 'money',
  );
  const leftIdx = WINNER_INDEX - 1;
  const rightIdx = WINNER_INDEX + 1;

  const items: CaseStripItem[] = [];

  for (let i = 0; i < STRIP_LENGTH; i++) {
    if (i === WINNER_INDEX) {
      const kind = rewardToStripKind(reward);
      const moneyAmount = reward.kind === 'money' ? reward.amount : undefined;
      items.push(stripCell(`win-${i}`, kind, moneyAmount));
      continue;
    }

    if (i === leftIdx) {
      items.push(
        stripCell(`tease-l-${i}`, teaseLeft.kind, teaseLeft.moneyAmount),
      );
      continue;
    }

    if (i === rightIdx) {
      items.push(
        stripCell(`tease-r-${i}`, teaseRight.kind, teaseRight.moneyAmount),
      );
      continue;
    }

    const kind = fillerKinds[Math.floor(Math.random() * fillerKinds.length)]!;
    items.push(stripCell(`fill-${i}-${kind}`, kind));
  }

  return items;
}

/** Lightweight idle preview strip (few cells, no winner logic). */
export function buildPreviewStrip(excludeMoney = false): CaseStripItem[] {
  const kinds: DailyRewardKind[] = excludeMoney
    ? ['common', 'rare', 'epic', 'legendary', 'book']
    : ['money', 'common', 'rare', 'epic', 'legendary', 'book'];
  return Array.from({ length: 8 }, (_, i) => {
    const kind = kinds[i % kinds.length]!;
    return { id: `prev-${i}`, kind, label: kindLabel(kind) };
  });
}
