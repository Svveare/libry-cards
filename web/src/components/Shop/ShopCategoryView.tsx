import type { ShopCategoryId, ShopItemId } from '../../types';
import { config } from '../../content/loader';
import { CatalogRow } from '../ui/CatalogRow';
import { WalletBar } from '../ui/WalletBar';
import styles from './Shop.module.css';

interface ShopCategoryViewProps {
  categoryId: ShopCategoryId;
  coins: number;
  bookTokens: number;
  ink: number;
  onOpenItem: (itemId: ShopItemId) => void;
  onOpenFreeChest: () => void;
}

function priceLabel(
  price: number,
  action: string,
  bookTokens: number,
): string {
  if (price <= 0) return 'Бесплатно';
  if (action === 'book_music') {
    return bookTokens > 0 ? '1 токен книги' : `${price} монет`;
  }
  return `${price} монет`;
}

export function ShopCategoryView({
  categoryId,
  coins,
  bookTokens,
  ink,
  onOpenItem,
  onOpenFreeChest,
}: ShopCategoryViewProps) {
  const items = config.shop.items.filter((i) => i.categoryId === categoryId);

  return (
    <section className={`viewEnter ${styles.shop}`}>
      <WalletBar coins={coins} bookTokens={bookTokens} ink={ink} />
      <div className={styles.list}>
        {items.map((item) => {
          const isFreeChest = item.action === 'open_chest_free';
          const isPlus = item.action === 'open_chest_plus';
          return (
            <CatalogRow
              key={item.id}
              title={item.title}
              description={item.description}
              meta={priceLabel(item.price, item.action, bookTokens)}
              accent={isFreeChest ? 'free' : isPlus ? 'premium' : 'default'}
              ctaLabel={isFreeChest ? 'Открыть' : undefined}
              onClick={() =>
                isFreeChest ? onOpenFreeChest() : onOpenItem(item.id)
              }
            />
          );
        })}
      </div>
    </section>
  );
}
