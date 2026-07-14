import { createHmac, timingSafeEqual } from 'node:crypto';

export function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return token;
}

export function getChannelUsername(): string {
  const raw =
    process.env.TELEGRAM_CHANNEL_USERNAME?.trim() ||
    process.env.VITE_TELEGRAM_CHANNEL_USERNAME?.trim() ||
    '@librycards';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

export function getWebAppUrl(): string {
  const url =
    process.env.TELEGRAM_WEBAPP_URL?.trim() ||
    process.env.VITE_WEBAPP_URL?.trim() ||
    '';
  return url.replace(/\/$/, '');
}

/** Validate Telegram Mini App initData (WebAppData). */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): { ok: true; userId: number } | { ok: false; reason: string } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { ok: false, reason: 'missing_hash' };

    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') pairs.push(`${key}=${value}`);
    });
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculated = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const a = Buffer.from(calculated, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad_hash' };
    }

    const authDate = Number(params.get('auth_date') || 0);
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
      return { ok: false, reason: 'expired' };
    }

    const userRaw = params.get('user');
    if (!userRaw) return { ok: false, reason: 'no_user' };
    const user = JSON.parse(userRaw) as { id?: number };
    if (!user.id) return { ok: false, reason: 'no_user_id' };

    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, reason: 'parse_error' };
  }
}

export async function getChatMemberStatus(
  botToken: string,
  channel: string,
  userId: number,
): Promise<string | null> {
  const url = `https://api.telegram.org/bot${botToken}/getChatMember`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: channel, user_id: userId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    result?: { status?: string };
    description?: string;
  };
  if (!data.ok || !data.result?.status) {
    console.warn('getChatMember failed', data.description);
    return null;
  }
  return data.result.status;
}

export function isSubscribedStatus(status: string | null): boolean {
  return (
    status === 'creator' ||
    status === 'administrator' ||
    status === 'member' ||
    status === 'restricted'
  );
}

export async function telegramCall(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}
