import { useState } from 'react';
import type { Card } from '../../types';
import {
  getBookById,
  getShelfById,
  getBookProgress,
  getVisiblePages,
  isBookBaseComplete,
  isBookFullyComplete,
} from '../../content/loader';
import { RARITY_LABELS } from '../../types';
import { Header } from '../ui/Header';
import { CardSlot } from './CardSlot';
import { CardDetailModal } from './CardDetailModal';
import styles from './BookView.module.css';

interface BookViewProps {
  bookId: string;
  collectedSet: Set<string>;
  unlockedSecretBookIds?: string[];
  onBack: () => void;
}

export function BookView({
  bookId,
  collectedSet,
  unlockedSecretBookIds = [],
  onBack,
}: BookViewProps) {
  const [selected, setSelected] = useState<Card | null>(null);
  const book = getBookById(bookId);
  if (!book) return null;

  const shelf = getShelfById(book.shelfId);
  const unlockedSet = new Set(unlockedSecretBookIds);
  const { collected, total } = getBookProgress(
    book,
    collectedSet,
    unlockedSet,
  );
  const pages = [...getVisiblePages(book, unlockedSet)].sort(
    (a, b) => a.number - b.number,
  );
  const fullySecret = isBookFullyComplete(book, collectedSet, unlockedSet);
  const secretUnlocked = unlockedSet.has(book.id) && !fullySecret;
  const baseDone =
    !fullySecret &&
    !secretUnlocked &&
    isBookBaseComplete(book, collectedSet);
  const bookClass = [
    'viewEnter',
    styles.bookView,
    fullySecret ? styles.bookAuraSecret : '',
    secretUnlocked ? styles.bookAuraUnlocked : '',
    baseDone ? styles.bookAuraBase : '',
  ]
    .filter(Boolean)
    .join(' ');
  const metaClass = [
    styles.meta,
    fullySecret ? styles.metaSecret : '',
    secretUnlocked ? styles.metaUnlocked : '',
    baseDone ? styles.metaGlow : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={bookClass}>
      <Header title={book.name} subtitle={shelf?.name} onBack={onBack} />
      <div className={styles.bookChrome}>
        <div className={metaClass}>
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
            const pageTitle = page.secret
              ? `Страница ${page.number} · ${RARITY_LABELS.secret}`
              : `Страница ${page.number} · ${RARITY_LABELS[page.rarity]}`;

            return (
              <section
                key={page.id}
                className={`${styles.pageBlock} ${page.secret ? styles.pageSecret : ''}`}
              >
                <div className={styles.pageHead}>
                  <h3 className={styles.pageTitle}>{pageTitle}</h3>
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
      </div>

      {selected ? (
        <CardDetailModal card={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
