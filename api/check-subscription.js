import {
  getBotToken,
  getChannelUsername,
  getChatMemberStatus,
  isSubscribedStatus,
  validateInitData,
} from './_lib/telegram.js';
import { rateLimitOrResponse } from './_lib/rateLimit.js';

export default async function handler(req, res) {
  const origin = process.env.TELEGRAM_WEBAPP_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const limited = rateLimitOrResponse(req, res);
  if (limited) {
    return limited;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const initData =
      typeof req.body === 'object' && req.body
        ? String(req.body.initData || '')
        : '';
    if (!initData) {
      return res
        .status(400)
        .json({ ok: false, subscribed: false, error: 'no_init_data' });
    }

    const botToken = getBotToken();
    const validated = validateInitData(initData, botToken);
    if (!validated.ok) {
      return res.status(401).json({
        ok: false,
        subscribed: false,
        error: validated.reason,
      });
    }

    const channel = getChannelUsername();
    const status = await getChatMemberStatus(
      botToken,
      channel,
      validated.userId,
    );
    const subscribed = isSubscribedStatus(status);

    return res.status(200).json({
      ok: true,
      subscribed,
      status,
      userId: validated.userId,
      channel,
    });
  } catch (err) {
    console.error('check-subscription', err);
    return res.status(500).json({
      ok: false,
      subscribed: false,
      error: err instanceof Error ? err.message : 'server_error',
    });
  }
}
