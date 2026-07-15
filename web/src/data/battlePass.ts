import type { GrantReward } from '../types';

export const BATTLE_PASS_LEVELS = 30;
export const BATTLE_PASS_XP_PER_LEVEL = 100;
/** Reachable mid-month; Pro sells cards/cases, not a coin printer. */
export const BATTLE_PASS_PREMIUM_PRICE = 1000;
/** XP past season cap between overflow rewards. */
export const BP_OVERFLOW_XP = 500;

export const BP_XP = {
  /** Default XP when claiming a simple quest. Hard/midday use quest.xp. */
  quest: 35,
} as const;

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
function book(amount: number): GrantReward {
  return { kind: 'book', amount };
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

/** @deprecated use currentBattlePassSeasonId — kept for storage migration reads */
export const BATTLE_PASS_SEASON_ID = currentBattlePassSeasonId();

function levelTier(level: number): BattlePassLevelDef['tier'] {
  if (level === BATTLE_PASS_LEVELS) return 'finale';
  if (level % 10 === 0) return 'great';
  if (level % 5 === 0) return 'plus';
  return 'normal';
}

/**
 * Target season totals (approx):
 * Free ~850c + 5–6 cases; Premium ~950c + ~10 cases + cards.
 */
function buildLevel(level: number): BattlePassLevelDef {
  const tier = levelTier(level);

  if (tier === 'finale') {
    return {
      level,
      tier,
      free: [card('legendary'), cases(2), coins(120), ink(18), book(1)],
      premium: choice(cases(5), [card('legendary'), coins(200)]),
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
      premium: [book(1), cases(1), coins(70), ink(10)],
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
      premium:
        level >= 12
          ? [coins(24 + level), book(1)]
          : [coins(24 + level)],
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

export function battlePassLevel(xp: number): number {
  return Math.min(
    BATTLE_PASS_LEVELS,
    Math.floor(xp / BATTLE_PASS_XP_PER_LEVEL),
  );
}

export function xpIntoLevel(xp: number): number {
  if (battlePassLevel(xp) >= BATTLE_PASS_LEVELS) return BATTLE_PASS_XP_PER_LEVEL;
  return xp % BATTLE_PASS_XP_PER_LEVEL;
}

export function xpToNextLevel(xp: number): number {
  if (battlePassLevel(xp) >= BATTLE_PASS_LEVELS) return 0;
  return BATTLE_PASS_XP_PER_LEVEL - xpIntoLevel(xp);
}

const BP_MAX_XP = BATTLE_PASS_LEVELS * BATTLE_PASS_XP_PER_LEVEL;

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
