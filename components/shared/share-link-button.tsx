'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

function ShareToast({ message }: { message: string }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 6, x: '-50%' }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-8 left-1/2 z-[60] px-4 py-2.5 rounded-full text-sm text-white shadow-lg pointer-events-none max-w-[90vw] text-center"
      style={{ backgroundColor: 'rgba(58,46,44,0.92)' }}
    >
      {message}
    </motion.div>
  )
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
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }

  function resolveUrl(): string {
    if (!href) {
      return typeof window !== 'undefined' ? window.location.href : getClientSiteUrl()
    }
    if (href.startsWith('http')) return href
    return `${getClientSiteUrl()}${href.startsWith('/') ? href : `/${href}`}`
  }

  async function handleShare() {
    const url = resolveUrl()
    const result = await sharePageLink(url, title, text)
    if (result === 'copied') {
      showToast('链接已复制，粘贴到微信即可看到预览卡片')
    } else if (result === false) {
      showToast('请手动复制地址栏链接')
    }
    // 成功唤起系统分享时不提示，避免按钮区域布局跳动
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
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        className={`${baseClass} ${className}`.trim()}
        style={style}
      >
        {label}
      </button>
      <AnimatePresence>{toast && <ShareToast message={toast} />}</AnimatePresence>
    </>
  )
}
