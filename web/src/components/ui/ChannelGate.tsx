import { useState } from 'react';
import { config } from '../../content/loader';
import { checkChannelSubscription } from '../../utils/checkSubscription';
import { Button } from './Button';
import styles from './ChannelGate.module.css';

interface ChannelGateProps {
  channelConfirmed: boolean;
  initData: string;
  onOpenChannel: () => void;
  onSyncSubscription: (subscribed: boolean) => void;
}

export function ChannelGate({
  channelConfirmed,
  initData,
  onOpenChannel,
  onSyncSubscription,
}: ChannelGateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (channelConfirmed) {
    return (
      <p className={styles.ok}>
        Канал {config.telegramChannel.username} · ок
      </p>
    );
  }

  const handleConfirm = async () => {
    setError(null);
    if (!initData) {
      setError('Открой приложение через бота в Telegram');
      return;
    }
    setLoading(true);
    try {
      const result = await checkChannelSubscription(initData);
      if (!result.ok && result.error === 'network') {
        setError('Нет связи с сервером. Попробуй позже');
        return;
      }
      if (!result.subscribed) {
        setError(
          'Подписка не найдена. Подпишись на канал и нажми ещё раз',
        );
        onSyncSubscription(false);
        return;
      }
      onSyncSubscription(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.box}>
      <Button fullWidth variant="secondary" onClick={onOpenChannel}>
        Подписаться на {config.telegramChannel.username}
      </Button>
      <Button fullWidth variant="ghost" onClick={() => void handleConfirm()} disabled={loading}>
        {loading ? 'Проверяю…' : 'Я подписался'}
      </Button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
