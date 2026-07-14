import type { GrantReward } from '../types';

export const BATTLE_PASS_LEVELS = 30;
export const BATTLE_PASS_XP_PER_LEVEL = 100;
/** Reachable in ~1–2 weeks of play; Pro track worth it mid-month. */
export const BATTLE_PASS_PREMIUM_PRICE = 1000;

export const BP_XP = {
  /** Only source of Battle Pass XP — claimQuest (~2 claims ≈ 1 level). */
  quest: 50,
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

function buildLevel(level: number): BattlePassLevelDef {
  const tier = levelTier(level);

  if (tier === 'finale') {
    return {
      level,
      tier,
      free: [card('legendary'), cases(3), coins(250), ink(25), book(2)],
      premium: [
        card('legendary'),
        card('epic'),
        cases(5),
        coins(500),
        ink(40),
        book(3),
      ],
    };
  }

  if (tier === 'great') {
    // 10, 20
    return {
      level,
      tier,
      free: [card(level >= 20 ? 'epic' : 'rare'), cases(2), coins(120)],
      premium: [
        card(level >= 20 ? 'legendary' : 'epic'),
        cases(3),
        coins(200),
        ink(18),
      ],
    };
  }

  if (tier === 'plus') {
    // 5, 15, 25
    return {
      level,
      tier,
      free: [cases(1), coins(70), ink(10)],
      premium: [book(1), cases(2), coins(120), ink(14)],
    };
  }

  // Normal rung — alternating soft rewards
  const step = ((level - 1) % 4) + 1;
  if (step === 1) {
    return {
      level,
      tier,
      free: coins(25 + level),
      premium: [coins(45 + level * 2), ink(4)],
    };
  }
  if (step === 2) {
    return {
      level,
      tier,
      free: ink(3 + Math.floor(level / 5)),
      premium: ink(8 + Math.floor(level / 4)),
    };
  }
  if (step === 3) {
    return {
      level,
      tier,
      free: coins(30 + level),
      premium:
        level >= 12
          ? [coins(50 + level * 2), book(1)]
          : [coins(50 + level * 2)],
    };
  }
  return {
    level,
    tier,
    free: ink(4 + Math.floor(level / 6)),
    premium: [coins(40 + level), ink(6 + Math.floor(level / 5))],
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

export function defaultBattlePassProgress(date = new Date()) {
  return {
    seasonId: currentBattlePassSeasonId(date),
    xp: 0,
    premium: false,
    claimedFree: [] as number[],
    claimedPremium: [] as number[],
  };
}
