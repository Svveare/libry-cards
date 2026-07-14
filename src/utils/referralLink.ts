/**
 * Build a Telegram Mini App referral deep link.
 * Named Mini App: https://t.me/{bot}/{shortName}?startapp=ref_{userId}
 * Main Mini App (empty shortName): https://t.me/{bot}?startapp=ref_{userId}
 */
export function buildReferralLink(
  botUsername: string,
  userId: string,
  shortName?: string | null,
): string {
  const bot = botUsername.replace(/^@/, '').trim() || 'librycards_bot';
  const path = shortName?.trim() ? `/${shortName.trim()}` : '';
  return `https://t.me/${bot}${path}?startapp=ref_${userId}`;
}
