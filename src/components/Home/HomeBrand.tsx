import styles from './HomeBrand.module.css';

export function HomeBrand() {
  return (
    <header className={styles.brand}>
      <div className={styles.mark} aria-hidden>
        <span className={styles.bookLeft} />
        <span className={styles.spine} />
        <span className={styles.bookRight} />
      </div>
      <h1 className={styles.name}>Libry Cards</h1>
      <p className={styles.tagline}>Библиотека карточек</p>
    </header>
  );
}
