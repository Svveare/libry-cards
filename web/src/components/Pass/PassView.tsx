import { useState } from 'react';
import type { GrantReward, UserProgress } from '../../types';
import {
  BATTLE_PASS_LEVEL_DEFS,
  BATTLE_PASS_LEVELS,
  BATTLE_PASS_PREMIUM_PRICE,
  BP_OVERFLOW_XP,
  battlePassLevel,
  currentBattlePassSeasonId,
  overflowXpBanked,
  overflowXpToNext,
  xpIntoLevel,
  xpStepCost,
  xpToNextLevel,
  type PassTrack,
} from '../../data/battlePass';
import {
  formatGrantList,
  formatGrantReward,
  normalizeGrantOption,
} from '../../utils/grantReward';
import { Button } from '../ui/Button';
import styles from './PassView.module.css';

interface PassViewProps {
  progress: UserProgress;
  onBuyPremium: () => boolean;
  onClaim: (
    level: number,
    track: PassTrack,
    choiceIndex?: number,
  ) => boolean;
}

function rewardText(reward: GrantReward | GrantReward[]): string {
  return Array.isArray(reward)
    ? formatGrantList(reward)
    : formatGrantReward(reward);
}

function optionText(opt: GrantReward | GrantReward[]): string {
  return formatGrantList(normalizeGrantOption(opt));
}

function isChoiceReward(
  reward: GrantReward | GrantReward[],
): reward is Extract<GrantReward, { kind: 'choice' }> {
  return !Array.isArray(reward) && reward.kind === 'choice';
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
  const overflowToNext = overflowXpToNext(bp.xp, bp.overflowClaims);
  const overflowInto = overflowXpBanked(bp.xp) % BP_OVERFLOW_XP;
  const stepCost = xpStepCost(bp.xp);
  const pct = maxed
    ? Math.round((overflowInto / BP_OVERFLOW_XP) * 100)
    : Math.round((into / stepCost) * 100);
  const seasonId = currentBattlePassSeasonId();
  const [choicePick, setChoicePick] = useState<{
    level: number;
    options: Array<GrantReward | GrantReward[]>;
  } | null>(null);

  return (
    <section className={`viewEnter ${styles.wrap}`}>
      <p className={styles.lead}>
        Сезон {seasonId} · 30 уровней · 1-й бесплатно · XP растёт (+10 за шаг).
        Pro: выбор на 15 / 25 / 30 · всего 5 страниц за сезон. После капа —
        бонус каждые {BP_OVERFLOW_XP} XP.
      </p>

      <div className={styles.header}>
        <div className={styles.levelRow}>
          <span className={styles.levelLabel}>
            {maxed ? `Уровень ${level}` : `Ур. ${level} → ${level + 1}`}
          </span>
          <span className={styles.xpLabel}>
            {maxed
              ? `${overflowInto} / ${BP_OVERFLOW_XP} overflow XP`
              : `${into} / ${stepCost} XP`}
          </span>
        </div>
        <div
          className={styles.bar}
          role="progressbar"
          aria-valuenow={maxed ? overflowInto : into}
          aria-valuemin={0}
          aria-valuemax={maxed ? BP_OVERFLOW_XP : stepCost}
          aria-label="Опыт сезона"
        >
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.xpRemain}>
          {maxed
            ? `Ещё ${overflowToNext} XP до бонуса (${bp.premium ? '+1 бонус-кейс' : '+8 чернил'})`
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
          const premiumChoice = isChoiceReward(def.premium)
            ? def.premium
            : null;
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
                  <p className={styles.reward}>
                    {rewardText(def.premium)}
                    {premiumChoice &&
                    (def.level === 15 ||
                      def.level === 25 ||
                      def.level === 30)
                      ? ' · +1 страница'
                      : ''}
                  </p>
                  <Button
                    disabled={!bp.premium || !unlocked || premClaimed}
                    onClick={() => {
                      if (premiumChoice) {
                        setChoicePick({
                          level: def.level,
                          options: premiumChoice.options,
                        });
                        return;
                      }
                      onClaim(def.level, 'premium');
                    }}
                  >
                    {premClaimed
                      ? '✓'
                      : !bp.premium
                        ? 'Pro'
                        : unlocked
                          ? premiumChoice
                            ? 'Выбрать'
                            : 'Забрать'
                          : '🔒'}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {choicePick ? (
        <div
          className={styles.choiceOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Выбор награды"
        >
          <div className={styles.choiceModal}>
            <p className={styles.choiceTitle}>
              Уровень {choicePick.level} · выбери награду
            </p>
            <div className={styles.choiceList}>
              {choicePick.options.map((opt, index) => (
                <Button
                  key={index}
                  fullWidth
                  onClick={() => {
                    onClaim(choicePick.level, 'premium', index);
                    setChoicePick(null);
                  }}
                >
                  {optionText(opt)}
                </Button>
              ))}
            </div>
            <button
              type="button"
              className={styles.choiceCancel}
              onClick={() => setChoicePick(null)}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
