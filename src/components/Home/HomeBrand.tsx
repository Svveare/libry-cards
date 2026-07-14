import styles from './HomeBrand.module.css';

export function HomeBrand() {
  return (
    <header className={styles.brand}>
      <div className={styles.mark} aria-hidden>
        <svg
          className={styles.crescent}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M28 6.5C17.2 6.8 8.5 15.7 8.5 26.5C8.5 37.4 17.4 46.2 28.3 46.2C31.5 46.2 34.5 45.4 37.1 44C29.2 43.1 23.1 36.3 23.1 28.1C23.1 19.2 30.2 11.9 38.8 10.9C35.7 8.2 31.9 6.5 28 6.5Z"
            fill="url(#crescentGold)"
          />
          <defs>
            <linearGradient
              id="crescentGold"
              x1="12"
              y1="8"
              x2="38"
              y2="42"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ffe8a8" />
              <stop offset="1" stopColor="#a07828" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1 className={styles.name}>Libry Cards</h1>
      <p className={styles.tagline}>Библиотека карточек</p>
    </header>
  );
}
