/**
 * 站点根 URL，用于 OG 图、分享链接等绝对地址。
 * 生产环境请在 Vercel 配置 NEXT_PUBLIC_SITE_URL=https://你的域名
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

/** 客户端可用的站点 URL（仅 NEXT_PUBLIC_SITE_URL 或当前 origin） */
export function getClientSiteUrl(): string {
  if (typeof window !== 'undefined') {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    if (fromEnv) return fromEnv.replace(/\/$/, '')
    return window.location.origin
  }
  return getSiteUrl()
}
