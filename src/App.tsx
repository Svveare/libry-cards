import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { DailyReward, HomeMenuId, Screen } from './types';
import { config, isAdminUser, isContentReady, preloadContent } from './content/loader';
import { AppLayout } from './components/Layout/AppLayout';
import { HomeBrand } from './components/Home/HomeBrand';
import { TopBar } from './components/Home/TopBar';
import { HomeMenu } from './components/Home/HomeMenu';
import { Header } from './components/ui/Header';
import { checkChannelSubscription } from './utils/checkSubscription';
import { useTelegram } from './hooks/useTelegram';
import { useProgress } from './hooks/useProgress';

const DailyBonusView = lazy(() =>
  import('./components/Daily/DailyBonusView').then((m) => ({
    default: m.DailyBonusView,
  })),
);
const RewardModal = lazy(() =>
  import('./components/Daily/RewardModal').then((m) => ({
    default: m.RewardModal,
  })),
);
const ChestView = lazy(() =>
  import('./components/Chest/ChestView').then((m) => ({ default: m.ChestView })),
);
const ShopView = lazy(() =>
  import('./components/Shop/ShopView').then((m) => ({ default: m.ShopView })),
);
const ShopCategoryView = lazy(() =>
  import('./components/Shop/ShopCategoryView').then((m) => ({
    default: m.ShopCategoryView,
  })),
);
const ShopItemView = lazy(() =>
  import('./components/Shop/ShopItemView').then((m) => ({
    default: m.ShopItemView,
  })),
);
const ShopInkView = lazy(() =>
  import('./components/Shop/ShopInkView').then((m) => ({
    default: m.ShopInkView,
  })),
);
const QuestsView = lazy(() =>
  import('./components/Quests/QuestsView').then((m) => ({
    default: m.QuestsView,
  })),
);
const StandsView = lazy(() =>
  import('./components/Library/StandsView').then((m) => ({
    default: m.StandsView,
  })),
);
const StandDetailView = lazy(() =>
  import('./components/Library/ShelfView').then((m) => ({
    default: m.StandDetailView,
  })),
);
const ShelfView = lazy(() =>
  import('./components/Library/ShelfView').then((m) => ({
    default: m.ShelfView,
  })),
);
const BookView = lazy(() =>
  import('./components/Library/BookView').then((m) => ({ default: m.BookView })),
);
const ProfileView = lazy(() =>
  import('./components/Profile/ProfileView').then((m) => ({
    default: m.ProfileView,
  })),
);
const FriendsView = lazy(() =>
  import('./components/Friends/FriendsView').then((m) => ({
    default: m.FriendsView,
  })),
);
const AdminView = lazy(() =>
  import('./components/Admin/AdminView').then((m) => ({
    default: m.AdminView,
  })),
);

function ScreenFallback() {
  return <p className="mutedCopy">Загрузка…</p>;
}

function screenNeedsContent(screen: Screen): boolean {
  return (
    screen.name === 'daily' ||
    screen.name === 'chest' ||
    screen.name === 'library' ||
    screen.name === 'stand' ||
    screen.name === 'shelf' ||
    screen.name === 'book' ||
    screen.name === 'shopItem' ||
    (screen.name === 'shopCategory' && screen.categoryId === 'ink') ||
    screen.name === 'profile' ||
    screen.name === 'admin'
  );
}

function App() {
  const { userId, user, startParam, openTelegramLink, initData, insideTelegram } =
    useTelegram();
  const {
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
  } = useProgress(userId);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [revealedReward, setRevealedReward] = useState<DailyReward | null>(
    null,
  );
  const [contentReady, setContentReady] = useState(isContentReady);
  const [contentEpoch, setContentEpoch] = useState(0);
  const admin = isAdminUser(userId);

  useEffect(() => {
    if (contentReady) return;
    if (screenNeedsContent(screen)) {
      void preloadContent().then(() => setContentReady(true));
      return;
    }
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(() => {
            void preloadContent().then(() => setContentReady(true));
          })
        : window.setTimeout(() => {
            void preloadContent().then(() => setContentReady(true));
          }, 1200);
    return () => {
      if (typeof cancelIdleCallback === 'function' && typeof idle === 'number') {
        try {
          cancelIdleCallback(idle as number);
        } catch {
          clearTimeout(idle as number);
        }
      } else {
        clearTimeout(idle as number);
      }
    };
  }, [screen, contentReady]);

  useEffect(() => {
    if (!startParam?.startsWith('ref_')) return;
    const refId = startParam.slice(4);
    if (refId) applyReferralParam(refId);
  }, [startParam, applyReferralParam]);

  useEffect(() => {
    if (!insideTelegram || !initData || !config.telegramChannel.enabled) return;
    let cancelled = false;
    void checkChannelSubscription(initData).then((result) => {
      if (cancelled || !result.ok) return;
      syncChannelSubscription(result.subscribed);
    });
    return () => {
      cancelled = true;
    };
  }, [insideTelegram, initData, syncChannelSubscription]);

  const collectedSet = useMemo(
    () => new Set(progress.collectedCardIds),
    [progress.collectedCardIds],
  );

  const goHome = () => setScreen({ name: 'home' });

  const openMenu = (id: HomeMenuId) => {
    if (id === 'library') markLibraryVisit();
    setScreen({ name: id } as Screen);
  };

  const openLibrary = () => {
    markLibraryVisit();
    setScreen({ name: 'library' });
  };

  const needsContent = screenNeedsContent(screen);

  const body = (() => {
    if (needsContent && !contentReady) {
      return <ScreenFallback />;
    }

    switch (screen.name) {
      case 'profile':
        return (
          <ProfileView
            user={user}
            userId={userId}
            progress={progress}
            isAdmin={admin}
            onBack={goHome}
            onOpenLibrary={openLibrary}
            onOpenAdmin={() => setScreen({ name: 'admin' })}
            onClaimAchievement={claimAchievement}
          />
        );
      case 'admin':
        if (!admin) return <ScreenFallback />;
        return (
          <AdminView
            onBack={() => {
              setContentEpoch((n) => n + 1);
              setScreen({ name: 'profile' });
            }}
          />
        );
      case 'daily':
        return (
          <>
            <Header
              title="Ежедневный бонус"
              subtitle="Монеты, карта или книга"
              onBack={goHome}
            />
            <DailyBonusView
              lastDailyOpenAt={progress.lastDailyOpenAt}
              channelConfirmed={Boolean(progress.channelConfirmedAt)}
              onPreview={previewDailyOpen}
              onCommit={commitDailyOpen}
              onRewardRevealed={setRevealedReward}
              onOpenChannel={openTelegramLink}
              onSyncSubscription={syncChannelSubscription}
              initData={initData}
            />
          </>
        );
      case 'chest': {
        const variant = screen.variant ?? 'free';
        return (
          <>
            <Header
              title={variant === 'plus' ? 'Сундук+' : 'Сундук'}
              subtitle="Выбери одну из четырёх"
              onBack={() =>
                setScreen({ name: 'shopCategory', categoryId: 'chests' })
              }
            />
            <ChestView
              lastChestOpenAt={progress.lastChestOpenAt}
              collectedIds={progress.collectedCardIds}
              variant={variant}
              channelConfirmed={Boolean(progress.channelConfirmedAt)}
              onStart={startChest}
              onCommitOpen={commitChestOpen}
              onCommit={commitReward}
              onRewardRevealed={setRevealedReward}
              onOpenChannel={openTelegramLink}
              onSyncSubscription={syncChannelSubscription}
              initData={initData}
            />
          </>
        );
      }
      case 'library':
        return (
          <>
            <Header
              title="Библиотека"
              subtitle="Стенды коллекции"
              onBack={goHome}
            />
            <StandsView
              collectedSet={collectedSet}
              onStandSelect={(standId) => setScreen({ name: 'stand', standId })}
              hideTitle
            />
          </>
        );
      case 'stand':
        return (
          <StandDetailView
            standId={screen.standId}
            collectedSet={collectedSet}
            onBack={() => setScreen({ name: 'library' })}
            onShelfSelect={(shelfId) =>
              setScreen({ name: 'shelf', standId: screen.standId, shelfId })
            }
          />
        );
      case 'shelf':
        return (
          <ShelfView
            shelfId={screen.shelfId}
            collectedSet={collectedSet}
            onBack={() =>
              setScreen({ name: 'stand', standId: screen.standId })
            }
            onBookSelect={(bookId) =>
              setScreen({
                name: 'book',
                standId: screen.standId,
                shelfId: screen.shelfId,
                bookId,
              })
            }
          />
        );
      case 'book':
        return (
          <BookView
            bookId={screen.bookId}
            collectedSet={collectedSet}
            onBack={() =>
              setScreen({
                name: 'shelf',
                standId: screen.standId,
                shelfId: screen.shelfId,
              })
            }
          />
        );
      case 'quests':
        return (
          <>
            <Header
              title="Задания"
              subtitle="Монеты за дела дня"
              onBack={goHome}
            />
            <QuestsView
              isComplete={isQuestComplete}
              isClaimed={isQuestClaimed}
              onClaim={claimQuest}
            />
          </>
        );
      case 'shop':
        return (
          <>
            <Header
              title="Магазин"
              subtitle="Кейсы, сундуки, чернила"
              onBack={goHome}
            />
            <ShopView
              coins={progress.coins}
              bookTokens={progress.bookTokens}
              ink={progress.ink}
              onOpenCategory={(categoryId) =>
                setScreen({ name: 'shopCategory', categoryId })
              }
            />
          </>
        );
      case 'shopCategory': {
        const cat = config.shop.categories.find(
          (c) => c.id === screen.categoryId,
        );
        if (screen.categoryId === 'ink') {
          return (
            <>
              <Header
                title={cat?.title ?? 'Чернила'}
                subtitle={cat?.hint}
                onBack={() => setScreen({ name: 'shop' })}
              />
              <ShopInkView
                coins={progress.coins}
                bookTokens={progress.bookTokens}
                ink={progress.ink}
                offerIds={progress.inkShopCardIds}
                rolledAt={progress.inkShopRolledAt}
                onEnsureOffers={ensureInkShop}
                onBuy={buyInkCard}
                onReward={(card) =>
                  setRevealedReward({ kind: 'card', card })
                }
              />
            </>
          );
        }
        return (
          <>
            <Header
              title={cat?.title ?? 'Магазин'}
              subtitle={cat?.hint}
              onBack={() => setScreen({ name: 'shop' })}
            />
            <ShopCategoryView
              categoryId={screen.categoryId}
              coins={progress.coins}
              bookTokens={progress.bookTokens}
              ink={progress.ink}
              onOpenItem={(itemId) => setScreen({ name: 'shopItem', itemId })}
              onOpenFreeChest={() =>
                setScreen({ name: 'chest', variant: 'free' })
              }
            />
          </>
        );
      }
      case 'shopItem': {
        const shopItem = config.shop.items.find((i) => i.id === screen.itemId);
        const categoryId = shopItem?.categoryId ?? 'chests';
        return (
          <>
            <Header
              title="Покупка"
              subtitle={shopItem?.title}
              onBack={() => setScreen({ name: 'shopCategory', categoryId })}
            />
            <ShopItemView
              itemId={screen.itemId}
              coins={progress.coins}
              bookTokens={progress.bookTokens}
              ink={progress.ink}
              onBuy={buyShopItem}
              onCommitCase={commitPaidCase}
              onReward={setRevealedReward}
              onOpenChestPlus={() =>
                setScreen({ name: 'chest', variant: 'plus' })
              }
              onOpenFreeChest={() =>
                setScreen({ name: 'chest', variant: 'free' })
              }
            />
          </>
        );
      }
      case 'friends':
        return (
          <FriendsView
            userId={userId}
            referralCount={progress.referralCount}
            onBack={goHome}
          />
        );
      case 'home':
      default:
        return (
          <>
            <TopBar
              user={user}
              coins={progress.coins}
              rating={progress.rating}
              onProfileClick={() => setScreen({ name: 'profile' })}
            />
            <HomeBrand />
            <HomeMenu onSelect={openMenu} />
          </>
        );
    }
  })();

  return (
    <AppLayout>
      <Suspense fallback={<ScreenFallback />} key={contentEpoch}>
        {body}
      </Suspense>
      {revealedReward ? (
        <Suspense fallback={null}>
          <RewardModal
            reward={revealedReward}
            onClose={() => setRevealedReward(null)}
          />
        </Suspense>
      ) : null}
    </AppLayout>
  );
}

export default App;
