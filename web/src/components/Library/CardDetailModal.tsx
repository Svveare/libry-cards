import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../types';
import { getCardInitials } from './CardSlot';
import { CardImageLightbox } from './CardImageLightbox';
import { Button } from '../ui/Button';
import styles from './CardDetailModal.module.css';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const color = RARITY_COLORS[card.rarity];
  const showImage = Boolean(card.image) && !imgFailed;
  const description = card.description?.trim() ?? '';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const modal = (
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

        <div className={styles.cardStage}>
          <button
            type="button"
            className={styles.cardFrame}
            onClick={() => {
              if (showImage) setLightboxOpen(true);
            }}
            disabled={!showImage}
            aria-label={
              showImage ? 'Открыть изображение на весь экран' : undefined
            }
          >
            {showImage ? (
              <img
                src={card.image}
                alt={card.name}
                className={styles.heroImage}
                decoding="async"
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
          </button>
        </div>

        <div className={styles.body}>
          {description ? (
            <div className={styles.descScroll}>
              <p className={styles.description}>{description}</p>
            </div>
          ) : null}
          <Button fullWidth onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modal, document.body)}
      {lightboxOpen && showImage && card.image ? (
        <CardImageLightbox
          src={card.image}
          alt={card.name}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
