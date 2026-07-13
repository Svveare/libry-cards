import { QUESTS, type QuestId } from '../../utils/quests';
import { Button } from '../ui/Button';
import { SurfaceListItem } from '../ui/SurfaceListItem';

interface QuestsViewProps {
  isComplete: (id: QuestId) => boolean;
  isClaimed: (id: QuestId) => boolean;
  onClaim: (id: QuestId, rewardCoins: number) => boolean;
}

export function QuestsView({ isComplete, isClaimed, onClaim }: QuestsViewProps) {
  return (
    <section className="viewEnter">
      <p className="mutedCopy" style={{ marginBottom: 18, textAlign: 'center' }}>
        Каждый день — новые дела. Забери монеты после выполнения.
      </p>
      <div className="listStack">
        {QUESTS.map((quest) => {
          const complete = isComplete(quest.id);
          const claimed = isClaimed(quest.id);
          let status = 'Не выполнено';
          if (claimed) status = 'Получено';
          else if (complete) status = 'Готово к получению';

          return (
            <SurfaceListItem
              key={quest.id}
              title={quest.title}
              description={quest.description}
              meta={
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: claimed ? 'var(--gold)' : 'var(--text-muted)',
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
                    +{quest.rewardCoins} монет
                  </p>
                </div>
              }
              action={
                <Button
                  disabled={!complete || claimed}
                  onClick={() => onClaim(quest.id, quest.rewardCoins)}
                >
                  {claimed ? 'Забрано' : 'Забрать'}
                </Button>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
