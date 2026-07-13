import { useMemo } from 'react';
import {
  ACHIEVEMENTS,
  isAchievementComplete,
  scanCollectionStats,
} from '../../utils/achievements';
import type { AchievementId } from '../../utils/achievements';
import type { UserProgress } from '../../types';
import type { TelegramUser } from '../../hooks/useTelegram';
import { Header } from '../ui/Header';
import { Button } from '../ui/Button';
import styles from './ProfileView.module.css';

interface ProfileViewProps {
  user?: TelegramUser;
  userId: string;
  progress: UserProgress;
  isAdmin?: boolean;
  onBack: () => void;
  onOpenLibrary: () => void;
  onOpenAdmin?: () => void;
  onClaimAchievement: (id: AchievementId) => boolean;
}

export function ProfileView({
  user,
  userId,
  progress,
  isAdmin = false,
  onBack,
  onOpenLibrary,
  onOpenAdmin,
  onClaimAchievement,
}: ProfileViewProps) {
  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
    : 'Гость';

  const collectionStats = useMemo(
    () => scanCollectionStats(progress.collectedCardIds),
    [progress.collectedCardIds],
  );

  return (
    <section className="viewEnter">
      <Header title="Профиль" onBack={onBack} />
      <div className={styles.card}>
        <div className={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
        <h2 className={styles.name}>{name}</h2>
        {user?.username && <p className={styles.username}>@{user.username}</p>}
        <p className={styles.id}>ID: {userId}</p>
      </div>

      <div className={styles.refBadge}>
        <span>Приглашено</span>
        <strong>{progress.referralCount}</strong>
        <em className={styles.refHint}>позже с сервера</em>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Монеты</span>
          <span className={styles.value}>{progress.coins}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Чернила</span>
          <span className={styles.value}>{progress.ink}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Рейтинг</span>
          <span className={styles.value}>{progress.rating}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Карты</span>
          <span className={styles.value}>
            {progress.collectedCardIds.length}
          </span>
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Ачивки</h3>
      <div className={styles.achievements}>
        {ACHIEVEMENTS.map((a) => {
          const done = isAchievementComplete(a.id, progress, collectionStats);
          const claimed = progress.claimedAchievementIds.includes(a.id);
          return (
            <article key={a.id} className={styles.achievement}>
              <div>
                <p className={styles.achTitle}>{a.title}</p>
                <p className={styles.achDesc}>{a.description}</p>
                <p className={styles.achReward}>+{a.rewardCoins} монет</p>
              </div>
              <Button
                disabled={!done || claimed}
                onClick={() => onClaimAchievement(a.id)}
              >
                {claimed ? 'Забрано' : done ? 'Забрать' : 'Ещё нет'}
              </Button>
            </article>
          );
        })}
      </div>

      <div className={styles.actions}>
        <Button fullWidth onClick={onOpenLibrary}>
          Открыть библиотеку
        </Button>
        {isAdmin && onOpenAdmin ? (
          <Button fullWidth variant="secondary" onClick={onOpenAdmin}>
            Админка контента
          </Button>
        ) : null}
      </div>
    </section>
  );
}
