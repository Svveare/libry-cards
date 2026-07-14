import { useCallback, useState } from 'react';
import type { DailyReward } from '../../types';
import type { DailyPreviewResult } from '../../hooks/useProgress';
import { useCaseSpin } from '../../hooks/useCaseSpin';
import { useCooldownMs } from '../../hooks/useCooldownMs';
import { config, getChannelUrl } from '../../content/loader';
import {
  canOpenDaily,
  formatCooldown,
  getTimeUntilNextOpen,
} from '../../utils/dailyOpen';
import { Button } from '../ui/Button';
import { ChannelGate } from '../ui/ChannelGate';
import { CaseStrip } from './CaseStrip';
import styles from './DailyBonusView.module.css';

interface DailyBonusViewProps {
  lastDailyOpenAt: string | null;
  channelConfirmed: boolean;
  onPreview: () => DailyPreviewResult;
  onCommit: (reward: DailyReward) => void;
  onRewardRevealed: (reward: DailyReward) => void;
  onOpenChannel: (url: string) => void;
  onSyncSubscription: (subscribed: boolean) => void;
  initData: string;
}

export function DailyBonusView({
  lastDailyOpenAt,
  channelConfirmed,
  onPreview,
  onCommit,
  onRewardRevealed,
  onOpenChannel,
  onSyncSubscription,
  initData,
}: DailyBonusViewProps) {
  const [message, setMessage] = useState<string | null>(null);
  const getRemaining = useCallback(
    (at: string | null) => getTimeUntilNextOpen(at),
    [],
  );

  const { spinning, strip, startSpin, handleSpinEnd } = useCaseSpin({
    onCommit,
    onReveal: onRewardRevealed,
  });

  const channelRequired =
    config.telegramChannel.enabled && config.telegramChannel.requiredForDaily;
  const needsChannel = channelRequired && !channelConfirmed;
  const dailyReady = canOpenDaily(lastDailyOpenAt, 0);
  const canOpen = dailyReady && !needsChannel;
  const available = canOpen && !spinning;
  const cooldownMs = useCooldownMs(lastDailyOpenAt, getRemaining, !dailyReady);

  const handleOpen = () => {
    if (spinning) return;
    setMessage(null);

    const result = onPreview();
    if (result.status === 'channel') {
      setMessage(
        `Подпишись на ${config.telegramChannel.username}, затем нажми «Я подписался»`,
      );
      return;
    }
    if (result.status === 'cooldown') {
      setMessage('Бонус уже получен сегодня');
      return;
    }

    startSpin(result.reward);
  };

  return (
    <section className={`viewEnter ${styles.wrap}`}>
      <p className={styles.lead}>
        Крути бонус дня: монеты, карта или токен книги.
      </p>

      <CaseStrip items={strip} spinning={spinning} onSpinEnd={handleSpinEnd} />

      <Button fullWidth disabled={!available} onClick={handleOpen}>
        {spinning
          ? 'Открывается…'
          : needsChannel
            ? 'Сначала подпишись на канал'
            : dailyReady
              ? 'Открыть'
              : `Доступно через ${formatCooldown(cooldownMs)}`}
      </Button>

      {channelRequired ? (
        <ChannelGate
          channelConfirmed={channelConfirmed}
          initData={initData}
          onOpenChannel={() => onOpenChannel(getChannelUrl())}
          onSyncSubscription={(subscribed) => {
            onSyncSubscription(subscribed);
            if (subscribed) setMessage(null);
          }}
        />
      ) : null}

      {message && <p className="goldMessage">{message}</p>}
    </section>
  );
}
