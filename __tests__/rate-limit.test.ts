import {
  checkRateLimit,
  resetRateLimitsForTests,
} from '@/lib/api/rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    resetRateLimitsForTests()
  })

  it('allows requests under the limit', () => {
    const first = checkRateLimit('user:chat', 3, 60_000)
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(2)

    const second = checkRateLimit('user:chat', 3, 60_000)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)
  })

  it('blocks requests over the limit', () => {
    checkRateLimit('user:chat', 2, 60_000)
    checkRateLimit('user:chat', 2, 60_000)
    const third = checkRateLimit('user:chat', 2, 60_000)
    expect(third.allowed).toBe(false)
    expect(third.retryAfterSec).toBeGreaterThan(0)
  })

  it('isolates keys', () => {
    checkRateLimit('user:a', 1, 60_000)
    const blocked = checkRateLimit('user:a', 1, 60_000)
    const other = checkRateLimit('user:b', 1, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(other.allowed).toBe(true)
  })
})
