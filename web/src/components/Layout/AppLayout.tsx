import type { ReactNode } from 'react';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={styles.layout} data-app-layout>
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.vignette} aria-hidden />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
