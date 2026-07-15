import styles from './WalletBar.module.css';

interface WalletBarProps {
  coins: number;
  pages?: number;
  ink?: number;
}

export function WalletBar({
  coins,
  pages = 0,
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
      {pages > 0 ? (
        <span className={styles.chip}>
          <strong>{pages}</strong>
          <span className={styles.label}>стр.</span>
        </span>
      ) : null}
    </div>
  );
}
