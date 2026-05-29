'use client'

import { useEffect } from 'react'

/** 生产环境注册 Service Worker，提供静态资源缓存与离线兜底页 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] service worker registration failed:', err)
    })
  }, [])

  return null
}
