'use client'

import { useEffect } from 'react'

/** 生产环境注册 Service Worker，提供静态资源缓存与离线兜底页 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const path = window.location.pathname
    const isAuthRoute = path.startsWith('/auth')

    // 登录/注册页不启用 SW，避免旧缓存导致 /_next/static CSS 404、页面无样式
    if (isAuthRoute) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => void reg.unregister())
      })
      return
    }

    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] service worker registration failed:', err)
    })
  }, [])

  return null
}
