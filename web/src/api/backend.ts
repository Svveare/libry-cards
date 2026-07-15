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

export type ApiErrorCode = 'network' | 'unauthorized' | 'http' | 'no_backend';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
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
): Promise<T> {
  const root = baseUrl();
  if (!root) {
    throw new ApiError('no_backend', 'backend не настроен');
  }
  try {
    const res = await fetch(`${root}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        throw new ApiError(
          'unauthorized',
          err.error ?? 'unauthorized',
          res.status,
        );
      }
      if (res.status === 429) {
        throw new ApiError(
          'http',
          err.error === 'rate_limit' ? 'слишком много запросов' : 'лимит запросов',
          res.status,
        );
      }
      throw new ApiError(
        'http',
        err.error ?? `ошибка ${res.status}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('network', 'сеть');
  }
}

export async function fetchBootstrap(
  initData: string,
  startParam?: string | null,
): Promise<BootstrapResult | null> {
  try {
    return await postJson<BootstrapResult>('/api/bootstrap', {
      initData,
      startParam: startParam ?? undefined,
    });
  } catch (e) {
    console.warn('[bootstrap]', e instanceof ApiError ? e.message : e);
    return null;
  }
}

export async function claimBootstrap(
  initData: string,
  claimId: string,
): Promise<boolean> {
  try {
    const res = await postJson<{ ok?: boolean }>('/api/claim', {
      initData,
      claimId,
    });
    return Boolean(res?.ok);
  } catch (e) {
    console.warn('[claim]', e instanceof ApiError ? e.message : e);
    return false;
  }
}

export async function pushProgress(
  initData: string,
  progress: UserProgress,
): Promise<boolean> {
  try {
    const res = await postJson<{ ok?: boolean }>('/api/progress', {
      initData,
      progress,
    });
    return Boolean(res?.ok);
  } catch {
    return false;
  }
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
    await postJson<{ ok?: boolean }>('/api/admin/grant', {
      initData,
      targetUserId,
      coins,
      bonusCases,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'unauthorized') return { ok: false, error: 'unauthorized' };
      return { ok: false, error: e.message };
    }
    return { ok: false, error: 'сеть' };
  }
}

export async function adminBroadcast(
  initData: string,
  text: string,
): Promise<{
  ok: boolean;
  accepted?: boolean;
  sent?: number;
  failed?: number;
  total?: number;
  error?: string;
}> {
  const root = baseUrl();
  if (!root) return { ok: false, error: 'backend не настроен' };
  try {
    const data = await postJson<{
      ok?: boolean;
      accepted?: boolean;
      sent?: number;
      failed?: number;
      total?: number;
    }>('/api/admin/broadcast', { initData, text });
    return {
      ok: true,
      accepted: data.accepted ?? false,
      sent: data.sent,
      failed: data.failed,
      total: data.total ?? 0,
    };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'unauthorized') return { ok: false, error: 'unauthorized' };
      if (e.message === 'busy') {
        return { ok: false, error: 'busy' };
      }
      if (e.message === 'cooldown' || e.status === 429) {
        return { ok: false, error: 'cooldown' };
      }
      return { ok: false, error: e.message };
    }
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
    const data = await postJson<{
      ok?: boolean;
      override?: { image?: string };
    }>('/api/admin/card', { initData, ...payload });
    return { ok: true, image: data.override?.image };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message };
    return { ok: false, error: 'сеть' };
  }
}
