import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { DailyReward } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../types';
import { getBookById, getShelfById } from '../../content/loader';
import { getCardInitials } from '../Library/CardSlot';
import { Button } from '../ui/Button';
import styles from './RewardModal.module.css';

interface RewardModalProps {
  reward: DailyReward;
  onClose: () => void;
}

/** Fixed ink/silver mote positions for the secret veil stage. */
const SECRET_MOTES = [
  { left: '12%', top: '18%', delay: '0.05s', duration: '1.8s' },
  { left: '78%', top: '14%', delay: '0.2s', duration: '2.1s' },
  { left: '22%', top: '62%', delay: '0.12s', duration: '1.9s' },
  { left: '68%', top: '72%', delay: '0.35s', duration: '2.0s' },
  { left: '48%', top: '22%', delay: '0.08s', duration: '1.7s' },
  { left: '88%', top: '48%', delay: '0.28s', duration: '2.2s' },
  { left: '8%', top: '42%', delay: '0.4s', duration: '1.85s' },
  { left: '55%', top: '58%', delay: '0.15s', duration: '2.05s' },
  { left: '35%', top: '78%', delay: '0.45s', duration: '1.95s' },
  { left: '72%', top: '38%', delay: '0.22s', duration: '1.75s' },
] as const;

const SECRET_BUTTON_MS = 2000;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ModalShell({
  kicker,
  children,
  buttonLabel,
  onClose,
}: {
  kicker: string;
  children: ReactNode;
  buttonLabel: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className={styles.kicker}>{kicker}</p>
        {children}
        <Button fullWidth onClick={onClose}>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

function SimpleReward({
  amount,
  sub,
  note,
  accent,
}: {
  amount: number;
  sub: string;
  note?: string;
  accent: string;
}) {
  return (
    <div
      className={styles.simple}
      style={{ '--card-rarity': accent } as CSSProperties}
    >
      <p className={styles.big}>+{amount}</p>
      <p className={styles.sub}>{sub}</p>
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}

function CardRevealBody({
  reward,
  onClose,
}: {
  reward: Extract<DailyReward, { kind: 'card' }>;
  onClose: () => void;
}) {
  const { card } = reward;
  const isSecret = card.rarity === 'secret';
  const color = RARITY_COLORS[card.rarity];
  const shelf = getShelfById(card.shelfId);
  const book = getBookById(card.bookId);
  const displayName = card.name === '—' ? 'Пустой слот' : card.name;
  const [imgFailed, setImgFailed] = useState(false);
  const [secretReady, setSecretReady] = useState(!isSecret);
  const showImage = Boolean(card.image) && !imgFailed;

  useEffect(() => {
    if (!isSecret) {
      setSecretReady(true);
      return;
    }
    if (prefersReducedMotion()) {
      setSecretReady(true);
      return;
    }
    setSecretReady(false);
    const id = window.setTimeout(() => setSecretReady(true), SECRET_BUTTON_MS);
    return () => window.clearTimeout(id);
  }, [isSecret]);

  return (
    <div
      className={`${styles.overlay} ${isSecret ? styles.overlaySecret : ''}`}
      onClick={secretReady ? onClose : undefined}
      role="presentation"
    >
      {isSecret ? (
        <div className={styles.secretStage} aria-hidden="true">
          <div className={styles.secretVeil} />
          <div className={styles.secretSigil} />
          <div className={styles.secretRings}>
            <span className={styles.secretRing} />
            <span className={`${styles.secretRing} ${styles.secretRingMid}`} />
            <span className={`${styles.secretRing} ${styles.secretRingOuter}`} />
          </div>
          <div className={styles.secretVignette} />
          <div className={styles.secretBurst} />
          {SECRET_MOTES.map((mote, i) => (
            <span
              key={i}
              className={styles.secretMote}
              style={
                {
                  '--mote-left': mote.left,
                  '--mote-top': mote.top,
                  '--mote-delay': mote.delay,
                  '--mote-duration': mote.duration,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
      <div
        className={`${styles.modal} ${isSecret ? styles.modalSecret : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-title"
      >
        <p className={`${styles.kicker} ${isSecret ? styles.kickerSecret : ''}`}>
          {isSecret ? 'Секретная карта' : 'Новая карта'}
        </p>
        <div
          className={`${styles.card} ${isSecret ? styles.cardSecret : ''}`}
          style={{ '--card-rarity': color } as CSSProperties}
        >
          {isSecret ? (
            <span className={styles.secretStamp}>Секрет</span>
          ) : null}
          <div className={styles.art}>
            {showImage ? (
              <img
                src={card.image}
                alt={displayName}
                className={styles.image}
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <span className={styles.initials}>
                {getCardInitials(displayName)}
              </span>
            )}
          </div>
          <div className={styles.info}>
            <h2 id="reveal-title" className={styles.name}>
              {displayName}
            </h2>
            <span className={styles.rarity}>{RARITY_LABELS[card.rarity]}</span>
            <p className={styles.origin}>
              {[shelf?.name, book?.name].filter(Boolean).join(' · ') ||
                'Библиотека'}
            </p>
            {card.description?.trim() ? (
              <p className={styles.description}>
                {card.description.trim().length > 110
                  ? `${card.description.trim().slice(0, 110)}…`
                  : card.description.trim()}
              </p>
            ) : (
              <p className={styles.description}>Подробнее — в библиотеке</p>
            )}
          </div>
        </div>
        {isSecret ? (
          <div
            className={`${styles.secretCta} ${secretReady ? styles.secretCtaReady : ''}`}
          >
            {secretReady ? (
              <Button fullWidth onClick={onClose}>
                В коллекцию
              </Button>
            ) : (
              <div className={styles.secretCtaSpacer} aria-hidden="true" />
            )}
          </div>
        ) : (
          <Button fullWidth onClick={onClose}>
            В коллекцию
          </Button>
        )}
      </div>
    </div>
  );
}

export function RewardModal({ reward, onClose }: RewardModalProps) {
  if (reward.kind === 'money') {
    return (
      <ModalShell kicker="Награда" buttonLabel="Отлично" onClose={onClose}>
        <SimpleReward
          amount={reward.amount}
          sub="Монеты"
          accent="var(--gold)"
        />
      </ModalShell>
    );
  }

  if (reward.kind === 'ink') {
    return (
      <ModalShell kicker="Дубль" buttonLabel="Отлично" onClose={onClose}>
        <SimpleReward
          amount={reward.amount}
          sub="Чернила"
          note="Уже в коллекции — чернила для витрины"
          accent="#7eb8d4"
        />
      </ModalShell>
    );
  }

  if (reward.kind === 'pages') {
    return (
      <ModalShell kicker="Награда" buttonLabel="Отлично" onClose={onClose}>
        <SimpleReward
          amount={reward.amount}
          sub="Страница"
          note="Трать в магазине · копи за полные книги"
          accent="#c4a574"
        />
      </ModalShell>
    );
  }

  return <CardRevealBody reward={reward} onClose={onClose} />;
}
