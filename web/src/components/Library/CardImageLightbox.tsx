import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './CardImageLightbox.module.css';

interface CardImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function CardImageLightbox({
  src,
  alt,
  onClose,
}: CardImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Закрыть"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        className={styles.image}
        decoding="async"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
