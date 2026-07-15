import styles from './WalletBar.module.css';

interface WalletBarProps {
  coins: number;
  bookTokens?: number;
  ink?: number;
}

export function WalletBar({
  coins,
  bookTokens = 0,
  ink = 0,
}: WalletBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.chip}>
        <span className={styles.dot} aria-hidden />
        <strong>{coins}</strong>
        <span className={styles.label}>монет</span>
      </span>
      <span className={`${styles.chip} ${styles.ink}`}>
        <strong>{ink}</strong>
        <span className={styles.label}>чернила</span>
      </span>
      {bookTokens > 0 ? (
        <span className={styles.chip}>
          <strong>{bookTokens}</strong>
          <span className={styles.label}>книги</span>
        </span>
      ) : null}
    </div>
  );
}
