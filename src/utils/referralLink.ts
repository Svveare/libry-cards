/**
 * Invite deep link — startapp carries ref into WebApp start_param as backup
 * when /start pending → bootstrap fails.
 */
export function buildReferralLink(
  botUsername: string,
  userId: string,
  shortName?: string | null,
): string {
  const bot = botUsername.replace(/^@/, '').trim() || 'librycards_bot';
  const app = (shortName ?? '').trim() || 'app';
  return `https://t.me/${bot}/${app}?startapp=ref_${userId}`;
}
