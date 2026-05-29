'use client'

import { useState } from 'react'
import { getClientSiteUrl } from '@/lib/site-url'

interface ShareLinkButtonProps {
  /** 要分享的页面 URL；默认当前页，传 path 如 `/share/creation/xxx` 则拼站点根 */
  href?: string
  title?: string
  text?: string
  label?: string
  className?: string
  variant?: 'primary' | 'outline'
}

async function sharePageLink(url: string, title: string, text?: string): Promise<'shared' | 'copied' | false> {
  const payload = { title, text: text || title, url }

  if (navigator.share) {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
    }
  }

  if (navigator.clipboard) {
    const line = text ? `${text}\n${url}` : url
    await navigator.clipboard.writeText(line)
    return 'copied'
  }

  return false
}

/**
 * 分享链接（触发微信 / 系统分享卡片，依赖目标页的 OG 元数据）
 */
export default function ShareLinkButton({
  href,
  title = "Anna's Garden · 安娜的花园",
  text,
  label = '🔗 分享链接',
  className = '',
  variant = 'outline',
}: ShareLinkButtonProps) {
  const [hint, setHint] = useState<string | null>(null)

  function resolveUrl(): string {
    if (!href) {
      return typeof window !== 'undefined' ? window.location.href : getClientSiteUrl()
    }
    if (href.startsWith('http')) return href
    return `${getClientSiteUrl()}${href.startsWith('/') ? href : `/${href}`}`
  }

  async function handleShare() {
    setHint(null)
    const url = resolveUrl()
    const result = await sharePageLink(url, title, text)
    if (result === 'copied') setHint('链接已复制，粘贴到微信即可看到预览卡片')
    else if (result === 'shared') setHint('已唤起分享')
    else setHint('请手动复制地址栏链接')
    setTimeout(() => setHint(null), 3500)
  }

  const baseClass =
    variant === 'primary'
      ? 'btn-primary px-6 py-2 text-white text-sm rounded-full touch-target'
      : 'px-6 py-2 text-sm rounded-full touch-target border'

  const style =
    variant === 'outline'
      ? { color: '#8B7355', borderColor: 'rgba(139,115,85,0.3)' }
      : undefined

  return (
    <div className={className}>
      <button type="button" onClick={() => void handleShare()} className={baseClass} style={style}>
        {label}
      </button>
      {hint && (
        <p className="text-xs mt-2 text-center max-w-xs mx-auto" style={{ color: '#16a34a' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
