import type { CSSProperties } from 'react';
import {
  getShelfById,
  getStandById,
  getBookProgress,
  getShelfProgress,
  isBookBaseComplete,
  isBookFullyComplete,
} from '../../content/loader';
import { RARITY_COLORS } from '../../types';
import { Header } from '../ui/Header';
import styles from './ShelfView.module.css';

interface StandDetailViewProps {
  standId: string;
  collectedSet: Set<string>;
  unlockedSecretBookIds?: string[];
  onBack: () => void;
  onShelfSelect: (shelfId: string) => void;
}

export function StandDetailView({
  standId,
  collectedSet,
  unlockedSecretBookIds = [],
  onBack,
  onShelfSelect,
}: StandDetailViewProps) {
  const stand = getStandById(standId);
  if (!stand) return null;

  return (
    <section className="viewEnter">
      <Header title={stand.name} subtitle="Полки стенда" onBack={onBack} />
      {stand.shelves.length === 0 ? (
        <p className={styles.empty}>Пока пусто — полки появятся позже</p>
      ) : (
        <div className={styles.list}>
          {stand.shelves.map((shelf) => {
            const { collected, total } = getShelfProgress(
              shelf,
              collectedSet,
              unlockedSecretBookIds,
            );
            return (
              <button
                key={shelf.id}
                type="button"
                className={styles.shelf}
                onClick={() => onShelfSelect(shelf.id)}
              >
                <span className={styles.shelfName}>{shelf.name}</span>
                <span className={styles.shelfMeta}>
                  {shelf.books.length} кн. · {collected}/{total}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface ShelfViewProps {
  shelfId: string;
  collectedSet: Set<string>;
  unlockedSecretBookIds?: string[];
  onBack: () => void;
  onBookSelect: (bookId: string) => void;
}

export function ShelfView({
  shelfId,
  collectedSet,
  unlockedSecretBookIds = [],
  onBack,
  onBookSelect,
}: ShelfViewProps) {
  const shelf = getShelfById(shelfId);
  if (!shelf) return null;
  const stand = getStandById(shelf.standId);
  const unlockedSet = new Set(unlockedSecretBookIds);

  return (
    <section className="viewEnter">
      <Header title={shelf.name} subtitle={stand?.name} onBack={onBack} />
      {shelf.books.length === 0 ? (
        <p className={styles.empty}>На полке пока нет книг</p>
      ) : (
        <div className={styles.board}>
          <div className={styles.books}>
            {shelf.books.map((book) => {
              const { collected, total } = getBookProgress(
                book,
                collectedSet,
                unlockedSet,
              );
              const color = RARITY_COLORS[book.rarity];
              const fullySecret = isBookFullyComplete(
                book,
                collectedSet,
                unlockedSet,
              );
              const secretUnlocked =
                !fullySecret && unlockedSet.has(book.id);
              const baseDone =
                !fullySecret &&
                !secretUnlocked &&
                isBookBaseComplete(book, collectedSet);
              const spineClass = [
                styles.spine,
                fullySecret ? styles.spineSecretComplete : '',
                secretUnlocked ? styles.spineSecretUnlocked : '',
                baseDone ? styles.spineBaseComplete : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={book.id}
                  type="button"
                  className={spineClass}
                  style={{ '--spine-color': color } as CSSProperties}
                  onClick={() => onBookSelect(book.id)}
                >
                  <span className={styles.spineLabel}>{book.name}</span>
                  <span className={styles.spineProgress}>
                    {collected}/{total}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.plank} aria-hidden />
        </div>
      )}
    </section>
  );
}
