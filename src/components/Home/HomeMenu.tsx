import type { HomeMenuId } from '../../types';
import styles from './HomeMenu.module.css';

interface HomeMenuProps {
  onSelect: (id: HomeMenuId) => void;
}

const ICONS: Record<string, string> = {
  daily: '✦',
  shop: '◈',
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
  { id: 'shop', label: 'Магазин', hint: 'Сундуки и кейсы' },
  { id: 'library', label: 'Библиотека', hint: 'Твоя коллекция' },
  { id: 'quests', label: 'Задания', hint: 'Монеты за дела' },
  { id: 'friends', label: 'Друзья', hint: 'Пригласи друга' },
];

export function HomeMenu({ onSelect }: HomeMenuProps) {
  return (
    <nav className={styles.nav} aria-label="Главное меню">
      <div className={styles.list}>
        {ITEMS.map((item) => (
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
              <span className={styles.hint}>{item.hint}</span>
            </span>
            <span className={styles.arrow} aria-hidden>
              ›
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
