import { useMemo } from 'react';
import { getStands, getShelfProgress } from '../../content/loader';
import { STAND_TYPE_LABELS } from '../../types';
import styles from './StandsView.module.css';

interface StandsViewProps {
  collectedSet: Set<string>;
  unlockedSecretBookIds?: string[];
  onStandSelect: (standId: string) => void;
  hideTitle?: boolean;
}

export function StandsView({
  collectedSet,
  unlockedSecretBookIds = [],
  onStandSelect,
  hideTitle = false,
}: StandsViewProps) {
  const standRows = useMemo(
    () => {
      const allStands = getStands();
      return allStands.map((stand) => {
        const shelfCount = stand.shelves.length;
        const progress = stand.shelves.reduce(
          (acc, shelf) => {
            const p = getShelfProgress(
              shelf,
              collectedSet,
              unlockedSecretBookIds,
            );
            return {
              collected: acc.collected + p.collected,
              total: acc.total + p.total,
            };
          },
          { collected: 0, total: 0 },
        );
        return { stand, shelfCount, progress };
      });
    },
    [collectedSet, unlockedSecretBookIds],
  );

  return (
    <section className="viewEnter">
      {!hideTitle && (
        <>
          <h2 className={styles.title}>Библиотека</h2>
          <p className={styles.subtitle}>Выбери стенд с полками</p>
        </>
      )}
      <div className={styles.list}>
        {standRows.map(({ stand, shelfCount, progress }) => (
          <button
            key={stand.id}
            type="button"
            className={styles.card}
            onClick={() => onStandSelect(stand.id)}
          >
            <div className={styles.row}>
              <h3 className={styles.name}>{stand.name}</h3>
              <span className={styles.badge}>
                {STAND_TYPE_LABELS[stand.type]}
              </span>
            </div>
            <p className={styles.meta}>
              {shelfCount === 0
                ? 'Пока пусто'
                : `${shelfCount} ${shelfCount === 1 ? 'полка' : 'полок'} · ${progress.collected}/${progress.total}`}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
