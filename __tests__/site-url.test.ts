import { getSiteUrl } from '@/lib/site-url'

describe('getSiteUrl', () => {
  const origPublic = process.env.NEXT_PUBLIC_SITE_URL
  const origVercel = process.env.VERCEL_URL

  afterEach(() => {
    if (origPublic === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = origPublic
    if (origVercel === undefined) delete process.env.VERCEL_URL
    else process.env.VERCEL_URL = origVercel
  })

  it('uses NEXT_PUBLIC_SITE_URL without trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/'
    delete process.env.VERCEL_URL
    expect(getSiteUrl()).toBe('https://example.com')
  })

  it('falls back to VERCEL_URL', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    process.env.VERCEL_URL = 'annas-garden.vercel.app'
    expect(getSiteUrl()).toBe('https://annas-garden.vercel.app')
  })

  it('falls back to localhost', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_URL
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })
})
