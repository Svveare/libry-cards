import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Card } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../types';
import styles from './CardSlot.module.css';

interface CardSlotProps {
  card: Card;
  collected: boolean;
  onSelect?: (card: Card) => void;
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

export function CardSlot({ card, collected, onSelect }: CardSlotProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!collected) {
    return <div className={styles.empty} aria-label="Пустой слот" />;
  }

  const color = RARITY_COLORS[card.rarity];
  const showImage = Boolean(card.image) && !imgFailed;
  const interactive = Boolean(onSelect);
  const isSecret = card.rarity === 'secret';

  const open = () => onSelect?.(card);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <article
      className={`${styles.card} ${isSecret ? styles.secret : ''} ${interactive ? styles.cardInteractive : ''}`}
      style={{ '--card-rarity': color } as CSSProperties}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? open : undefined}
      onKeyDown={onKeyDown}
      aria-label={
        interactive ? `${card.name}, ${RARITY_LABELS[card.rarity]}` : undefined
      }
    >
      <div className={styles.art}>
        {showImage ? (
          <img
            src={card.image}
            alt=""
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
