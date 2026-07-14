import type { GrantReward, UserProgress } from '../../types';
import {
  BATTLE_PASS_LEVEL_DEFS,
  BATTLE_PASS_LEVELS,
  BATTLE_PASS_PREMIUM_PRICE,
  BATTLE_PASS_XP_PER_LEVEL,
  battlePassLevel,
  xpIntoLevel,
  type PassTrack,
} from '../../data/battlePass';
import { formatGrantList, formatGrantReward } from '../../utils/grantReward';
import { Button } from '../ui/Button';
import styles from './PassView.module.css';

interface PassViewProps {
  progress: UserProgress;
  onBuyPremium: () => boolean;
  onClaim: (level: number, track: PassTrack) => boolean;
}

function rewardText(reward: GrantReward | GrantReward[]): string {
  return Array.isArray(reward)
    ? formatGrantList(reward)
    : formatGrantReward(reward);
}

export function PassView({ progress, onBuyPremium, onClaim }: PassViewProps) {
  const bp = progress.battlePass;
  const level = battlePassLevel(bp.xp);
  const into = xpIntoLevel(bp.xp);
  const pct =
    level >= BATTLE_PASS_LEVELS
      ? 100
      : Math.round((into / BATTLE_PASS_XP_PER_LEVEL) * 100);

  return (
    <section className={`viewEnter ${styles.wrap}`}>
      <p className={styles.lead}>
        Сезон s1 · 30 уровней · free + Pro = 60 наград. XP только за выполнениеку
        заданий (+45 XP за каждое).
      </p>

      <div className={styles.header}>
        <div className={styles.levelRow}>
          <span className={styles.levelLabel}>Уровень {level}</span>
          <span className={styles.xpLabel}>
            {level >= BATTLE_PASS_LEVELS
              ? 'Максимум'
              : `${into} / ${BATTLE_PASS_XP_PER_LEVEL} XP`}
          </span>
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
        {!bp.premium ? (
          <Button
            fullWidth
            onClick={() => {
              if (!onBuyPremium()) {
                // broke or already owned — button state covers most cases
              }
            }}
            disabled={progress.coins < BATTLE_PASS_PREMIUM_PRICE}
          >
            Pro за {BATTLE_PASS_PREMIUM_PRICE} монет
          </Button>
        ) : (
          <p className={styles.proBadge}>Pro активен</p>
        )}
        {!bp.premium && progress.coins < BATTLE_PASS_PREMIUM_PRICE ? (
          <p className={styles.needCoins}>
            Нужно ещё {BATTLE_PASS_PREMIUM_PRICE - progress.coins} монет
          </p>
        ) : null}
      </div>

      <div className={styles.list}>
        {BATTLE_PASS_LEVEL_DEFS.map((def) => {
          const unlocked = level >= def.level;
          const freeClaimed = bp.claimedFree.includes(def.level);
          const premClaimed = bp.claimedPremium.includes(def.level);
          return (
            <article key={def.level} className={styles.row}>
              <div className={styles.lvl}>{def.level}</div>
              <div className={styles.tracks}>
                <div className={styles.track}>
                  <span className={styles.trackTag}>Free</span>
                  <p className={styles.reward}>{rewardText(def.free)}</p>
                  <Button
                    disabled={!unlocked || freeClaimed}
                    onClick={() => onClaim(def.level, 'free')}
                  >
                    {freeClaimed ? '✓' : unlocked ? 'Забрать' : '🔒'}
                  </Button>
                </div>
                <div
                  className={`${styles.track} ${bp.premium ? '' : styles.locked}`}
                >
                  <span className={styles.trackTagPro}>Pro</span>
                  <p className={styles.reward}>{rewardText(def.premium)}</p>
                  <Button
                    disabled={!bp.premium || !unlocked || premClaimed}
                    onClick={() => onClaim(def.level, 'premium')}
                  >
                    {premClaimed
                      ? '✓'
                      : !bp.premium
                        ? 'Pro'
                        : unlocked
                          ? 'Забрать'
                          : '🔒'}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
