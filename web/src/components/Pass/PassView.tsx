import type { GrantReward, UserProgress } from '../../types';
import {
  BATTLE_PASS_LEVEL_DEFS,
  BATTLE_PASS_LEVELS,
  BATTLE_PASS_PREMIUM_PRICE,
  BATTLE_PASS_XP_PER_LEVEL,
  battlePassLevel,
  currentBattlePassSeasonId,
  xpIntoLevel,
  xpToNextLevel,
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

const TIER_LABEL: Record<string, string> = {
  plus: '×5',
  great: '×10',
  finale: 'Финал',
};

export function PassView({ progress, onBuyPremium, onClaim }: PassViewProps) {
  const bp = progress.battlePass;
  const level = battlePassLevel(bp.xp);
  const into = xpIntoLevel(bp.xp);
  const remain = xpToNextLevel(bp.xp);
  const maxed = level >= BATTLE_PASS_LEVELS;
  const pct = maxed
    ? 100
    : Math.round((into / BATTLE_PASS_XP_PER_LEVEL) * 100);
  const seasonId = currentBattlePassSeasonId();

  return (
    <section className={`viewEnter ${styles.wrap}`}>
      <p className={styles.lead}>
        Сезон {seasonId} · обновление 1-го числа · 30 уровней. XP только за
        «Забрать» в Заданиях. Вехи ×5 / ×10 / финал — лучшие награды.
      </p>

      <div className={styles.header}>
        <div className={styles.levelRow}>
          <span className={styles.levelLabel}>
            {maxed ? `Уровень ${level}` : `Ур. ${level} → ${level + 1}`}
          </span>
          <span className={styles.xpLabel}>
            {maxed
              ? 'Максимум сезона'
              : `${into} / ${BATTLE_PASS_XP_PER_LEVEL} XP`}
          </span>
        </div>
        <div
          className={styles.bar}
          role="progressbar"
          aria-valuenow={into}
          aria-valuemin={0}
          aria-valuemax={BATTLE_PASS_XP_PER_LEVEL}
          aria-label="Опыт сезона"
        >
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.xpRemain}>
          {maxed
            ? 'Все уровни открыты — забери награды ниже'
            : `До следующего уровня осталось ${remain} XP`}
        </p>
        {!bp.premium ? (
          <Button
            fullWidth
            onClick={() => {
              onBuyPremium();
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
          const milestone = def.tier && def.tier !== 'normal';
          return (
            <article
              key={def.level}
              className={`${styles.row} ${milestone ? styles.rowMilestone : ''} ${def.tier === 'finale' ? styles.rowFinale : ''}`}
            >
              <div className={styles.lvl}>
                <span>{def.level}</span>
                {milestone ? (
                  <em className={styles.tierMark}>
                    {TIER_LABEL[def.tier!] ?? ''}
                  </em>
                ) : null}
              </div>
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
