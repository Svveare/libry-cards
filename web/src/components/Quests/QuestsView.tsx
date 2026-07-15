import { useCallback } from 'react';
import {
  QUESTS,
  middayHuntCopy,
  middayHuntKindForDay,
  type QuestId,
} from '../../utils/quests';
import { middayUnlockRemainingMs } from '../../utils/dayStats';
import type { DayStats } from '../../types';
import { formatCooldown } from '../../utils/cooldown';
import { formatGrantReward } from '../../utils/grantReward';
import { useCooldownMs } from '../../hooks/useCooldownMs';
import { Button } from '../ui/Button';
import { ClaimMark } from '../ui/ClaimMark';
import { SurfaceListItem } from '../ui/SurfaceListItem';

interface QuestsViewProps {
  dayStats: DayStats;
  isComplete: (id: QuestId) => boolean;
  isClaimed: (id: QuestId) => boolean;
  onClaim: (id: QuestId) => boolean;
}

export function QuestsView({
  dayStats,
  isComplete,
  isClaimed,
  onClaim,
}: QuestsViewProps) {
  const hunt = middayHuntCopy(middayHuntKindForDay(dayStats.day));
  const getUnlockLeft = useCallback(
    (_at: string | null) => middayUnlockRemainingMs(dayStats),
    [dayStats],
  );
  const unlockActive = Boolean(dayStats.firstActiveAt);
  const unlockLeft = useCooldownMs(
    dayStats.firstActiveAt,
    getUnlockLeft,
    unlockActive,
  );

  const huntUnlocked = unlockLeft <= 0 && Boolean(dayStats.firstActiveAt);

  return (
    <section className="viewEnter">
      <p className="mutedCopy" style={{ marginBottom: 18, textAlign: 'center' }}>
        Выполни дела и забери награду — так качается сезон. Сложные квесты дают
        больше XP.
      </p>
      <div className="listStack">
        {QUESTS.map((quest) => {
          const isHunt = quest.id === 'midday_hunt';
          const title = isHunt ? hunt.title : quest.title;
          const description = isHunt ? hunt.description : quest.description;
          const locked = isHunt && !huntUnlocked;
          const complete = !locked && isComplete(quest.id);
          const claimed = isClaimed(quest.id);

          let status = 'Не выполнено';
          if (locked) {
            status = dayStats.firstActiveAt
              ? `Откроется через ${formatCooldown(unlockLeft)}`
              : 'Сыграй сегодня — охота откроется через 5 ч';
          } else if (claimed) status = 'Получено';
          else if (complete) status = 'Готово к получению';

          return (
            <SurfaceListItem
              key={quest.id}
              title={title}
              description={description}
              meta={
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: claimed
                        ? 'var(--gold)'
                        : locked
                          ? 'var(--text-soft)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {status}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--gold)',
                    }}
                  >
                    {formatGrantReward(quest.reward)} · +{quest.xp} XP
                  </p>
                </div>
              }
              action={
                claimed ? (
                  <ClaimMark />
                ) : (
                  <Button
                    variant={complete ? 'primary' : 'secondary'}
                    disabled={locked || !complete}
                    onClick={() => onClaim(quest.id)}
                  >
                    {locked ? 'Жди' : 'Забрать'}
                  </Button>
                )
              }
            />
          );
        })}
      </div>
    </section>
  );
}
