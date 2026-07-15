import styles from './ClaimMark.module.css';

interface ClaimMarkProps {
  compact?: boolean;
  className?: string;
}

export function ClaimMark({ compact = false, className }: ClaimMarkProps) {
  return (
    <span
      className={`${styles.mark} ${compact ? styles.compact : ''} ${className ?? ''}`}
      aria-label="Получено"
      role="img"
    >
      ✓
    </span>
  );
}
