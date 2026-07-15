/** Simple in-memory rate limit for Vercel serverless (per IP). */

const WINDOW_MS = 60_000;
const MAX_HITS = 30;
const buckets = new Map();

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function rateLimitOrResponse(req, res) {
  const ip = clientIp(req);
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = [];
    buckets.set(ip, bucket);
  }
  const cutoff = now - WINDOW_MS;
  while (bucket.length && bucket[0] < cutoff) {
    bucket.shift();
  }
  if (bucket.length >= MAX_HITS) {
    const retryAfter = Math.max(1, Math.ceil((bucket[0] + WINDOW_MS - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      ok: false,
      subscribed: false,
      error: 'rate_limit',
    });
  }
  bucket.push(now);
  if (buckets.size > 10_000) {
    buckets.clear();
  }
  return null;
}
