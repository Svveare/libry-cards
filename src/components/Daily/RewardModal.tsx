import { useState, type CSSProperties, type ReactNode } from 'react';
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
  const color = RARITY_COLORS[card.rarity];
  const shelf = getShelfById(card.shelfId);
  const book = getBookById(card.bookId);
  const displayName = card.name === '—' ? 'Пустой слот' : card.name;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(card.image) && !imgFailed;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-title"
      >
        <p className={styles.kicker}>Новая карта</p>
        <div
          className={styles.card}
          style={{ '--card-rarity': color } as CSSProperties}
        >
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
              Полка: {shelf?.name ?? '—'} · Книга: {book?.name ?? '—'}
            </p>
            {card.description ? (
              <p className={styles.description}>{card.description}</p>
            ) : null}
          </div>
        </div>
        <Button fullWidth onClick={onClose}>
          В коллекцию
        </Button>
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

  if (reward.kind === 'book') {
    return (
      <ModalShell kicker="Награда" buttonLabel="Отлично" onClose={onClose}>
        <SimpleReward
          amount={reward.tokens}
          sub="Токен книги"
          note="Копи для будущих книг и полок"
          accent="#c4a574"
        />
      </ModalShell>
    );
  }

  return <CardRevealBody reward={reward} onClose={onClose} />;
}
