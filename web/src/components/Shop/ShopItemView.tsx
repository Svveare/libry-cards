import { useRef, useState } from 'react';
import type { CaseTier, DailyReward, ShopItemId } from '../../types';
import { config } from '../../content/loader';
import { useCaseSpin } from '../../hooks/useCaseSpin';
import type { ShopBuyResult } from '../../utils/shop';
import { Button } from '../ui/Button';
import { WalletBar } from '../ui/WalletBar';
import { CaseStrip } from '../Daily/CaseStrip';
import styles from './Shop.module.css';

interface ShopItemViewProps {
  itemId: ShopItemId;
  coins: number;
  bookTokens: number;
  ink: number;
  onBuy: (itemId: ShopItemId) => ShopBuyResult;
  onCommitCase: (reward: DailyReward, price: number, tier?: CaseTier) => void;
  onReward: (reward: DailyReward) => void;
  onOpenChestPlus: () => void;
  onOpenFreeChest: () => void;
}

function isCaseAction(action: string): boolean {
  return (
    action === 'case_soft' || action === 'case_mid' || action === 'case_hot'
  );
}

function isBookAction(action: string): boolean {
  return action === 'book_music';
}

export function ShopItemView({
  itemId,
  coins,
  bookTokens,
  ink,
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

  const isCase = item ? isCaseAction(item.action) : false;
  const isBook = item ? isBookAction(item.action) : false;

  const { spinning, strip, startSpin, handleSpinEnd } = useCaseSpin({
    onCommit: (reward) =>
      onCommitCase(reward, pendingPrice.current, pendingTier.current),
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
    ? bookTokens >= 1 || coins >= item.price
    : coins >= item.price;

  const priceText = isBook
    ? bookTokens >= 1
      ? '1 токен книги'
      : `${item.price} монет`
    : `${item.price} монет`;

  const handleBuy = () => {
    if (spinning) return;
    setMessage(null);

    const result = onBuy(itemId);
    if (result.status === 'broke') {
      setMessage('Недостаточно монет');
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
      <WalletBar coins={coins} bookTokens={bookTokens} ink={ink} />

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

      <Button fullWidth disabled={spinning || !canAfford} onClick={handleBuy}>
        {spinning
          ? 'Открывается…'
          : canAfford
            ? item.action === 'open_chest_plus'
              ? 'Купить и открыть'
              : item.action === 'reset_chest'
                ? 'Сбросить ожидание'
                : 'Купить'
            : 'Недостаточно'}
      </Button>

      {message && <p className="goldMessage">{message}</p>}
    </section>
  );
}
