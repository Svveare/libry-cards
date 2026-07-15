import { useRef, useState } from 'react';
import type { CaseTier, DailyReward, ShopItemId } from '../../types';
import { config } from '../../content/loader';
import { useCaseSpin } from '../../hooks/useCaseSpin';
import { isPagesShopAction, pagesPriceLabel } from '../../utils/pagesShop';
import type { ShopBuyResult } from '../../utils/shop';
import { Button } from '../ui/Button';
import { WalletBar } from '../ui/WalletBar';
import { CaseStrip } from '../Daily/CaseStrip';
import styles from './Shop.module.css';

interface ShopItemViewProps {
  itemId: ShopItemId;
  coins: number;
  pages: number;
  ink: number;
  /** When true, free chest is already ready — reset_chest is blocked. */
  chestReady?: boolean;
  onBuy: (itemId: ShopItemId) => ShopBuyResult;
  onCommitCase: (
    reward: DailyReward,
    price: number,
    tier?: CaseTier,
    currency?: 'coins' | 'pages',
  ) => void;
  onReward: (reward: DailyReward) => void;
  onOpenChestPlus: () => void;
  onOpenFreeChest: () => void;
}

function isCaseAction(action: string): boolean {
  return (
    action === 'case_soft' ||
    action === 'case_mid' ||
    action === 'case_hot' ||
    action === 'pages_soft' ||
    action === 'pages_mid'
  );
}

function isBookAction(action: string): boolean {
  return action === 'book_music';
}

export function ShopItemView({
  itemId,
  coins,
  pages,
  ink,
  chestReady = false,
  onBuy,
  onCommitCase,
  onReward,
  onOpenChestPlus,
  onOpenFreeChest,
}: ShopItemViewProps) {
  const item = config.shop.items.find((i) => i.id === itemId);
  const [message, setMessage] = useState<string | null>(null);
  const pendingPrice = useRef(0);
  const pendingTier = useRef<CaseTier | undefined>(undefined);
  const pendingCurrency = useRef<'coins' | 'pages'>('coins');

  const isCase = item ? isCaseAction(item.action) : false;
  const isBook = item ? isBookAction(item.action) : false;
  const isPagesSpend = item ? isPagesShopAction(item.action) : false;
  const isResetChest = item?.action === 'reset_chest';
  const resetBlocked = isResetChest && chestReady;

  const { spinning, strip, startSpin, handleSpinEnd } = useCaseSpin({
    onCommit: (reward) =>
      onCommitCase(
        reward,
        pendingPrice.current,
        pendingTier.current,
        pendingCurrency.current,
      ),
    onReveal: onReward,
    previewExcludeMoney: isCase,
  });

  if (!item) {
    return <p className="goldMessage">Товар не найден</p>;
  }

  if (item.action === 'open_chest_free') {
    return (
      <section className={`viewEnter ${styles.shop}`}>
        <p className={styles.lead}>Бесплатный сундук — выбор из четырёх карт.</p>
        <Button fullWidth onClick={onOpenFreeChest}>
          К сундуку
        </Button>
      </section>
    );
  }

  const canAfford = isBook
    ? pages >= 1 || coins >= item.price
    : isPagesSpend
      ? pages >= item.price
      : coins >= item.price;

  const priceText = isBook
    ? pages >= 1
      ? '1 страница'
      : `${item.price} монет`
    : isPagesSpend
      ? pagesPriceLabel(item.price)
      : `${item.price} монет`;

  const handleBuy = () => {
    if (spinning) return;
    setMessage(null);
    if (resetBlocked) {
      setMessage('Сундук уже доступен');
      return;
    }

    const result = onBuy(itemId);
    if (result.status === 'broke') {
      setMessage(
        isPagesSpend ? 'Недостаточно страниц' : 'Недостаточно монет',
      );
      return;
    }
    if (result.status === 'empty') {
      setMessage(result.message);
      return;
    }
    if (result.status === 'unknown') {
      setMessage('Товар недоступен');
      return;
    }
    if (result.status === 'case') {
      pendingPrice.current = result.price;
      pendingTier.current = result.tier;
      pendingCurrency.current = result.currency ?? 'coins';
      startSpin(result.reward, { excludeMoney: true });
      return;
    }
    if (result.status === 'chest_plus') {
      onOpenChestPlus();
      return;
    }
    if (result.status === 'ok') {
      setMessage(result.message ?? 'Готово');
      if (result.reward) onReward(result.reward);
    }
  };

  return (
    <section className={`viewEnter ${styles.shop}`}>
      <WalletBar coins={coins} pages={pages} ink={ink} />

      <div className={styles.detail}>
        <h2 className={styles.detailTitle}>{item.title}</h2>
        {item.description ? (
          <p className={styles.detailDesc}>{item.description}</p>
        ) : null}
        <p className={styles.detailPrice}>{priceText}</p>
      </div>

      {isCase ? (
        <div className={styles.caseBlock}>
          <p className={styles.caseHint}>Без монет в рулетке</p>
          <CaseStrip
            items={strip}
            spinning={spinning}
            onSpinEnd={spinning ? handleSpinEnd : undefined}
          />
        </div>
      ) : null}

      <Button
        fullWidth
        disabled={spinning || !canAfford || resetBlocked}
        onClick={handleBuy}
      >
        {spinning
          ? 'Открывается…'
          : resetBlocked
            ? 'Сундук уже доступен'
            : canAfford
              ? item.action === 'open_chest_plus'
                ? 'Купить и открыть'
                : item.action === 'reset_chest'
                  ? 'Сбросить ожидание'
                  : 'Купить'
              : 'Недостаточно'}
      </Button>

      {resetBlocked ? (
        <p className="goldMessage">Сундук уже доступен — сброс не нужен</p>
      ) : null}
      {message && <p className="goldMessage">{message}</p>}
    </section>
  );
}
