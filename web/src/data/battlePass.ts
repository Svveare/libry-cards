import type { GrantReward } from '../types';

export const BATTLE_PASS_LEVELS = 30;
/** Cost to unlock level 2 (level 1 is free). Each next step +10. */
export const BATTLE_PASS_XP_BASE = 100;
export const BATTLE_PASS_XP_STEP = 10;
/** Reachable mid-month; Pro sells cards/cases, not a coin printer. */
export const BATTLE_PASS_PREMIUM_PRICE = 1000;
/** XP past season cap between overflow rewards. */
export const BP_OVERFLOW_XP = 500;

export type PassTrack = 'free' | 'premium';

export interface BattlePassLevelDef {
  level: number;
  free: GrantReward | GrantReward[];
  premium: GrantReward | GrantReward[];
  /** UI tip: milestone / jackpot */
  tier?: 'normal' | 'plus' | 'great' | 'finale';
}

function coins(amount: number): GrantReward {
  return { kind: 'coins', amount };
}
function ink(amount: number): GrantReward {
  return { kind: 'ink', amount };
}
function pages(amount: number): GrantReward {
  return { kind: 'pages', amount };
}
function cases(amount: number): GrantReward {
  return { kind: 'bonusCase', amount };
}
function card(rarity: 'common' | 'rare' | 'epic' | 'legendary'): GrantReward {
  return { kind: 'cardRarity', rarity };
}
function choice(
  ...options: Array<GrantReward | GrantReward[]>
): GrantReward {
  return { kind: 'choice', options };
}

/** UTC month key, e.g. 2026-07 — season resets on the 1st. */
export function currentBattlePassSeasonId(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function levelTier(level: number): BattlePassLevelDef['tier'] {
  if (level === BATTLE_PASS_LEVELS) return 'finale';
  if (level % 10 === 0) return 'great';
  if (level % 5 === 0) return 'plus';
  return 'normal';
}

/**
 * Exactly 5 pages per full Free+Pro claim:
 * Free L30 + Pro L5 / L15 / L25 / L30.
 * Pro L15/L25/L30 choice stays; pages added on claim in useProgress.
 */
function buildLevel(level: number): BattlePassLevelDef {
  const tier = levelTier(level);

  if (tier === 'finale') {
    return {
      level,
      tier,
      free: [card('legendary'), cases(2), coins(120), ink(18), pages(1)],
      premium: choice(cases(5), [card('legendary'), coins(200)]),
    };
  }

  if (level === 5) {
    return {
      level,
      tier,
      free: [cases(1), coins(40), ink(8)],
      premium: [pages(1), cases(1), coins(70), ink(10)],
    };
  }

  if (level === 15) {
    return {
      level,
      tier,
      free: [cases(1), coins(40), ink(8)],
      premium: choice(cases(2), card('epic')),
    };
  }

  if (level === 25) {
    return {
      level,
      tier,
      free: [cases(1), coins(40), ink(8)],
      premium: choice(cases(3), card('legendary')),
    };
  }

  if (tier === 'great') {
    return {
      level,
      tier,
      free: [card(level >= 20 ? 'epic' : 'rare'), cases(1), coins(70)],
      premium: [
        card(level >= 20 ? 'legendary' : 'epic'),
        cases(2),
        coins(110),
        ink(12),
      ],
    };
  }

  if (tier === 'plus') {
    return {
      level,
      tier,
      free: [cases(1), coins(40), ink(8)],
      premium: [cases(1), coins(70), ink(10)],
    };
  }

  const step = ((level - 1) % 4) + 1;
  if (step === 1) {
    return {
      level,
      tier,
      free: coins(16 + level),
      premium: [coins(22 + level), ink(3)],
    };
  }
  if (step === 2) {
    return {
      level,
      tier,
      free: ink(2 + Math.floor(level / 5)),
      premium: ink(5 + Math.floor(level / 4)),
    };
  }
  if (step === 3) {
    return {
      level,
      tier,
      free: coins(18 + level),
      premium: [coins(24 + level)],
    };
  }
  return {
    level,
    tier,
    free: ink(3 + Math.floor(level / 6)),
    premium: [coins(18 + Math.floor(level / 2)), ink(4 + Math.floor(level / 5))],
  };
}

/** 30 levels × free + premium = 60 rewards. */
export const BATTLE_PASS_LEVEL_DEFS: BattlePassLevelDef[] = Array.from(
  { length: BATTLE_PASS_LEVELS },
  (_, i) => buildLevel(i + 1),
);

/** Cost to go FROM (level-1) TO level. Level 1 costs 0. */
export function xpCostToReach(level: number): number {
  if (level <= 1) return 0;
  return BATTLE_PASS_XP_BASE + (level - 2) * BATTLE_PASS_XP_STEP;
}

/** Cumulative XP required to unlock `level` (level 1 = 0). */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  let sum = 0;
  for (let L = 2; L <= level; L++) {
    sum += xpCostToReach(L);
  }
  return sum;
}

/** XP needed to reach max level (unlock L30). */
export const BP_MAX_XP = xpThresholdForLevel(BATTLE_PASS_LEVELS);

/** Pro levels that also grant +1 page on claim (in addition to listed rewards). */
export const PASS_BONUS_PAGE_PREMIUM_LEVELS = [15, 25, 30] as const;

export function battlePassLevel(xp: number): number {
  let level = 1;
  while (
    level < BATTLE_PASS_LEVELS &&
    xp >= xpThresholdForLevel(level + 1)
  ) {
    level++;
  }
  return level;
}

export function xpIntoLevel(xp: number): number {
  const level = battlePassLevel(xp);
  return xp - xpThresholdForLevel(level);
}

export function xpToNextLevel(xp: number): number {
  const level = battlePassLevel(xp);
  if (level >= BATTLE_PASS_LEVELS) return 0;
  return xpCostToReach(level + 1) - xpIntoLevel(xp);
}

/** XP required for the next level step (bar denominator). */
export function xpStepCost(xp: number): number {
  const level = battlePassLevel(xp);
  if (level >= BATTLE_PASS_LEVELS) return BP_OVERFLOW_XP;
  return xpCostToReach(level + 1);
}

export function overflowXpBanked(xp: number): number {
  return Math.max(0, xp - BP_MAX_XP);
}

export function overflowXpToNext(xp: number, claims: number): number {
  const banked = overflowXpBanked(xp);
  const nextAt = (claims + 1) * BP_OVERFLOW_XP;
  return Math.max(0, nextAt - banked);
}

export function defaultBattlePassProgress(date = new Date()) {
  return {
    seasonId: currentBattlePassSeasonId(date),
    xp: 0,
    premium: false,
    claimedFree: [] as number[],
    claimedPremium: [] as number[],
    overflowClaims: 0,
  };
}
