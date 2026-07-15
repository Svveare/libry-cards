import { useState } from 'react';
import type { Card } from '../../types';
import { getBookById, getShelfById, getBookProgress } from '../../content/loader';
import { RARITY_LABELS } from '../../types';
import { Header } from '../ui/Header';
import { CardSlot } from './CardSlot';
import { CardDetailModal } from './CardDetailModal';
import styles from './BookView.module.css';

interface BookViewProps {
  bookId: string;
  collectedSet: Set<string>;
  onBack: () => void;
}

export function BookView({ bookId, collectedSet, onBack }: BookViewProps) {
  const [selected, setSelected] = useState<Card | null>(null);
  const book = getBookById(bookId);
  if (!book) return null;

  const shelf = getShelfById(book.shelfId);
  const { collected, total } = getBookProgress(book, collectedSet);
  const pages = [...book.pages].sort((a, b) => a.number - b.number);

  return (
    <div className={`viewEnter ${styles.bookView}`}>
      <Header title={book.name} subtitle={shelf?.name} onBack={onBack} />
      <div className={styles.meta}>
        <span className={styles.rarity}>{RARITY_LABELS[book.rarity]}</span>
        <span className={styles.progress}>
          {collected}/{total} карточек
        </span>
      </div>
      <p className={styles.hint}>Нажми на карту, чтобы открыть крупнее</p>

      <div className={styles.pages}>
        {pages.map((page) => {
          const sortedCards = [...page.cards].sort(
            (a, b) => a.slotIndex - b.slotIndex,
          );
          const pageCollected = sortedCards.filter((c) =>
            collectedSet.has(c.id),
          ).length;

          return (
            <section key={page.id} className={styles.pageBlock}>
              <div className={styles.pageHead}>
                <h3 className={styles.pageTitle}>
                  Страница {page.number} · {RARITY_LABELS[page.rarity]}
                </h3>
                <span className={styles.pageCount}>
                  {pageCollected}/{sortedCards.length}
                </span>
              </div>
              <div className={styles.grid}>
                {sortedCards.map((card) => (
                  <CardSlot
                    key={card.id}
                    card={card}
                    collected={collectedSet.has(card.id)}
                    onSelect={
                      collectedSet.has(card.id) ? setSelected : undefined
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {selected ? (
        <CardDetailModal card={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
