// Simple in-memory rate limiter
// Not for production with multiple instances — use Redis then

const rateMap = new Map<string, { count: number; reset: number }>();

// Default: 100 requests per minute per IP
const DEFAULT_LIMIT = 100;
const WINDOW_MS = 60_000;

export function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = WINDOW_MS
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, reset: entry.reset };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, reset: entry.reset };
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (now > entry.reset) rateMap.delete(key);
  }
}, 300_000);
