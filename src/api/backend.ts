import { config } from '../content/loader';
import type { CardOverride, UserProgress } from '../types';

export type { CardOverride };

export interface BootstrapResult {
  userId: string;
  referralCount: number;
  pendingCoins: number;
  pendingBonusCases: number;
  claimId: string | null;
  isAdmin: boolean;
  referredBy?: string | null;
  cardOverrides?: Record<string, CardOverride>;
  progress?: UserProgress | null;
}

function baseUrl(): string {
  return (config.backendBaseUrl ?? '').replace(/\/$/, '');
}

export function hasBackend(): boolean {
  return Boolean(baseUrl());
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  const root = baseUrl();
  if (!root) return null;
  try {
    const res = await fetch(`${root}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchBootstrap(
  initData: string,
  startParam?: string | null,
): Promise<BootstrapResult | null> {
  return postJson<BootstrapResult>('/api/bootstrap', {
    initData,
    startParam: startParam ?? undefined,
  });
}

export async function claimBootstrap(
  initData: string,
  claimId: string,
): Promise<boolean> {
  const res = await postJson<{ ok?: boolean }>('/api/claim', {
    initData,
    claimId,
  });
  return Boolean(res?.ok);
}

export async function pushProgress(
  initData: string,
  progress: UserProgress,
): Promise<boolean> {
  const res = await postJson<{ ok?: boolean }>('/api/progress', {
    initData,
    progress,
  });
  return Boolean(res?.ok);
}

export async function adminGrant(
  initData: string,
  targetUserId: string,
  coins: number,
  bonusCases: number,
): Promise<{ ok: boolean; error?: string }> {
  const root = baseUrl();
  if (!root) return { ok: false, error: 'backend не настроен' };
  try {
    const res = await fetch(`${root}/api/admin/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, targetUserId, coins, bonusCases }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { error?: string }).error ?? 'ошибка' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'сеть' };
  }
}

export async function adminSaveCard(
  initData: string,
  payload: {
    cardId: string;
    name?: string;
    description?: string;
    rarity?: string;
    image?: string;
    imageBase64?: string;
    mime?: string;
    clearImage?: boolean;
  },
): Promise<{ ok: boolean; image?: string; error?: string }> {
  const root = baseUrl();
  if (!root) return { ok: false, error: 'backend не настроен' };
  try {
    const res = await fetch(`${root}/api/admin/card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, ...payload }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      override?: { image?: string };
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? 'ошибка' };
    }
    return { ok: true, image: data.override?.image };
  } catch {
    return { ok: false, error: 'сеть' };
  }
}
