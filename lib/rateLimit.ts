import type { NextRequest } from 'next/server';
import redis from '@/lib/redis';

/**
 * Redis-backed fixed-window rate limiter.
 *
 * Uses INCR + EXPIRE: the first request in a window sets the counter to 1 and
 * arms a TTL; subsequent requests increment it. When the window's TTL lapses,
 * the key disappears and the window resets. Cheap, atomic, and self-cleaning.
 *
 * Fails OPEN: if Redis is unreachable, requests are allowed through rather than
 * locking everyone out. Rate limiting is a guard rail, not a hard dependency.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * Best-effort client IP. Behind nginx/Cloudflare the real IP is in
 * x-forwarded-for (first hop) or x-real-ip; fall back to a constant so a
 * missing header doesn't make every client share one bucket by accident.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Increment the counter for `key` and check it against `limit` per
 * `windowSeconds`. Returns whether the request is allowed plus metadata.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // First hit in this window — arm the expiry.
      await redis.expire(redisKey, windowSeconds);
    }
    const ttl = count === 1 ? windowSeconds : await redis.ttl(redisKey);
    const allowed = count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - count),
      limit,
      retryAfterSeconds: allowed ? 0 : Math.max(1, ttl),
    };
  } catch (err) {
    // Fail open — never block traffic because Redis hiccuped.
    console.error('[rateLimit] Redis error, allowing request:', (err as Error).message);
    return { allowed: true, remaining: limit, limit, retryAfterSeconds: 0 };
  }
}

/**
 * Convenience: rate limit a request by client IP for a given route bucket.
 * `bucket` namespaces the counter (e.g. 'login', 'places') so different routes
 * have independent limits.
 */
export async function rateLimitByIp(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return rateLimit(`${bucket}:${clientIp(req)}`, limit, windowSeconds);
}
