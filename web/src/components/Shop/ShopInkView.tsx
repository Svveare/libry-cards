import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Card } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../types';
import { getCardById } from '../../content/loader';
import { formatCooldown } from '../../utils/cooldown';
import { inkShopPrice } from '../../utils/ink';
import { inkShopRefreshRemainingMs } from '../../utils/inkShop';
import { getCardInitials } from '../Library/CardSlot';
import { Button } from '../ui/Button';
import { WalletBar } from '../ui/WalletBar';
import styles from './Shop.module.css';

interface ShopInkViewProps {
  coins: number;
  bookTokens: number;
  ink: number;
  offerIds: string[];
  rolledAt: string | null;
  onEnsureOffers: () => string[];
  onBuy: (
    cardId: string,
  ) => { status: 'ok'; card: Card } | { status: 'broke' } | { status: 'gone' };
  onReward: (card: Card) => void;
}

export function ShopInkView({
  coins,
  bookTokens,
  ink,
  offerIds,
  rolledAt,
  onEnsureOffers,
  onBuy,
  onReward,
}: ShopInkViewProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [ids, setIds] = useState(offerIds);

  useEffect(() => {
    setIds(onEnsureOffers());
  }, [onEnsureOffers]);

  const offers = ids
    .map((id) => getCardById(id))
    .filter((c): c is Card => Boolean(c));

  const refreshMs = inkShopRefreshRemainingMs(rolledAt);

  const handleBuy = (cardId: string) => {
    setMessage(null);
    const result = onBuy(cardId);
    if (result.status === 'broke') {
      setMessage('Недостаточно чернил');
      return;
    }
    if (result.status === 'gone') {
      setMessage('Карта недоступна');
      return;
    }
    setIds((prev) => prev.filter((id) => id !== cardId));
    onReward(result.card);
  };

  return (
    <section className={`viewEnter ${styles.shop}`}>
      <WalletBar coins={coins} bookTokens={bookTokens} ink={ink} />
      <p className={styles.lead}>
        Только недостающие карты. Обновление раз в 48 часов
        {refreshMs > 0 ? ` · через ${formatCooldown(refreshMs)}` : ''}.
      </p>

      {offers.length === 0 ? (
        <p className={styles.emptyInk}>
          Все страницы на месте. Чернила копятся — жди новые дыры в коллекции.
        </p>
      ) : (
        <div className={styles.inkGrid}>
          {offers.map((card) => {
            const price = inkShopPrice(card.rarity);
            const canBuy = ink >= price;
            const name = card.name === '—' ? 'Карта' : card.name;
            return (
              <article
                key={card.id}
                className={styles.inkCard}
                style={
                  {
                    '--card-rarity': RARITY_COLORS[card.rarity],
                  } as CSSProperties
                }
              >
                <span className={styles.inkInitials}>
                  {getCardInitials(name)}
                </span>
                <h3 className={styles.inkName}>{name}</h3>
                <p className={styles.inkRarity}>
                  {RARITY_LABELS[card.rarity]}
                </p>
                <p className={styles.inkPrice}>{price} чернил</p>
                <Button
                  fullWidth
                  disabled={!canBuy}
                  onClick={() => handleBuy(card.id)}
                >
                  {canBuy ? 'Купить' : 'Мало чернил'}
                </Button>
              </article>
            );
          })}
        </div>
      )}

      {message && <p className="goldMessage">{message}</p>}
    </section>
  );
}
