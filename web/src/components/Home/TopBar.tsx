import { memo } from 'react';
import type { TelegramUser } from '../../hooks/useTelegram';
import styles from './TopBar.module.css';

interface TopBarProps {
  user?: TelegramUser;
  coins: number;
  rating: number;
  onProfileClick: () => void;
}

export const TopBar = memo(function TopBar({
  user,
  coins,
  rating,
  onProfileClick,
}: TopBarProps) {
  const name = user?.first_name ?? 'Гость';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className={styles.bar}>
      <button type="button" className={styles.profile} onClick={onProfileClick}>
        <span className={styles.avatar} aria-hidden>
          {initial}
        </span>
        <span className={styles.name}>{name}</span>
      </button>
      <div className={styles.stats}>
        <div className={styles.stat} title="Монеты">
          <span className={styles.statIcon} aria-hidden>
            ◈
          </span>
          <div className={styles.statText}>
            <span className={styles.statLabel}>Монеты</span>
            <span className={styles.statValue}>{coins}</span>
          </div>
        </div>
        <div className={`${styles.stat} ${styles.bookmark}`} title="Рейтинг">
          <span className={styles.statIcon} aria-hidden>
            ⌘
          </span>
          <div className={styles.statText}>
            <span className={styles.statLabel}>Собрано</span>
            <span className={styles.statValue}>{rating}</span>
          </div>
        </div>
      </div>
    </header>
  );
});
