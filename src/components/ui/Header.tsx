import styles from './Header.module.css';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export function Header({ title = 'Libry Cards', subtitle, onBack }: HeaderProps) {
  return (
    <header className={styles.header}>
      {onBack && (
        <button type="button" className={styles.back} onClick={onBack} aria-label="Назад">
          ←
        </button>
      )}
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  );
}
