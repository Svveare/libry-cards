import type { GrantReward } from '../types';

export const BATTLE_PASS_SEASON_ID = 's1';
export const BATTLE_PASS_LEVELS = 30;
export const BATTLE_PASS_XP_PER_LEVEL = 100;
export const BATTLE_PASS_PREMIUM_PRICE = 1500;

export const BP_XP = {
  /** Only source of Battle Pass XP — claimQuest */
  quest: 45,
} as const;

export type PassTrack = 'free' | 'premium';

export interface BattlePassLevelDef {
  level: number;
  free: GrantReward | GrantReward[];
  premium: GrantReward | GrantReward[];
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

/** 30 levels × free + premium = 60 rewards. */
export const BATTLE_PASS_LEVEL_DEFS: BattlePassLevelDef[] = [
  { level: 1, free: coins(20), premium: coins(50) },
  { level: 2, free: ink(3), premium: ink(8) },
  { level: 3, free: coins(25), premium: [coins(40), ink(4)] },
  { level: 4, free: ink(4), premium: book(1) },
  { level: 5, free: coins(35), premium: cases(1) },
  { level: 6, free: book(1), premium: card('rare') },
  { level: 7, free: ink(5), premium: [coins(60), ink(6)] },
  { level: 8, free: cases(1), premium: ink(12) },
  { level: 9, free: coins(40), premium: card('rare') },
  { level: 10, free: ink(6), premium: [book(1), cases(1)] },
  { level: 11, free: coins(45), premium: card('epic') },
  { level: 12, free: ink(7), premium: [coins(80), ink(10)] },
  { level: 13, free: cases(1), premium: book(2) },
  { level: 14, free: coins(50), premium: cases(2) },
  { level: 15, free: book(1), premium: card('epic') },
  { level: 16, free: ink(8), premium: [coins(100), ink(12)] },
  { level: 17, free: coins(55), premium: cases(2) },
  { level: 18, free: cases(1), premium: card('epic') },
  { level: 19, free: ink(10), premium: book(2) },
  { level: 20, free: coins(70), premium: [card('epic'), ink(15)] },
  { level: 21, free: coins(80), premium: card('legendary') },
  { level: 22, free: ink(12), premium: cases(2) },
  { level: 23, free: book(1), premium: [coins(120), ink(18)] },
  { level: 24, free: coins(90), premium: cases(2) },
  { level: 25, free: ink(14), premium: card('legendary') },
  { level: 26, free: cases(1), premium: book(2) },
  { level: 27, free: coins(100), premium: [ink(20), cases(2)] },
  { level: 28, free: ink(16), premium: card('legendary') },
  { level: 29, free: coins(120), premium: [coins(150), cases(2)] },
  {
    level: 30,
    free: [cases(2), coins(150)],
    premium: [card('legendary'), cases(3), coins(200)],
  },
];

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

export function defaultBattlePassProgress() {
  return {
    seasonId: BATTLE_PASS_SEASON_ID,
    xp: 0,
    premium: false,
    claimedFree: [] as number[],
    claimedPremium: [] as number[],
  };
}
