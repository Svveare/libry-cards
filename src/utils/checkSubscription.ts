export type SubscriptionCheckResult = {
  ok: boolean;
  subscribed: boolean;
  error?: string;
};

export async function checkChannelSubscription(
  initData: string,
): Promise<SubscriptionCheckResult> {
  if (!initData) {
    return { ok: false, subscribed: false, error: 'no_init_data' };
  }

  try {
    const res = await fetch('/api/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    const data = (await res.json()) as SubscriptionCheckResult;
    return {
      ok: Boolean(data.ok),
      subscribed: Boolean(data.subscribed),
      error: data.error,
    };
  } catch {
    return { ok: false, subscribed: false, error: 'network' };
  }
}
