import { useCallback, useState } from 'react';
import type { DailyReward } from '../../types';
import type { DailyPreviewResult } from '../../hooks/useProgress';
import { useCaseSpin } from '../../hooks/useCaseSpin';
import { useCooldownMs } from '../../hooks/useCooldownMs';
import { config, getChannelUrl } from '../../content/loader';
import {
  canOpenDaily,
  getTimeUntilNextOpen,
} from '../../utils/dailyOpen';
import { formatCooldown } from '../../utils/cooldown';
import {
  STREAK_MILESTONES,
  STREAK_REWARDS,
} from '../../utils/streak';
import { Button } from '../ui/Button';
import { ChannelGate } from '../ui/ChannelGate';
import { CaseStrip } from './CaseStrip';
import styles from './DailyBonusView.module.css';

interface DailyBonusViewProps {
  lastDailyOpenAt: string | null;
  bonusCaseOpens: number;
  dailyStreak: number;
  claimedStreakMilestones: number[];
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
  bonusCaseOpens,
  dailyStreak,
  claimedStreakMilestones,
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
  const freeReady = canOpenDaily(lastDailyOpenAt, 0);
  const canOpen =
    canOpenDaily(lastDailyOpenAt, bonusCaseOpens) && !needsChannel;
  const usingBonus = !freeReady && bonusCaseOpens > 0;
  const available = canOpen && !spinning;
  const cooldownMs = useCooldownMs(
    lastDailyOpenAt,
    getRemaining,
    !freeReady && !usingBonus,
  );

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
      setMessage(
        'Бонус уже получен сегодня. Жди или получи бонус-кейс в сезоне / админке.',
      );
      return;
    }

    startSpin(result.reward);
  };

  const buttonLabel = spinning
    ? 'Открывается…'
    : needsChannel
      ? 'Сначала подпишись на канал'
      : freeReady
        ? 'Открыть'
        : usingBonus
          ? `Открыть бонус-кейс (${bonusCaseOpens})`
          : `Доступно через ${formatCooldown(cooldownMs)}`;

  return (
    <section className={`viewEnter ${styles.wrap}`}>
      <p className={styles.lead}>
        Крути бонус дня: монеты, карта или токен книги.
        {bonusCaseOpens > 0
          ? ` У тебя ${bonusCaseOpens} бонус-открыт${bonusCaseOpens === 1 ? 'ие' : bonusCaseOpens < 5 ? 'ия' : 'ий'} — можно крутить поверх кулдауна.`
          : null}
      </p>

      <div className={styles.streak}>
        <p className={styles.streakTitle}>
          Серия: <strong>{dailyStreak}</strong> дн.
        </p>
        <div className={styles.streakChips}>
          {STREAK_MILESTONES.map((m) => {
            const claimed = claimedStreakMilestones.includes(m);
            const reached = dailyStreak >= m;
            return (
              <span
                key={m}
                className={
                  claimed
                    ? styles.chipDone
                    : reached
                      ? styles.chipReady
                      : styles.chipSoon
                }
              >
                {m}д · +{STREAK_REWARDS[m]} кейс
              </span>
            );
          })}
        </div>
      </div>

      {needsChannel ? (
        <ChannelGate
          channelConfirmed={channelConfirmed}
          initData={initData}
          onOpenChannel={() => onOpenChannel(getChannelUrl())}
          onSyncSubscription={onSyncSubscription}
        />
      ) : null}

      <CaseStrip
        items={strip}
        spinning={spinning}
        onSpinEnd={spinning ? handleSpinEnd : undefined}
      />

      <Button fullWidth disabled={!available} onClick={handleOpen}>
        {buttonLabel}
      </Button>

      {message ? <p className="goldMessage">{message}</p> : null}
    </section>
  );
}
