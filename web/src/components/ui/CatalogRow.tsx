import type { ReactNode } from 'react';
import styles from './CatalogRow.module.css';

interface CatalogRowProps {
  title: string;
  description?: string;
  meta?: ReactNode;
  accent?: 'default' | 'free' | 'premium' | 'secret';
  disabled?: boolean;
  onClick: () => void;
  ctaLabel?: string;
}

export function CatalogRow({
  title,
  description,
  meta,
  accent = 'default',
  disabled = false,
  onClick,
  ctaLabel,
}: CatalogRowProps) {
  return (
    <button
      type="button"
      className={`${styles.row} ${styles[accent]}${disabled ? ` ${styles.disabled}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    >
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {description ? (
          <span className={styles.desc}>{description}</span>
        ) : null}
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>
      {ctaLabel ? (
        <span className={styles.cta}>{ctaLabel}</span>
      ) : (
        <span className={styles.chevron} aria-hidden>
          ›
        </span>
      )}
    </button>
  );
}
