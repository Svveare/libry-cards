import type { BattlePassProgress, DayStats, UserProgress } from '../types';
import { config, getAllCards } from '../content/loader';
import { ALL_ACHIEVEMENT_IDS } from './achievements';
import { defaultBattlePassProgress, currentBattlePassSeasonId } from '../data/battlePass';
import { emptyDayStats, withCurrentDayStats } from './dayStats';
import { utcDayKey } from './quests';

const STORAGE_PREFIX = 'libry_progress_v9_';
/** Bump this to force a full client reset for all users. */
const WIPE_FLAG = 'libry_wiped_deploy_v3';
/** After wipe, force one push of defaults so Bothost doesn't restore old snapshot. */
const FORCE_PUSH_DEFAULTS_KEY = 'libry_force_push_defaults';

let wipedThisSession = false;

function defaultDayStats(): DayStats {
  return emptyDayStats(utcDayKey());
}

function defaultProgress(): UserProgress {
  return {
    collectedCardIds: [],
    lastDailyOpenAt: null,
    lastChestOpenAt: null,
    coins: config.defaults.startingCoins,
    rating: 0,
    bookTokens: 0,
    ink: 0,
    inkShopCardIds: [],
    inkShopRolledAt: null,
    bonusCaseOpens: 0,
    lastBonusCaseOpenAt: null,
    claimedQuestIds: [],
    claimedAchievementIds: [],
    appliedClaimIds: [],
    visitedLibraryAt: null,
    lifetimeDailyOpens: 0,
    lifetimeChestOpens: 0,
    lifetimeInkEarned: 0,
    inkPurchases: 0,
    lifetimePaidCases: 0,
    referralCount: 0,
    referredByUserId: null,
    referralBonusClaimed: false,
    channelConfirmedAt: null,
    dailyStreak: 0,
    dailyStreakLastDate: null,
    claimedStreakMilestones: [],
    dayStats: defaultDayStats(),
    battlePass: defaultBattlePassProgress(),
  };
}

function sanitizeClaimed(ids: string[]): string[] {
  const alive = new Set<string>(ALL_ACHIEVEMENT_IDS);
  return ids.filter((id) => alive.has(id));
}

function parseBattlePass(raw: unknown): BattlePassProgress {
  const base = defaultBattlePassProgress();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Partial<BattlePassProgress>;
  const seasonId = typeof p.seasonId === 'string' ? p.seasonId : '';
  if (seasonId !== currentBattlePassSeasonId()) return base;
  return {
    seasonId: currentBattlePassSeasonId(),
    xp: typeof p.xp === 'number' ? p.xp : 0,
    premium: Boolean(p.premium),
    claimedFree: Array.isArray(p.claimedFree)
      ? p.claimedFree.filter((n) => typeof n === 'number')
      : [],
    claimedPremium: Array.isArray(p.claimedPremium)
      ? p.claimedPremium.filter((n) => typeof n === 'number')
      : [],
  };
}

function parseDayStats(raw: unknown): DayStats {
  const empty = defaultDayStats();
  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Partial<DayStats>;
  if (typeof d.day !== 'string') return empty;
  return {
    day: d.day,
    spentCoins: typeof d.spentCoins === 'number' ? d.spentCoins : 0,
    paidCases: typeof d.paidCases === 'number' ? d.paidCases : 0,
    inkEarned: typeof d.inkEarned === 'number' ? d.inkEarned : 0,
    inkBuys: typeof d.inkBuys === 'number' ? d.inkBuys : 0,
    passClaims: typeof d.passClaims === 'number' ? d.passClaims : 0,
    achievementClaims:
      typeof d.achievementClaims === 'number' ? d.achievementClaims : 0,
    chestOpens: typeof d.chestOpens === 'number' ? d.chestOpens : 0,
    firstActiveAt:
      typeof d.firstActiveAt === 'string' ? d.firstActiveAt : null,
    newCards: typeof d.newCards === 'number' ? d.newCards : 0,
    epicPlus: typeof d.epicPlus === 'number' ? d.epicPlus : 0,
    rarePlus: typeof d.rarePlus === 'number' ? d.rarePlus : 0,
    bonusCaseOpens: typeof d.bonusCaseOpens === 'number' ? d.bonusCaseOpens : 0,
    moneyHitMax: typeof d.moneyHitMax === 'number' ? d.moneyHitMax : 0,
    riskCases: typeof d.riskCases === 'number' ? d.riskCases : 0,
    middayBonusOpens:
      typeof d.middayBonusOpens === 'number' ? d.middayBonusOpens : 0,
    middayRarePlus: typeof d.middayRarePlus === 'number' ? d.middayRarePlus : 0,
    middayInkBuys: typeof d.middayInkBuys === 'number' ? d.middayInkBuys : 0,
    middayMoneyHit25:
      typeof d.middayMoneyHit25 === 'number' ? d.middayMoneyHit25 : 0,
    middayHotOrPack:
      typeof d.middayHotOrPack === 'number' ? d.middayHotOrPack : 0,
  };
}

/** One-time full wipe of all Libry keys when WIPE_FLAG changes. */
function wipeProgressOnce(): void {
  try {
    if (localStorage.getItem(WIPE_FLAG) === '1') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith('libry_') &&
        !key.startsWith('libry_content_overlay') &&
        key !== WIPE_FLAG &&
        key !== FORCE_PUSH_DEFAULTS_KEY
      ) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(WIPE_FLAG, '1');
    localStorage.setItem(FORCE_PUSH_DEFAULTS_KEY, '1');
    wipedThisSession = true;
  } catch {
    // ignore
  }
}

export function wasProgressWipedThisSession(): boolean {
  return wipedThisSession;
}

export function consumeForcePushDefaults(): boolean {
  try {
    if (localStorage.getItem(FORCE_PUSH_DEFAULTS_KEY) !== '1') return false;
    localStorage.removeItem(FORCE_PUSH_DEFAULTS_KEY);
    return true;
  } catch {
    return false;
  }
}

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function normalizeProgress(
  parsed: Partial<UserProgress> | null | undefined,
): UserProgress {
  const defaults = defaultProgress();
  if (!parsed) return withCurrentDayStats({ ...defaults });
  return withCurrentDayStats({
    ...defaults,
    collectedCardIds: parsed.collectedCardIds ?? [],
    lastDailyOpenAt: parsed.lastDailyOpenAt ?? null,
    lastChestOpenAt: parsed.lastChestOpenAt ?? null,
    coins: typeof parsed.coins === 'number' ? parsed.coins : defaults.coins,
    rating: typeof parsed.rating === 'number' ? parsed.rating : defaults.rating,
    bookTokens: typeof parsed.bookTokens === 'number' ? parsed.bookTokens : 0,
    ink: typeof parsed.ink === 'number' ? parsed.ink : 0,
    inkShopCardIds: Array.isArray(parsed.inkShopCardIds)
      ? parsed.inkShopCardIds
      : [],
    inkShopRolledAt: parsed.inkShopRolledAt ?? null,
    bonusCaseOpens:
      typeof parsed.bonusCaseOpens === 'number' ? parsed.bonusCaseOpens : 0,
    lastBonusCaseOpenAt: parsed.lastBonusCaseOpenAt ?? null,
    claimedQuestIds: Array.isArray(parsed.claimedQuestIds)
      ? parsed.claimedQuestIds
      : [],
    claimedAchievementIds: Array.isArray(parsed.claimedAchievementIds)
      ? sanitizeClaimed(parsed.claimedAchievementIds)
      : [],
    appliedClaimIds: Array.isArray(parsed.appliedClaimIds)
      ? parsed.appliedClaimIds.filter((id): id is string => typeof id === 'string')
      : [],
    visitedLibraryAt: parsed.visitedLibraryAt ?? null,
    lifetimeDailyOpens:
      typeof parsed.lifetimeDailyOpens === 'number'
        ? parsed.lifetimeDailyOpens
        : 0,
    lifetimeChestOpens:
      typeof parsed.lifetimeChestOpens === 'number'
        ? parsed.lifetimeChestOpens
        : 0,
    lifetimeInkEarned:
      typeof parsed.lifetimeInkEarned === 'number'
        ? parsed.lifetimeInkEarned
        : 0,
    inkPurchases:
      typeof parsed.inkPurchases === 'number' ? parsed.inkPurchases : 0,
    lifetimePaidCases:
      typeof parsed.lifetimePaidCases === 'number'
        ? parsed.lifetimePaidCases
        : 0,
    referralCount:
      typeof parsed.referralCount === 'number' ? parsed.referralCount : 0,
    referredByUserId: parsed.referredByUserId ?? null,
    referralBonusClaimed: Boolean(parsed.referralBonusClaimed),
    channelConfirmedAt: parsed.channelConfirmedAt ?? null,
    dailyStreak: typeof parsed.dailyStreak === 'number' ? parsed.dailyStreak : 0,
    dailyStreakLastDate: parsed.dailyStreakLastDate ?? null,
    claimedStreakMilestones: Array.isArray(parsed.claimedStreakMilestones)
      ? parsed.claimedStreakMilestones.filter((n) => typeof n === 'number')
      : [],
    dayStats: parseDayStats(parsed.dayStats),
    battlePass: parseBattlePass(parsed.battlePass),
  });
}

export function loadProgress(userId: string): UserProgress {
  wipeProgressOnce();
  let progress: UserProgress;
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      progress = normalizeProgress(null);
    } else {
      progress = normalizeProgress(JSON.parse(raw) as Partial<UserProgress>);
    }
  } catch {
    progress = normalizeProgress(null);
  }

  if (import.meta.env.DEV && config.dev?.grantAllCards) {
    try {
      const allIds = getAllCards().map((card) => card.id);
      progress = {
        ...progress,
        collectedCardIds: allIds,
        rating: Math.max(progress.rating, allIds.length),
      };
      saveProgress(userId, progress);
    } catch {
      // content.json may still be loading
    }
  }

  return progress;
}

export function saveProgress(userId: string, progress: UserProgress): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(progress));
}
