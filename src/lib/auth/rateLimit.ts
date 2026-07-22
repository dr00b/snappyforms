/**
 * In-memory rate limiting. Fine for a single-instance hackathon prototype; a real
 * deployment would back this with Redis (see SECURITY.md) so limits hold across
 * instances/restarts.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    const retryAfterMs = windowMs - (now - existing.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  existing.count += 1;
  return { allowed: true, remaining: max - existing.count };
}

const cooldowns = new Map<string, number>();

export function checkCooldown(key: string, cooldownMs: number) {
  const now = Date.now();
  const last = cooldowns.get(key);
  if (last && now - last < cooldownMs) {
    return { allowed: false, retryAfterMs: cooldownMs - (now - last) };
  }
  cooldowns.set(key, now);
  return { allowed: true, retryAfterMs: 0 };
}
