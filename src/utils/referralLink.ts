/**
 * Invite deep link for Bothost bot (/start ref_…).
 * Bot registers the referral and shows the Web App button.
 */
export function buildReferralLink(
  botUsername: string,
  userId: string,
  _shortName?: string | null,
): string {
  const bot = botUsername.replace(/^@/, '').trim() || 'librycards_bot';
  return `https://t.me/${bot}?start=ref_${userId}`;
}
