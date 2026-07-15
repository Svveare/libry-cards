import { useState, type CSSProperties } from 'react';
import type { Card } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../types';
import { getBookById, getShelfById } from '../../content/loader';
import { getCardInitials } from './CardSlot';
import { Button } from '../ui/Button';
import styles from './CardDetailModal.module.css';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = RARITY_COLORS[card.rarity];
  const shelf = getShelfById(card.shelfId);
  const book = getBookById(card.bookId);
  const showImage = Boolean(card.image) && !imgFailed;
  const description =
    card.description?.trim() ||
    'Описание пока пустое — его можно задать в админке.';

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-detail-title"
        style={{ '--card-rarity': color } as CSSProperties}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className={styles.hero}>
          {showImage ? (
            <img
              src={card.image}
              alt={card.name}
              className={styles.heroImage}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className={styles.heroInitials}>
              {getCardInitials(card.name)}
            </span>
          )}
          <div className={styles.heroShade}>
            <p className={styles.rarity}>{RARITY_LABELS[card.rarity]}</p>
            <h2 id="card-detail-title" className={styles.title}>
              {card.name}
            </h2>
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.origin}>
            {[shelf?.name, book?.name].filter(Boolean).join(' · ') ||
              'Библиотека'}
          </p>
          <p className={styles.description}>{description}</p>
          <Button fullWidth onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
