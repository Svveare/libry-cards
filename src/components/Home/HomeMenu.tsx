import type { HomeMenuId } from '../../types';
import styles from './HomeMenu.module.css';

interface HomeMenuProps {
  onSelect: (id: HomeMenuId) => void;
  bonusCaseOpens?: number;
  dailyStreak?: number;
}

const ICONS: Record<string, string> = {
  daily: '✦',
  pass: '◈',
  shop: '◆',
  library: '▤',
  quests: '☑',
  friends: '☺',
};

const ITEMS: {
  id: HomeMenuId;
  label: string;
  hint: string;
  featured?: boolean;
}[] = [
  { id: 'daily', label: 'Ежедневный бонус', hint: 'Спин раз в сутки', featured: true },
  { id: 'pass', label: 'Сезон', hint: 'Battle Pass · 30 уровней' },
  { id: 'shop', label: 'Магазин', hint: 'Сундуки и кейсы' },
  { id: 'library', label: 'Библиотека', hint: 'Твоя коллекция' },
  { id: 'quests', label: 'Задания', hint: 'XP сезона + награды' },
  { id: 'friends', label: 'Друзья', hint: 'Пригласи друга' },
];

export function HomeMenu({
  onSelect,
  bonusCaseOpens = 0,
  dailyStreak = 0,
}: HomeMenuProps) {
  return (
    <nav className={styles.nav} aria-label="Главное меню">
      <div className={styles.list}>
        {ITEMS.map((item) => {
          let hint = item.hint;
          if (item.id === 'daily' && bonusCaseOpens > 0) {
            hint = `Бонус-кейсы: ${bonusCaseOpens} — открой здесь`;
          } else if (item.id === 'daily' && dailyStreak > 0) {
            hint = `Серия ${dailyStreak} дн. · вехи 3/7/14/30`;
          }

          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.item} ${item.featured ? styles.featured : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span className={styles.icon} aria-hidden>
                {ICONS[item.id]}
              </span>
              <span className={styles.labels}>
                <span className={styles.title}>{item.label}</span>
                <span className={styles.hint}>{hint}</span>
              </span>
              <span className={styles.arrow} aria-hidden>
                ›
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
