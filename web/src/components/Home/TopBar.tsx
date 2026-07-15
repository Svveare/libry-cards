import { memo } from 'react';
import type { TelegramUser } from '../../hooks/useTelegram';
import styles from './TopBar.module.css';

interface TopBarProps {
  user?: TelegramUser;
  coins: number;
  rating: number;
  onProfileClick: () => void;
  showFullscreenToggle?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const TopBar = memo(function TopBar({
  user,
  coins,
  rating,
  onProfileClick,
  showFullscreenToggle = false,
  isFullscreen = false,
  onToggleFullscreen,
}: TopBarProps) {
  const name = user?.first_name ?? 'Гость';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className={`${styles.bar} ${isFullscreen ? styles.barFs : ''}`}>
      <button
        type="button"
        className={styles.profile}
        onClick={onProfileClick}
        aria-label={name}
      >
        <span className={styles.avatar} aria-hidden>
          {initial}
        </span>
        {!isFullscreen ? <span className={styles.name}>{name}</span> : null}
      </button>
      <div className={styles.actions}>
        {showFullscreenToggle && onToggleFullscreen ? (
          <button
            type="button"
            className={styles.fsBtn}
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            title={isFullscreen ? 'Обычный режим' : 'На весь экран'}
            aria-label={isFullscreen ? 'Свернуть экран' : 'На весь экран'}
          >
            {isFullscreen ? '↓' : '⛶'}
          </button>
        ) : null}
        <div className={styles.stats}>
          <div className={styles.stat} title="Монеты">
            <span className={styles.statIcon} aria-hidden>
              ◈
            </span>
            <div className={styles.statText}>
              {!isFullscreen ? (
                <span className={styles.statLabel}>Монеты</span>
              ) : null}
              <span className={styles.statValue}>{coins}</span>
            </div>
          </div>
          <div className={`${styles.stat} ${styles.bookmark}`} title="Рейтинг">
            <span className={styles.statIcon} aria-hidden>
              ⌘
            </span>
            <div className={styles.statText}>
              {!isFullscreen ? (
                <span className={styles.statLabel}>Собрано</span>
              ) : null}
              <span className={styles.statValue}>{rating}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});
