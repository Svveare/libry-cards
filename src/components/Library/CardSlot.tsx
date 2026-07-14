import { useState, type CSSProperties } from 'react';
import type { Card } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../types';
import styles from './CardSlot.module.css';

interface CardSlotProps {
  card: Card;
  collected: boolean;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getCardInitials(name: string): string {
  return getInitials(name);
}

export function CardSlot({ card, collected }: CardSlotProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!collected) {
    return <div className={styles.empty} aria-label="Пустой слот" />;
  }

  const color = RARITY_COLORS[card.rarity];
  const showImage = Boolean(card.image) && !imgFailed;

  return (
    <article
      className={styles.card}
      style={{ '--card-rarity': color } as CSSProperties}
    >
      <div className={styles.art}>
        {showImage ? (
          <img
            src={card.image}
            alt={card.name}
            className={styles.image}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className={styles.initials}>{getInitials(card.name)}</span>
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>{card.name}</h3>
        <span className={styles.rarity}>{RARITY_LABELS[card.rarity]}</span>
      </div>
    </article>
  );
}
