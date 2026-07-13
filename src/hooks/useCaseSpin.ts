import { useCallback, useMemo, useRef, useState } from 'react';
import type { DailyReward } from '../types';
import {
  buildCaseStrip,
  buildPreviewStrip,
  type CaseStripItem,
} from '../utils/dailyRoll';

interface UseCaseSpinOptions {
  onCommit: (reward: DailyReward) => void;
  onReveal: (reward: DailyReward) => void;
  /** Idle preview uses shorter strip; exclude money for paid case. */
  previewExcludeMoney?: boolean;
}

export function useCaseSpin({
  onCommit,
  onReveal,
  previewExcludeMoney = false,
}: UseCaseSpinOptions) {
  const preview = useMemo(
    () => buildPreviewStrip(previewExcludeMoney),
    [previewExcludeMoney],
  );
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<CaseStripItem[]>(preview);
  const pendingRef = useRef<DailyReward | null>(null);

  const handleSpinEnd = useCallback(() => {
    const reward = pendingRef.current;
    if (!reward) {
      setSpinning(false);
      return;
    }
    onCommit(reward);
    setSpinning(false);
    pendingRef.current = null;
    onReveal(reward);
  }, [onCommit, onReveal]);

  const startSpin = useCallback(
    (reward: DailyReward, options?: { excludeMoney?: boolean }) => {
      pendingRef.current = reward;
      setStrip(buildCaseStrip(reward, options));
      setSpinning(true);
    },
    [],
  );

  return {
    spinning,
    strip: spinning ? strip : preview,
    startSpin,
    handleSpinEnd,
  };
}
