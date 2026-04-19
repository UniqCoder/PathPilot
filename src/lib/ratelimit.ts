import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = {
  allowed: boolean;
  message?: string;
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

const limiterCache = new Map<string, Ratelimit>();

const getLimiter = (key: string, maxPerHour: number) => {
  const cacheKey = `${key}:${maxPerHour}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  if (!redis) {
    return null;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxPerHour, "1 h"),
    analytics: true,
    prefix: `pathpilot:${key}`,
  });

  limiterCache.set(cacheKey, limiter);
  return limiter;
};

export const checkRateLimit = async (
  scope: string,
  identifier: string,
  maxPerHour: number
): Promise<RateLimitResult> => {
  const limiter = getLimiter(scope, maxPerHour);
  if (!limiter) {
    return { allowed: true };
  }

  const result = await limiter.limit(identifier);
  if (result.success) {
    return { allowed: true };
  }

  const retryAfterMs = Math.max(0, result.reset - Date.now());
  const retryMinutes = Math.max(1, Math.ceil(retryAfterMs / 60000));

  return {
    allowed: false,
    message: `Too many requests. Try again in ${retryMinutes} minutes.`,
  };
};
