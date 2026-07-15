import type { ShopCategoryId } from '../../types';
import { config } from '../../content/loader';
import { CatalogRow } from '../ui/CatalogRow';
import { WalletBar } from '../ui/WalletBar';
import styles from './Shop.module.css';

interface ShopViewProps {
  coins: number;
  pages: number;
  ink: number;
  onOpenCategory: (categoryId: ShopCategoryId) => void;
}

const ACCENTS: Partial<
  Record<ShopCategoryId, 'default' | 'free' | 'premium'>
> = {
  chests: 'free',
  cases: 'default',
  guarantee: 'premium',
  books: 'default',
  pages: 'premium',
  ink: 'premium',
};

export function ShopView({
  coins,
  pages,
  ink,
  onOpenCategory,
}: ShopViewProps) {
  return (
    <section className={`viewEnter ${styles.shop}`}>
      <WalletBar coins={coins} pages={pages} ink={ink} />
      <div className={styles.list}>
        {config.shop.categories.map((cat) => (
          <CatalogRow
            key={cat.id}
            title={cat.title}
            description={cat.hint}
            accent={ACCENTS[cat.id] ?? 'default'}
            onClick={() => onOpenCategory(cat.id)}
          />
        ))}
      </div>
    </section>
  );
}
