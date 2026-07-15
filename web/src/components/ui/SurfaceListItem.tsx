import type { ReactNode } from 'react';
import styles from './SurfaceListItem.module.css';

interface SurfaceListItemProps {
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
}

/** Compact list card for quests and similar non-nav lists. */
export function SurfaceListItem({
  title,
  description,
  meta,
  action,
}: SurfaceListItemProps) {
  return (
    <article className={styles.item}>
      <div className={styles.head}>
        <h3 className={styles.title}>{title}</h3>
        {description ? <p className={styles.desc}>{description}</p> : null}
      </div>
      {(meta || action) && (
        <div className={styles.row}>
          {meta ? <div className={styles.meta}>{meta}</div> : <span />}
          {action}
        </div>
      )}
    </article>
  );
}
