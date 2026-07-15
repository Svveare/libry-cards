import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ChestVariant, DailyReward } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../types';
import { config, getChannelUrl } from '../../content/loader';
import { useCooldownMs } from '../../hooks/useCooldownMs';
import { canOpenChest, getTimeUntilNextChest } from '../../utils/chestOpen';
import { formatCooldown } from '../../utils/cooldown';
import {
  resolveChestPick,
  rollChestSlots,
  type ChestSlot,
} from '../../utils/chestRoll';
import { getCardInitials } from '../Library/CardSlot';
import { Button } from '../ui/Button';
import { ChannelGate } from '../ui/ChannelGate';
import styles from './ChestView.module.css';

interface ChestViewProps {
  lastChestOpenAt: string | null;
  collectedIds: string[];
  unlockedSecretBookIds?: string[];
  variant?: ChestVariant;
  channelConfirmed: boolean;
  onStart: (variant: ChestVariant) => boolean;
  onCommitOpen: (variant: ChestVariant) => void;
  onCommit: (reward: DailyReward) => void;
  onRewardRevealed: (reward: DailyReward) => void;
  onOpenChannel: (url: string) => void;
  onSyncSubscription: (subscribed: boolean) => void;
  initData: string;
}

type Phase = 'idle' | 'picking' | 'done';

const REVEAL_MS = 520;

function TreasureChest({
  open,
  locked,
}: {
  open: boolean;
  locked?: boolean;
}) {
  return (
    <div
      className={`${styles.chestArt} ${open ? styles.chestOpen : ''} ${locked ? styles.chestLocked : ''}`}
      aria-hidden
    >
      <div className={styles.chestGlow} />
      <div className={styles.chestLid}>
        <div className={styles.lidFront} />
        <div className={styles.lidBand} />
      </div>
      <div className={styles.chestBody}>
        <div className={styles.bodyBand} />
        <div className={styles.lock}>
          <span className={styles.lockHole} />
        </div>
      </div>
      {!open && <div className={styles.chestBaseShadow} />}
    </div>
  );
}

export function ChestView({
  lastChestOpenAt,
  collectedIds,
  unlockedSecretBookIds = [],
  variant = 'free',
  channelConfirmed,
  onStart,
  onCommitOpen,
  onCommit,
  onRewardRevealed,
  onOpenChannel,
  onSyncSubscription,
  initData,
}: ChestViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [slots, setSlots] = useState<ChestSlot[]>([]);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const revealTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (revealTimer.current != null) {
        window.clearTimeout(revealTimer.current);
      }
    };
  }, []);

  const getRemaining = useCallback(
    (at: string | null) => getTimeUntilNextChest(at),
    [],
  );

  const channelRequired =
    variant === 'free' &&
    config.telegramChannel.enabled &&
    Boolean(config.telegramChannel.requiredForChest);
  const needsChannel = channelRequired && !channelConfirmed;

  const skipCooldown = variant === 'plus';
  const cooldownOk = skipCooldown || canOpenChest(lastChestOpenAt);
  const available = cooldownOk && !needsChannel && phase === 'idle';
  const onCooldown =
    !skipCooldown && !canOpenChest(lastChestOpenAt) && phase === 'idle';
  const cooldownMs = useCooldownMs(lastChestOpenAt, getRemaining, onCooldown);

  const handleOpen = () => {
    setMessage(null);
    if (needsChannel) {
      setMessage(
        `Подпишись на ${config.telegramChannel.username}, затем нажми «Я подписался»`,
      );
      return;
    }
    if (!onStart(variant)) {
      setMessage('Сундук пока недоступен');
      return;
    }
    setSlots(rollChestSlots(collectedIds, variant, unlockedSecretBookIds));
    setPickedIndex(null);
    setPhase('picking');
  };

  const handlePick = (index: number) => {
    if (phase !== 'picking' || pickedIndex !== null) return;
    const slot = slots[index];
    if (!slot) return;

    setPickedIndex(index);
    setPhase('done');
    onCommitOpen(variant);

    const reward = resolveChestPick(slot);
    revealTimer.current = window.setTimeout(() => {
      revealTimer.current = null;
      onCommit(reward);
      onRewardRevealed(reward);
    }, REVEAL_MS);
  };

  const blurb =
    variant === 'plus'
      ? 'Четыре карты · выше шанс редкого · дубли в чернила.'
      : config.chest.unlimitedOpens
        ? 'Иногда монеты. Дубли становятся чернилами.'
        : `Раз в ${config.chest.cooldownHours} ч · нужна подписка · дубли → чернила.`;

  return (
    <section className="viewEnter">
      <p className={styles.lead}>{blurb}</p>

      {phase === 'idle' ? (
        <div className={styles.idleScene}>
          <TreasureChest open={false} locked={onCooldown || needsChannel} />
          {needsChannel ? (
            <p className={styles.cooldownLabel}>Нужна подписка на канал</p>
          ) : onCooldown ? (
            <p className={styles.cooldownLabel}>
              Закрыт · доступно через {formatCooldown(cooldownMs)}
            </p>
          ) : (
            <p className={styles.readyLabel}>Готов к открытию</p>
          )}
          <Button fullWidth disabled={!available} onClick={handleOpen}>
            {needsChannel
              ? 'Сначала подпишись на канал'
              : available
                ? variant === 'plus'
                  ? 'Открыть Сундук+'
                  : 'Открыть сундук'
                : `Жди ${formatCooldown(cooldownMs)}`}
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
        </div>
      ) : (
        <>
          <div className={styles.openScene}>
            <TreasureChest open />
            <p className={styles.hint}>
              {phase === 'picking'
                ? 'Выбери одну карту'
                : 'Твой выбор · остальные — что могло выпасть'}
            </p>
          </div>
          <div
            className={`${styles.grid} ${pickedIndex !== null ? styles.gridPicked : ''}`}
          >
            {slots.map((slot, index) => {
              const revealAll = pickedIndex !== null;
              const isPicked = pickedIndex === index;
              const flipped = revealAll;
              if (slot.type === 'money') {
                return (
                  <button
                    key={`m-${index}`}
                    type="button"
                    className={`${styles.slot} ${isPicked ? styles.picked : ''} ${revealAll && !isPicked ? styles.alt : ''}`}
                    disabled={phase !== 'picking' || pickedIndex !== null}
                    onClick={() => handlePick(index)}
                    aria-label={
                      flipped ? `+${slot.amount}` : `Слот ${index + 1}`
                    }
                  >
                    <div
                      className={`${styles.inner} ${flipped ? styles.flipped : ''}`}
                    >
                      <div className={`${styles.face} ${styles.back}`}>
                        <span className={styles.backMark}>L</span>
                        <span className={styles.backHint}>LC</span>
                      </div>
                      <div
                        className={`${styles.face} ${styles.front}`}
                        style={
                          { '--card-rarity': 'var(--gold)' } as CSSProperties
                        }
                      >
                        <span className={styles.initials}>+{slot.amount}</span>
                        <span className={styles.name}>Монеты</span>
                        {revealAll && !isPicked ? (
                          <span className={styles.rarity}>не выбрано</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              }

              if (slot.type === 'pages') {
                return (
                  <button
                    key={`p-${index}`}
                    type="button"
                    className={`${styles.slot} ${isPicked ? styles.picked : ''} ${revealAll && !isPicked ? styles.alt : ''}`}
                    disabled={phase !== 'picking' || pickedIndex !== null}
                    onClick={() => handlePick(index)}
                    aria-label={
                      flipped ? 'Страница' : `Слот ${index + 1}`
                    }
                  >
                    <div
                      className={`${styles.inner} ${flipped ? styles.flipped : ''}`}
                    >
                      <div className={`${styles.face} ${styles.back}`}>
                        <span className={styles.backMark}>L</span>
                        <span className={styles.backHint}>LC</span>
                      </div>
                      <div
                        className={`${styles.face} ${styles.front}`}
                        style={
                          { '--card-rarity': '#e0b878' } as CSSProperties
                        }
                      >
                        <span className={styles.initials}>+{slot.amount}</span>
                        <span className={styles.name}>Страница</span>
                        {revealAll && !isPicked ? (
                          <span className={styles.rarity}>не выбрано</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              }

              const { card } = slot;
              const color = RARITY_COLORS[card.rarity];
              const name = card.name === '—' ? 'Пустой слот' : card.name;
              const initials = getCardInitials(name);
              const rarityLabel = RARITY_LABELS[card.rarity];

              return (
                <button
                  key={`${card.id}-${index}`}
                  type="button"
                  className={`${styles.slot} ${isPicked ? styles.picked : ''} ${revealAll && !isPicked ? styles.alt : ''}`}
                  disabled={phase !== 'picking' || pickedIndex !== null}
                  onClick={() => handlePick(index)}
                  aria-label={flipped ? name : `Слот ${index + 1}`}
                >
                  <div
                    className={`${styles.inner} ${flipped ? styles.flipped : ''}`}
                  >
                    <div className={`${styles.face} ${styles.back}`}>
                      <span className={styles.backMark}>L</span>
                      <span className={styles.backHint}>LC</span>
                    </div>
                    <div
                      className={`${styles.face} ${styles.front}`}
                      style={{ '--card-rarity': color } as CSSProperties}
                    >
                      <span className={styles.initials}>{initials}</span>
                      <span className={styles.name}>{name}</span>
                      <span className={styles.rarity}>
                        {revealAll && !isPicked
                          ? `${rarityLabel} · мимо`
                          : rarityLabel}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {phase === 'done' && (
            <Button fullWidth onClick={() => setPhase('idle')}>
              Закрыть
            </Button>
          )}
        </>
      )}

      {message && <p className="goldMessage">{message}</p>}
    </section>
  );
}
