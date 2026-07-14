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
import { loadProgress, saveProgress } from '../utils/storage';
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
  questClaimKey,
  type QuestId,
  utcDayKey,
} from '../utils/quests';
import { inkForDupe, inkShopPrice, REFERRAL_INVITEE_COINS } from '../utils/ink';
import { needsInkShopRefresh, rollInkShopOffers } from '../utils/inkShop';
import {
  ACHIEVEMENTS,
  isAchievementComplete,
  scanCollectionStats,
  type AchievementId,
} from '../utils/achievements';

export type DailyPreviewResult =
  | { status: 'ok'; reward: DailyReward }
  | { status: 'channel' }
  | { status: 'cooldown' };

function applyReward(prev: UserProgress, reward: DailyReward): UserProgress {
  const next = { ...prev };
  if (reward.kind === 'money') {
    next.coins = prev.coins + reward.amount;
  } else if (reward.kind === 'book') {
    next.bookTokens = prev.bookTokens + reward.tokens;
  } else if (reward.kind === 'ink') {
    next.ink = prev.ink + reward.amount;
    next.lifetimeInkEarned = prev.lifetimeInkEarned + reward.amount;
  } else if (reward.kind === 'card') {
    if (!prev.collectedCardIds.includes(reward.card.id)) {
      next.collectedCardIds = [...prev.collectedCardIds, reward.card.id];
      next.rating = prev.rating + 1;
    } else {
      const amount = inkForDupe(reward.card.rarity);
      next.ink = prev.ink + amount;
      next.lifetimeInkEarned = prev.lifetimeInkEarned + amount;
    }
  }
  return next;
}

export function useProgress(userId: string) {
  const [progress, setProgress] = useState<UserProgress>(() =>
    loadProgress(userId),
  );
  const progressRef = useRef(progress);

  useEffect(() => {
    const loaded = loadProgress(userId);
    progressRef.current = loaded;
    setProgress(loaded);
  }, [userId]);

  const commit = useCallback(
    (next: UserProgress) => {
      progressRef.current = next;
      saveProgress(userId, next);
      setProgress(next);
      return next;
    },
    [userId],
  );

  const previewDailyOpen = useCallback((): DailyPreviewResult => {
    const prev = progressRef.current;
    if (!canAccessChannelFeature(Boolean(prev.channelConfirmedAt), 'daily')) {
      return { status: 'channel' };
    }
    if (!canOpenDaily(prev.lastDailyOpenAt, prev.bonusCaseOpens)) {
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
      let next: UserProgress = {
        ...prev,
        lastDailyOpenAt: useBonus
          ? prev.lastDailyOpenAt
          : new Date().toISOString(),
        bonusCaseOpens: useBonus
          ? Math.max(0, prev.bonusCaseOpens - 1)
          : prev.bonusCaseOpens,
        lifetimeDailyOpens: prev.lifetimeDailyOpens + 1,
      };
      next = applyReward(next, reward);
      commit(next);
    },
    [commit],
  );

  const startChest = useCallback(
    (variant: ChestVariant = 'free'): boolean => {
      const prev = progressRef.current;
      if (variant === 'free') {
        if (
          !canAccessChannelFeature(
            Boolean(prev.channelConfirmedAt),
            'chest',
          )
        ) {
          return false;
        }
        if (!canOpenChest(prev.lastChestOpenAt)) return false;
      }
      return true;
    },
    [],
  );

  /** Call when the player actually picks a chest slot. */
  const commitChestOpen = useCallback(
    (variant: ChestVariant = 'free') => {
      const prev = progressRef.current;
      if (variant === 'free') {
        commit({
          ...prev,
          lastChestOpenAt: new Date().toISOString(),
          lifetimeChestOpens: prev.lifetimeChestOpens + 1,
        });
      } else {
        commit({
          ...prev,
          lifetimeChestOpens: prev.lifetimeChestOpens + 1,
        });
      }
    },
    [commit],
  );

  const commitReward = useCallback(
    (reward: DailyReward) => {
      commit(applyReward(progressRef.current, reward));
    },
    [commit],
  );

  /** Deduct case price + apply reward only after the spin ends. */
  const commitPaidCase = useCallback(
    (reward: DailyReward, price: number) => {
      const prev = progressRef.current;
      if (prev.coins < price) return;
      commit(applyReward({ ...prev, coins: prev.coins - price }, reward));
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
    const prev = progressRef.current;
    const day = utcDayKey();
    if (questId === 'open_case') return isSameUtcDay(prev.lastDailyOpenAt, day);
    if (questId === 'visit_library')
      return isSameUtcDay(prev.visitedLibraryAt, day);
    if (questId === 'open_chest')
      return isSameUtcDay(prev.lastChestOpenAt, day);
    return false;
  }, []);

  const isQuestClaimed = useCallback((questId: QuestId): boolean => {
    return progressRef.current.claimedQuestIds.includes(questClaimKey(questId));
  }, []);

  const claimQuest = useCallback(
    (questId: QuestId, rewardCoins: number): boolean => {
      const prev = progressRef.current;
      const key = questClaimKey(questId);
      if (!isQuestComplete(questId) || prev.claimedQuestIds.includes(key)) {
        return false;
      }
      commit({
        ...prev,
        coins: prev.coins + rewardCoins,
        claimedQuestIds: [...prev.claimedQuestIds, key],
      });
      return true;
    },
    [commit, isQuestComplete],
  );

  const claimAchievement = useCallback(
    (id: AchievementId): boolean => {
      const prev = progressRef.current;
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      const stats = scanCollectionStats(prev.collectedCardIds);
      if (
        !def ||
        !isAchievementComplete(id, prev, stats) ||
        prev.claimedAchievementIds.includes(id)
      ) {
        return false;
      }
      commit({
        ...prev,
        coins: prev.coins + def.rewardCoins,
        claimedAchievementIds: [...prev.claimedAchievementIds, id],
      });
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
    ): { status: 'ok'; card: Card } | { status: 'broke' } | { status: 'gone' } => {
      const prev = progressRef.current;
      if (!prev.inkShopCardIds.includes(cardId)) return { status: 'gone' };
      if (prev.collectedCardIds.includes(cardId)) return { status: 'gone' };
      const card = getCardById(cardId);
      if (!card) return { status: 'gone' };
      const price = inkShopPrice(card.rarity);
      if (prev.ink < price) return { status: 'broke' };
      const reward: DailyReward = { kind: 'card', card };
      commit(
        applyReward(
          {
            ...prev,
            ink: prev.ink - price,
            inkPurchases: prev.inkPurchases + 1,
            inkShopCardIds: prev.inkShopCardIds.filter((id) => id !== cardId),
          },
          reward,
        ),
      );
      return { status: 'ok', card };
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
        const useToken = prev.bookTokens >= 1;
        if (!useToken && prev.coins < item.price) {
          return { status: 'broke' };
        }
        const reward: DailyReward = { kind: 'card', card };
        const base = useToken
          ? { ...prev, bookTokens: prev.bookTokens - 1 }
          : { ...prev, coins: prev.coins - item.price };
        commit(applyReward(base, reward));
        return {
          status: 'ok',
          reward,
          message: useToken ? 'Списан токен книги' : 'Карта с полки',
        };
      }

      if (prev.coins < item.price) return { status: 'broke' };

      if (
        action === 'case_soft' ||
        action === 'case_mid' ||
        action === 'case_hot'
      ) {
        const tier = action.replace('case_', '') as CaseTier;
        const reward = rollPaidCaseReward(prev.collectedCardIds, tier);
        return { status: 'case', reward, price: item.price };
      }

      if (action === 'reset_chest') {
        commit({
          ...prev,
          coins: prev.coins - item.price,
          lastChestOpenAt: null,
        });
        return { status: 'ok', message: 'Ожидание сундука сброшено' };
      }

      if (action === 'open_chest_plus') {
        commit({ ...prev, coins: prev.coins - item.price });
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
        commit(
          applyReward({ ...prev, coins: prev.coins - item.price }, reward),
        );
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
    applyReferralParam,
  };
}
