/**
 * 进程内滑动窗口限流（MVP 试用足够；多实例部署需 Upstash/Redis）
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const DEFAULT_WINDOW_MS = 60_000

function getLimit(envKey: string, fallback: number): number {
  const raw = process.env[envKey]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSec?: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, limit, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    return { allowed: false, limit, remaining: 0, retryAfterSec }
  }

  bucket.count += 1
  return { allowed: true, limit, remaining: limit - bucket.count }
}

export function rateLimitForUser(
  userId: string,
  route: string,
  defaultLimit: number,
  envKey?: string,
): RateLimitResult {
  const limit = envKey ? getLimit(envKey, defaultLimit) : defaultLimit
  return checkRateLimit(`${route}:${userId}`, limit)
}

export function rateLimitResponse(result: RateLimitResult, message?: string): Response {
  const retryAfter = result.retryAfterSec ?? 60
  return Response.json(
    { error: message ?? '操作太频繁啦，稍后再试' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

/** 测试专用：清空桶 */
export function resetRateLimitsForTests(): void {
  buckets.clear()
}
