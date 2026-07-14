import type { UserProgress } from '../types';
import { config, getAllCards } from '../content/loader';

const STORAGE_PREFIX = 'libry_progress_v8_';
/** Bump this to force a full client reset for all users. */
const WIPE_FLAG = 'libry_wiped_deploy_v2';

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
    claimedQuestIds: [],
    claimedAchievementIds: [],
    visitedLibraryAt: null,
    lifetimeDailyOpens: 0,
    lifetimeChestOpens: 0,
    lifetimeInkEarned: 0,
    inkPurchases: 0,
    referralCount: 0,
    referredByUserId: null,
    referralBonusClaimed: false,
    channelConfirmedAt: null,
  };
}

/** Strip removed achievement ids from older saves. */
function sanitizeClaimed(ids: string[]): string[] {
  const alive = new Set([
    'cards_10',
    'cards_50',
    'cards_100',
    'daily_15',
    'chest_5',
    'commons_50',
    'full_book',
    'ink_50',
    'ink_buy_1',
  ]);
  return ids.filter((id) => alive.has(id));
}

/** One-time full wipe of all Libry keys when WIPE_FLAG changes. */
export function wipeProgressOnce(): void {
  try {
    if (localStorage.getItem(WIPE_FLAG) === '1') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith('libry_') &&
        !key.startsWith('libry_content_overlay') &&
        key !== WIPE_FLAG
      ) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(WIPE_FLAG, '1');
  } catch {
    // ignore
  }
}

export function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadProgress(userId: string): UserProgress {
  wipeProgressOnce();
  const defaults = defaultProgress();
  let progress: UserProgress;
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      progress = { ...defaults };
    } else {
      const parsed = JSON.parse(raw) as Partial<UserProgress>;
      progress = {
        ...defaults,
        collectedCardIds: parsed.collectedCardIds ?? [],
        lastDailyOpenAt: parsed.lastDailyOpenAt ?? null,
        lastChestOpenAt: parsed.lastChestOpenAt ?? null,
        coins: typeof parsed.coins === 'number' ? parsed.coins : defaults.coins,
        rating:
          typeof parsed.rating === 'number' ? parsed.rating : defaults.rating,
        bookTokens:
          typeof parsed.bookTokens === 'number' ? parsed.bookTokens : 0,
        ink: typeof parsed.ink === 'number' ? parsed.ink : 0,
        inkShopCardIds: Array.isArray(parsed.inkShopCardIds)
          ? parsed.inkShopCardIds
          : [],
        inkShopRolledAt: parsed.inkShopRolledAt ?? null,
        bonusCaseOpens:
          typeof parsed.bonusCaseOpens === 'number' ? parsed.bonusCaseOpens : 0,
        claimedQuestIds: Array.isArray(parsed.claimedQuestIds)
          ? parsed.claimedQuestIds
          : [],
        claimedAchievementIds: Array.isArray(parsed.claimedAchievementIds)
          ? sanitizeClaimed(parsed.claimedAchievementIds)
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
        referralCount:
          typeof parsed.referralCount === 'number' ? parsed.referralCount : 0,
        referredByUserId: parsed.referredByUserId ?? null,
        referralBonusClaimed: Boolean(parsed.referralBonusClaimed),
        channelConfirmedAt: parsed.channelConfirmedAt ?? null,
      };
    }
  } catch {
    progress = { ...defaults };
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
