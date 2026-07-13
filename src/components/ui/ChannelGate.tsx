import { config } from '../../content/loader';
import { Button } from './Button';
import styles from './ChannelGate.module.css';

interface ChannelGateProps {
  channelConfirmed: boolean;
  onOpenChannel: () => void;
  onConfirmChannel: () => void;
}

export function ChannelGate({
  channelConfirmed,
  onOpenChannel,
  onConfirmChannel,
}: ChannelGateProps) {
  if (channelConfirmed) {
    return (
      <p className={styles.ok}>
        Канал {config.telegramChannel.username} · ок
      </p>
    );
  }

  return (
    <div className={styles.box}>
      <Button fullWidth variant="secondary" onClick={onOpenChannel}>
        Подписаться на {config.telegramChannel.username}
      </Button>
      <Button fullWidth variant="ghost" onClick={onConfirmChannel}>
        Я подписался
      </Button>
    </div>
  );
}
