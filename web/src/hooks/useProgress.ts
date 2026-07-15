import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Card,
  CaseTier,
  ChestVariant,
  DailyReward,
  ShopItemAction,
  ShopItemId,
  UserProgress,
} from '../types';
import { config, canAccessChannelFeature, getCardById } from '../content/loader';
import { loadProgress, normalizeProgress, saveProgress, wasProgressWipedThisSession } from '../utils/storage';
import { canOpenDaily, willUseBonusCaseOpen } from '../utils/dailyOpen';
import { rollDailyReward, rollPaidCaseReward } from '../utils/dailyRoll';
import { canOpenChest } from '../utils/chestOpen';
import {
  pickShopCardMinRarity,
  pickUncollectedFromShelf,
  type ShopBuyResult,
} from '../utils/shop';
import {
  isSameUtcDay,
  middayHuntKindForDay,
  QUESTS,
  questClaimKey,
  type QuestId,
} from '../utils/quests';
import {
  INK_CATALOG,
  inkForDupe,
  inkShopPrice,
  REFERRAL_INVITEE_COINS,
  type InkCatalogItemId,
} from '../utils/ink';
import { needsInkShopRefresh, rollInkShopOffers } from '../utils/inkShop';
import {
  ACHIEVEMENTS,
  isAchievementComplete,
  scanCollectionStats,
  type AchievementId,
} from '../utils/achievements';
import { applyGrant, maybeGrantFullBookPage, normalizeGrantOption } from '../utils/grantReward';
import {
  isPagesShopAction,
  PAGES_CATALOG,
  type PagesCatalogItemId,
} from '../utils/pagesShop';
import {
  bumpDayStats,
  isAfterMiddayUnlock,
  touchFirstActive,
  withCurrentDayStats,
} from '../utils/dayStats';
import { trackRewardOutcome } from '../utils/playTrack';
import { tickDailyStreak } from '../utils/streak';
import {
  BATTLE_PASS_LEVEL_DEFS,
  BATTLE_PASS_LEVELS,
  BATTLE_PASS_PREMIUM_PRICE,
  BP_MAX_XP,
  BP_OVERFLOW_XP,
  PASS_BONUS_PAGE_PREMIUM_LEVELS,
  battlePassLevel,
  currentBattlePassSeasonId,
  defaultBattlePassProgress,
  type PassTrack,
} from '../data/battlePass';

export type DailyPreviewResult =
  | { status: 'ok'; reward: DailyReward }
  | { status: 'channel' }
  | { status: 'cooldown' };

function applyReward(prev: UserProgress, reward: DailyReward): UserProgress {
  const next = { ...prev };
  if (reward.kind === 'money') {
    next.coins = prev.coins + reward.amount;
  } else if (reward.kind === 'pages') {
    next.pages = prev.pages + reward.amount;
  } else if ((reward as { kind: string }).kind === 'book') {
    // Legacy daily/chest payloads
    const tokens = (reward as { tokens?: number; amount?: number }).tokens
      ?? (reward as { amount?: number }).amount
      ?? 1;
    next.pages = prev.pages + tokens;
  } else if (reward.kind === 'ink') {
    next.ink = prev.ink + reward.amount;
    next.lifetimeInkEarned = prev.lifetimeInkEarned + reward.amount;
  } else if (reward.kind === 'card') {
    if (!prev.collectedCardIds.includes(reward.card.id)) {
      next.collectedCardIds = [...prev.collectedCardIds, reward.card.id];
      next.rating = prev.rating + 1;
      return maybeGrantFullBookPage(prev, next);
    } else {
      const amount = inkForDupe(reward.card.rarity);
      next.ink = prev.ink + amount;
      next.lifetimeInkEarned = prev.lifetimeInkEarned + amount;
    }
  }
  return next;
}

function ensureBattlePass(progress: UserProgress): UserProgress {
  if (progress.battlePass?.seasonId === currentBattlePassSeasonId()) {
    return progress;
  }
  return { ...progress, battlePass: defaultBattlePassProgress() };
}

function addXp(progress: UserProgress, amount: number): UserProgress {
  let next = ensureBattlePass(withCurrentDayStats(progress));
  const xp = next.battlePass.xp + amount;
  next = {
    ...next,
    battlePass: { ...next.battlePass, xp },
  };

  while (
    Math.max(
      0,
      Math.floor((next.battlePass.xp - BP_MAX_XP) / BP_OVERFLOW_XP),
    ) > next.battlePass.overflowClaims
  ) {
    const before = next;
    const overflowReward = next.battlePass.premium
      ? ({ kind: 'bonusCase', amount: 1 } as const)
      : ({ kind: 'ink', amount: 8 } as const);
    next = applyGrant(next, overflowReward);
    next = trackInkFromReward(before, next);
    next = {
      ...next,
      battlePass: {
        ...next.battlePass,
        overflowClaims: next.battlePass.overflowClaims + 1,
      },
    };
  }

  return next;
}

function trackInkFromReward(
  before: UserProgress,
  after: UserProgress,
): UserProgress {
  const gained = after.lifetimeInkEarned - before.lifetimeInkEarned;
  if (gained <= 0) return after;
  return bumpDayStats(after, { inkEarned: gained });
}

export function useProgress(userId: string, initData = '') {
  const [progress, setProgress] = useState<UserProgress>(() =>
    loadProgress(userId),
  );
  const progressRef = useRef(progress);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initDataRef = useRef(initData);
  initDataRef.current = initData;

  useEffect(() => {
    const loaded = loadProgress(userId);
    progressRef.current = loaded;
    setProgress(loaded);
  }, [userId]);

  const pushToServer = useCallback((next: UserProgress) => {
    const data = initDataRef.current;
    if (!data) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void import('../api/backend').then(({ hasBackend, pushProgress }) => {
        if (!hasBackend()) return;
        void pushProgress(data, next);
      });
    }, 800);
  }, []);

  /** After deploy wipe, push empty defaults so Bothost doesn't restore old progress. */
  useEffect(() => {
    if (!wasProgressWipedThisSession()) return;
    if (!initData) return;
    pushToServer(progressRef.current);
  }, [userId, initData, pushToServer]);

  const commit = useCallback(
    (next: UserProgress) => {
      progressRef.current = next;
      saveProgress(userId, next);
      setProgress(next);
      pushToServer(next);
      return next;
    },
    [userId, pushToServer],
  );

  const replaceFromServer = useCallback(
    (server: UserProgress) => {
      const normalized = normalizeProgress(server);
      progressRef.current = normalized;
      saveProgress(userId, normalized);
      setProgress(normalized);
    },
    [userId],
  );

  const previewDailyOpen = useCallback((): DailyPreviewResult => {
    const prev = progressRef.current;
    if (!canAccessChannelFeature(Boolean(prev.channelConfirmedAt), 'daily')) {
      return { status: 'channel' };
    }
    if (
      !canOpenDaily(
        prev.lastDailyOpenAt,
        prev.bonusCaseOpens,
      )
    ) {
      return { status: 'cooldown' };
    }
    return { status: 'ok', reward: rollDailyReward(prev.collectedCardIds) };
  }, []);

  const syncChannelSubscription = useCallback(
    (subscribed: boolean) => {
      const prev = progressRef.current;
      if (subscribed) {
        if (prev.channelConfirmedAt) return;
        commit({
          ...prev,
          channelConfirmedAt: new Date().toISOString(),
        });
        return;
      }
      if (!prev.channelConfirmedAt) return;
      commit({
        ...prev,
        channelConfirmedAt: null,
      });
    },
    [commit],
  );

  const commitDailyOpen = useCallback(
    (reward: DailyReward) => {
      const prev = progressRef.current;
      const useBonus = willUseBonusCaseOpen(
        prev.lastDailyOpenAt,
        prev.bonusCaseOpens,
      );
      const now = new Date().toISOString();
      let next: UserProgress = {
        ...prev,
        lastDailyOpenAt: useBonus ? prev.lastDailyOpenAt : now,
        lastBonusCaseOpenAt: useBonus ? now : prev.lastBonusCaseOpenAt,
        bonusCaseOpens: useBonus
          ? Math.max(0, prev.bonusCaseOpens - 1)
          : prev.bonusCaseOpens,
        lifetimeDailyOpens: prev.lifetimeDailyOpens + 1,
      };
      const beforeInk = next;
      next = applyReward(next, reward);
      next = trackInkFromReward(beforeInk, next);
      next = trackRewardOutcome(prev, next, reward, { usedBonus: useBonus });
      const streaked = tickDailyStreak(next);
      commit(streaked.progress);
    },
    [commit],
  );

  const startChest = useCallback(
    (variant: ChestVariant = 'free'): boolean => {
      const prev = progressRef.current;
      if (variant === 'free') {
        if (
          !canAccessChannelFeature(Boolean(prev.channelConfirmedAt), 'chest')
        ) {
          return false;
        }
        if (!canOpenChest(prev.lastChestOpenAt)) return false;
      }
      return true;
    },
    [],
  );

  const commitChestOpen = useCallback(
    (variant: ChestVariant = 'free') => {
      const prev = progressRef.current;
      let next: UserProgress =
        variant === 'free'
          ? {
              ...prev,
              lastChestOpenAt: new Date().toISOString(),
              lifetimeChestOpens: prev.lifetimeChestOpens + 1,
            }
          : {
              ...prev,
              lifetimeChestOpens: prev.lifetimeChestOpens + 1,
            };
      next = bumpDayStats(next, { chestOpens: 1 });
      next = touchFirstActive(next);
      commit(next);
    },
    [commit],
  );

  const commitReward = useCallback(
    (reward: DailyReward) => {
      const prev = progressRef.current;
      let next = applyReward(prev, reward);
      next = trackInkFromReward(prev, next);
      next = trackRewardOutcome(prev, next, reward);
      commit(next);
    },
    [commit],
  );

  const commitPaidCase = useCallback(
    (
      reward: DailyReward,
      price: number,
      tier?: CaseTier,
      currency: 'coins' | 'pages' = 'coins',
    ) => {
      const prev = progressRef.current;
      if (currency === 'pages') {
        if (prev.pages < price) return;
      } else if (prev.coins < price) {
        return;
      }
      const risk = tier === 'mid' || tier === 'hot';
      const hot = tier === 'hot';
      let next: UserProgress =
        currency === 'pages'
          ? {
              ...prev,
              pages: prev.pages - price,
              lifetimePaidCases: prev.lifetimePaidCases + 1,
            }
          : {
              ...prev,
              coins: prev.coins - price,
              lifetimePaidCases: prev.lifetimePaidCases + 1,
            };
      if (currency === 'coins' && price > 0) {
        next = bumpDayStats(next, { spentCoins: price, paidCases: 1 });
      } else {
        next = bumpDayStats(next, { paidCases: 1 });
      }
      const before = next;
      next = applyReward(next, reward);
      next = trackInkFromReward(before, next);
      next = trackRewardOutcome(prev, next, reward, {
        riskCase: risk,
        hotOrPack: hot,
      });
      commit(next);
    },
    [commit],
  );

  const markLibraryVisit = useCallback(() => {
    const prev = progressRef.current;
    if (isSameUtcDay(prev.visitedLibraryAt)) return;
    commit({
      ...prev,
      visitedLibraryAt: new Date().toISOString(),
    });
  }, [commit]);

  const isQuestComplete = useCallback((questId: QuestId): boolean => {
    const prev = withCurrentDayStats(progressRef.current);
    const stats = prev.dayStats;
    if (questId === 'open_daily') {
      return (
        isSameUtcDay(prev.lastDailyOpenAt) ||
        prev.dailyStreakLastDate === stats.day ||
        stats.bonusCaseOpens > 0
      );
    }
    if (questId === 'new_card') return stats.newCards > 0;
    if (questId === 'pull_epic') return stats.epicPlus > 0;
    if (questId === 'ink_buy') return stats.inkBuys > 0;
    if (questId === 'open_chest') return stats.chestOpens > 0;
    if (questId === 'risk_case') return stats.riskCases > 0;
    if (questId === 'midday_hunt') {
      if (!isAfterMiddayUnlock(stats)) return false;
      const kind = middayHuntKindForDay(stats.day);
      switch (kind) {
        case 'bonus_spin':
          return stats.middayBonusOpens > 0;
        case 'rare_or_better':
          return stats.middayRarePlus > 0;
        case 'ink_missing':
          return stats.middayInkBuys > 0;
        case 'money_hit_25':
          return stats.middayMoneyHit25 > 0;
        case 'hot_or_pack':
          return stats.middayHotOrPack > 0;
      }
    }
    return false;
  }, []);

  const isQuestClaimed = useCallback((questId: QuestId): boolean => {
    return progressRef.current.claimedQuestIds.includes(questClaimKey(questId));
  }, []);

  const claimQuest = useCallback((questId: QuestId): boolean => {
    const prev = withCurrentDayStats(progressRef.current);
    const key = questClaimKey(questId);
    const def = QUESTS.find((q) => q.id === questId);
    if (
      !def ||
      !isQuestComplete(questId) ||
      prev.claimedQuestIds.includes(key)
    ) {
      return false;
    }
    const before = prev;
    let next = applyGrant(prev, def.reward);
    next = trackInkFromReward(before, next);
    next = {
      ...next,
      claimedQuestIds: [...next.claimedQuestIds, key],
    };
    next = addXp(next, def.xp);
    commit(next);
    return true;
  }, [commit, isQuestComplete]);

  const claimAchievement = useCallback(
    (id: AchievementId): boolean => {
      const prev = withCurrentDayStats(progressRef.current);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      const stats = scanCollectionStats(prev.collectedCardIds);
      if (
        !def ||
        !isAchievementComplete(id, prev, stats) ||
        prev.claimedAchievementIds.includes(id)
      ) {
        return false;
      }
      const before = prev;
      let next = applyGrant(prev, def.reward);
      next = trackInkFromReward(before, next);
      next = {
        ...next,
        claimedAchievementIds: [...next.claimedAchievementIds, id],
      };
      next = bumpDayStats(next, { achievementClaims: 1 });
      commit(next);
      return true;
    },
    [commit],
  );

  const buyBattlePassPremium = useCallback((): boolean => {
    let prev = ensureBattlePass(withCurrentDayStats(progressRef.current));
    if (prev.battlePass.premium) return false;
    if (prev.coins < BATTLE_PASS_PREMIUM_PRICE) return false;
    commit({
      ...prev,
      coins: prev.coins - BATTLE_PASS_PREMIUM_PRICE,
      battlePass: { ...prev.battlePass, premium: true },
    });
    return true;
  }, [commit]);

  const claimBattlePassReward = useCallback(
    (level: number, track: PassTrack, choiceIndex?: number): boolean => {
      let prev = ensureBattlePass(withCurrentDayStats(progressRef.current));
      const def = BATTLE_PASS_LEVEL_DEFS.find((l) => l.level === level);
      if (!def || level < 1 || level > BATTLE_PASS_LEVELS) return false;
      if (battlePassLevel(prev.battlePass.xp) < level) return false;
      if (track === 'premium' && !prev.battlePass.premium) return false;
      const claimed =
        track === 'free'
          ? prev.battlePass.claimedFree
          : prev.battlePass.claimedPremium;
      if (claimed.includes(level)) return false;

      const reward = track === 'free' ? def.free : def.premium;
      let toApply = reward;
      if (!Array.isArray(reward) && reward.kind === 'choice') {
        if (
          choiceIndex === undefined ||
          choiceIndex < 0 ||
          choiceIndex >= reward.options.length
        ) {
          return false;
        }
        toApply = normalizeGrantOption(reward.options[choiceIndex]!);
      }

      const before = prev;
      let next = applyGrant(prev, toApply);
      if (
        track === 'premium' &&
        (PASS_BONUS_PAGE_PREMIUM_LEVELS as readonly number[]).includes(level)
      ) {
        next = applyGrant(next, { kind: 'pages', amount: 1 });
      }
      next = trackInkFromReward(before, next);
      next = {
        ...next,
        battlePass: {
          ...next.battlePass,
          claimedFree:
            track === 'free'
              ? [...next.battlePass.claimedFree, level]
              : next.battlePass.claimedFree,
          claimedPremium:
            track === 'premium'
              ? [...next.battlePass.claimedPremium, level]
              : next.battlePass.claimedPremium,
        },
      };
      next = bumpDayStats(next, { passClaims: 1 });
      commit(next);
      return true;
    },
    [commit],
  );

  const ensureInkShop = useCallback((): string[] => {
    const prev = progressRef.current;
    if (
      !needsInkShopRefresh(
        prev.inkShopRolledAt,
        prev.inkShopCardIds,
        prev.collectedCardIds,
      )
    ) {
      return prev.inkShopCardIds.filter(
        (id) => !prev.collectedCardIds.includes(id),
      );
    }
    const offers = rollInkShopOffers(prev.collectedCardIds);
    const ids = offers.map((c) => c.id);
    commit({
      ...prev,
      inkShopCardIds: ids,
      inkShopRolledAt: new Date().toISOString(),
    });
    return ids;
  }, [commit]);

  const buyInkCard = useCallback(
    (
      cardId: string,
    ):
      | { status: 'ok'; card: Card }
      | { status: 'broke' }
      | { status: 'gone' } => {
      const prev = progressRef.current;
      if (!prev.inkShopCardIds.includes(cardId)) return { status: 'gone' };
      if (prev.collectedCardIds.includes(cardId)) return { status: 'gone' };
      const card = getCardById(cardId);
      if (!card) return { status: 'gone' };
      const price = inkShopPrice(card.rarity);
      if (prev.ink < price) return { status: 'broke' };
      const reward: DailyReward = { kind: 'card', card };
      let next = applyReward(
        {
          ...prev,
          ink: prev.ink - price,
          inkPurchases: prev.inkPurchases + 1,
          inkShopCardIds: prev.inkShopCardIds.filter((id) => id !== cardId),
        },
        reward,
      );
      next = bumpDayStats(next, { inkBuys: 1 });
      if (isAfterMiddayUnlock(next.dayStats)) {
        next = bumpDayStats(next, { middayInkBuys: 1 });
      }
      next = trackRewardOutcome(prev, next, reward);
      commit(next);
      return { status: 'ok', card };
    },
    [commit],
  );

  const buyInkSpend = useCallback(
    (
      itemId: InkCatalogItemId,
    ):
      | { status: 'ok'; message?: string }
      | { status: 'broke' }
      | { status: 'empty'; message: string }
      | { status: 'unknown' } => {
      const item = INK_CATALOG.find((i) => i.id === itemId);
      if (!item) return { status: 'unknown' };
      const prev = progressRef.current;
      if (prev.ink < item.price) return { status: 'broke' };

      if (item.kind === 'resetChest') {
        if (canOpenChest(prev.lastChestOpenAt)) {
          return { status: 'empty', message: 'Сундук уже доступен' };
        }
        let next: UserProgress = {
          ...prev,
          ink: prev.ink - item.price,
          inkPurchases: prev.inkPurchases + 1,
          lastChestOpenAt: null,
        };
        next = bumpDayStats(next, { inkBuys: 1 });
        if (isAfterMiddayUnlock(next.dayStats)) {
          next = bumpDayStats(next, { middayInkBuys: 1 });
        }
        commit(next);
        return { status: 'ok', message: 'Ожидание сундука сброшено' };
      }

      if (item.kind === 'coins') {
        const amount = item.amount ?? 0;
        let next: UserProgress = {
          ...prev,
          ink: prev.ink - item.price,
          inkPurchases: prev.inkPurchases + 1,
          coins: prev.coins + amount,
        };
        next = bumpDayStats(next, { inkBuys: 1 });
        if (isAfterMiddayUnlock(next.dayStats)) {
          next = bumpDayStats(next, { middayInkBuys: 1 });
        }
        commit(next);
        return { status: 'ok', message: item.label };
      }

      if (item.kind === 'bonusCase') {
        const amount = item.amount ?? 1;
        let next: UserProgress = {
          ...prev,
          ink: prev.ink - item.price,
          inkPurchases: prev.inkPurchases + 1,
          bonusCaseOpens: prev.bonusCaseOpens + amount,
        };
        next = bumpDayStats(next, { inkBuys: 1 });
        if (isAfterMiddayUnlock(next.dayStats)) {
          next = bumpDayStats(next, { middayInkBuys: 1 });
        }
        commit(next);
        return { status: 'ok', message: item.label };
      }

      return { status: 'unknown' };
    },
    [commit],
  );

  const buyPagesSpend = useCallback(
    (
      itemId: PagesCatalogItemId,
    ):
      | { status: 'ok'; message?: string }
      | {
          status: 'case';
          reward: DailyReward;
          price: number;
          tier: CaseTier;
          currency: 'pages';
        }
      | { status: 'broke' }
      | { status: 'unknown' } => {
      const item = PAGES_CATALOG.find((i) => i.id === itemId);
      if (!item) return { status: 'unknown' };
      const prev = progressRef.current;
      if (prev.pages < item.price) return { status: 'broke' };

      if (item.kind === 'ink') {
        const amount = item.amount ?? 40;
        commit({
          ...prev,
          pages: prev.pages - item.price,
          ink: prev.ink + amount,
          lifetimeInkEarned: prev.lifetimeInkEarned + amount,
        });
        return { status: 'ok', message: item.label };
      }

      if (item.kind === 'coins') {
        const amount = item.amount ?? 80;
        commit({
          ...prev,
          pages: prev.pages - item.price,
          coins: prev.coins + amount,
        });
        return { status: 'ok', message: item.label };
      }

      if (item.kind === 'case' && item.tier) {
        const reward = rollPaidCaseReward(prev.collectedCardIds, item.tier);
        return {
          status: 'case',
          reward,
          price: item.price,
          tier: item.tier,
          currency: 'pages',
        };
      }

      return { status: 'unknown' };
    },
    [commit],
  );

  const applyReferralParam = useCallback(
    (referrerId: string) => {
      const prev = progressRef.current;
      if (!referrerId || referrerId === userId) return;
      if (prev.referralBonusClaimed || prev.referredByUserId) return;
      commit({
        ...prev,
        referredByUserId: referrerId,
        referralBonusClaimed: true,
        coins: prev.coins + REFERRAL_INVITEE_COINS,
      });
    },
    [commit, userId],
  );

  const applyServerBootstrap = useCallback(
    (payload: {
      referralCount: number;
      pendingCoins: number;
      pendingBonusCases: number;
      claimId: string | null;
      inviteeReferrerId?: string | null;
    }) => {
      const prev = progressRef.current;
      let next: UserProgress = {
        ...prev,
        referralCount: Math.max(prev.referralCount, payload.referralCount),
      };

      const claimId = payload.claimId;
      const alreadyApplied =
        Boolean(claimId) && prev.appliedClaimIds.includes(claimId!);

      if (
        claimId &&
        !alreadyApplied &&
        (payload.pendingCoins > 0 || payload.pendingBonusCases > 0)
      ) {
        if (payload.pendingCoins > 0) {
          next = { ...next, coins: next.coins + payload.pendingCoins };
        }
        if (payload.pendingBonusCases > 0) {
          next = {
            ...next,
            bonusCaseOpens: next.bonusCaseOpens + payload.pendingBonusCases,
          };
        }
        next = {
          ...next,
          appliedClaimIds: [...next.appliedClaimIds, claimId].slice(-30),
        };
      }

      if (
        payload.inviteeReferrerId &&
        !next.referredByUserId &&
        payload.inviteeReferrerId !== userId
      ) {
        next = {
          ...next,
          referredByUserId: payload.inviteeReferrerId,
          referralBonusClaimed: true,
        };
      }
      if (
        next.coins !== prev.coins ||
        next.bonusCaseOpens !== prev.bonusCaseOpens ||
        next.referralCount !== prev.referralCount ||
        next.referredByUserId !== prev.referredByUserId ||
        next.referralBonusClaimed !== prev.referralBonusClaimed ||
        next.appliedClaimIds !== prev.appliedClaimIds
      ) {
        commit(next);
      }
    },
    [commit, userId],
  );

  const buyShopItem = useCallback(
    (itemId: ShopItemId): ShopBuyResult => {
      const item = config.shop.items.find((i) => i.id === itemId);
      if (!item) return { status: 'unknown' };

      const prev = progressRef.current;
      const action: ShopItemAction = item.action;

      if (action === 'open_chest_free') {
        return { status: 'unknown' };
      }

      if (action === 'book_music') {
        const shelfId = 'music';
        const card = pickUncollectedFromShelf(shelfId, prev.collectedCardIds);
        if (!card) {
          return { status: 'empty', message: 'На этой полке всё собрано' };
        }
        const usePage = prev.pages >= 1;
        if (!usePage && prev.coins < item.price) {
          return { status: 'broke' };
        }
        const reward: DailyReward = { kind: 'card', card };
        let base = usePage
          ? { ...prev, pages: prev.pages - 1 }
          : { ...prev, coins: prev.coins - item.price };
        if (!usePage && item.price > 0) {
          base = bumpDayStats(base, { spentCoins: item.price });
        }
        let next = applyReward(base, reward);
        next = trackRewardOutcome(prev, next, reward);
        commit(next);
        return {
          status: 'ok',
          reward,
          message: usePage ? 'Списана страница' : 'Карта с полки',
        };
      }

      if (isPagesShopAction(action)) {
        if (prev.pages < item.price) return { status: 'broke' };

        if (action === 'pages_ink') {
          const amount = 40;
          commit({
            ...prev,
            pages: prev.pages - item.price,
            ink: prev.ink + amount,
            lifetimeInkEarned: prev.lifetimeInkEarned + amount,
          });
          return { status: 'ok', message: '+40 чернил' };
        }

        if (action === 'pages_coins') {
          commit({
            ...prev,
            pages: prev.pages - item.price,
            coins: prev.coins + 80,
          });
          return { status: 'ok', message: '+80 монет' };
        }

        if (action === 'pages_soft' || action === 'pages_mid') {
          const tier = action === 'pages_soft' ? 'soft' : 'mid';
          const reward = rollPaidCaseReward(prev.collectedCardIds, tier);
          return {
            status: 'case',
            reward,
            price: item.price,
            tier,
            currency: 'pages',
          };
        }
      }

      if (prev.coins < item.price) return { status: 'broke' };

      if (
        action === 'case_soft' ||
        action === 'case_mid' ||
        action === 'case_hot'
      ) {
        const tier = action.replace('case_', '') as CaseTier;
        const reward = rollPaidCaseReward(prev.collectedCardIds, tier);
        return { status: 'case', reward, price: item.price, tier };
      }

      if (action === 'reset_chest') {
        if (canOpenChest(prev.lastChestOpenAt)) {
          return { status: 'empty', message: 'Сундук уже доступен' };
        }
        let next: UserProgress = {
          ...prev,
          coins: prev.coins - item.price,
          lastChestOpenAt: null,
        };
        next = bumpDayStats(next, { spentCoins: item.price });
        commit(next);
        return { status: 'ok', message: 'Ожидание сундука сброшено' };
      }

      if (action === 'open_chest_plus') {
        let next: UserProgress = {
          ...prev,
          coins: prev.coins - item.price,
        };
        next = bumpDayStats(next, { spentCoins: item.price });
        commit(next);
        return { status: 'chest_plus' };
      }

      if (
        action === 'pack_rare' ||
        action === 'pack_epic' ||
        action === 'pack_legendary'
      ) {
        const min =
          action === 'pack_rare'
            ? 'rare'
            : action === 'pack_epic'
              ? 'epic'
              : 'legendary';
        const card = pickShopCardMinRarity(prev.collectedCardIds, min);
        if (!card) {
          return {
            status: 'empty',
            message: 'Нет несобранных карт этой редкости',
          };
        }
        const reward: DailyReward = { kind: 'card', card };
        let next: UserProgress = {
          ...prev,
          coins: prev.coins - item.price,
        };
        next = bumpDayStats(next, { spentCoins: item.price });
        next = applyReward(next, reward);
        next = trackRewardOutcome(prev, next, reward, {
          hotOrPack: action === 'pack_epic' || action === 'pack_legendary',
        });
        commit(next);
        return { status: 'ok', reward, message: 'Карта получена' };
      }

      return { status: 'unknown' };
    },
    [commit],
  );

  return {
    progress,
    previewDailyOpen,
    commitDailyOpen,
    syncChannelSubscription,
    startChest,
    commitChestOpen,
    commitReward,
    commitPaidCase,
    markLibraryVisit,
    isQuestComplete,
    isQuestClaimed,
    claimQuest,
    claimAchievement,
    buyShopItem,
    ensureInkShop,
    buyInkCard,
    buyInkSpend,
    buyPagesSpend,
    applyReferralParam,
    applyServerBootstrap,
    replaceFromServer,
    buyBattlePassPremium,
    claimBattlePassReward,
  };
}
