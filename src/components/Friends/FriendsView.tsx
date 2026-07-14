import { useState } from 'react';
import { config } from '../../content/loader';
import { REFERRAL_INVITEE_COINS } from '../../utils/ink';
import { buildReferralLink } from '../../utils/referralLink';
import { Header } from '../ui/Header';
import { Button } from '../ui/Button';
import styles from './FriendsView.module.css';

interface FriendsViewProps {
  userId: string;
  referralCount: number;
  onBack: () => void;
}

export function FriendsView({
  userId,
  referralCount,
  onBack,
}: FriendsViewProps) {
  const [copied, setCopied] = useState(false);
  const isGuest = !userId || userId === 'guest';
  const link = isGuest
    ? null
    : buildReferralLink(
        config.telegramBotUsername || 'librycards_bot',
        userId,
        config.telegramMiniAppShortName,
      );

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const share = () => {
    if (!link) return;
    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } };
      }
    ).Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Заходи в Libry Cards')}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <section className={`viewEnter ${styles.wrap}`}>
      <Header title="Друзья" onBack={onBack} />

      <div className={styles.hero}>
        <h2 className={styles.title}>Пригласи друга</h2>
        <p className={styles.text}>
          По ссылке друг получит +{REFERRAL_INVITEE_COINS} монет.
        </p>
      </div>

      <div className={styles.badge}>
        <span className={styles.badgeLabel}>Приглашено</span>
        <strong className={styles.badgeValue}>{referralCount}</strong>
        <span className={styles.badgeHint}>синк с сервером позже</span>
      </div>

      {isGuest || !link ? (
        <p className={styles.text}>
          Открой приложение через бота @
          {config.telegramBotUsername || 'librycards_bot'}, чтобы получить
          ссылку.
        </p>
      ) : (
        <>
          <div className={styles.linkBox}>
            <p className={styles.link}>{link}</p>
          </div>

          <div className={styles.actions}>
            <Button fullWidth onClick={copy}>
              {copied ? 'Скопировано' : 'Скопировать ссылку'}
            </Button>
            <Button fullWidth variant="secondary" onClick={share}>
              Поделиться
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
