'use client'

import React, { Suspense, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { playNavigate } from '@/lib/sounds'
import { stopAllAudio } from '@/lib/audio-player'
import { IconHome, IconChat, IconGarden, IconStar } from '@/components/icons/nav-icons'

/**
 * 底部导航栏项目配置
 * Phase 1: 首页、学习(对话)、花园、成就
 */
const NAV_ITEMS = [
  { icon: 'home', label: '首页', href: '/child' },
  { icon: 'chat', label: '学习', href: '/child/chat' },
  { icon: 'garden', label: '花园', href: '/child/garden' },
  { icon: 'star', label: '成就', href: '/child/achievements' },
]

/** 导航图标映射 */
const NAV_ICON_MAP: Record<string, React.FC<{ size?: number; active?: boolean }>> = {
  home: IconHome,
  chat: IconChat,
  garden: IconGarden,
  star: IconStar,
}

/**
 * Loading 骨架屏
 */
function ChildLoading() {
  return (
    <div className="min-h-screen watercolor-bg flex flex-col items-center justify-center">
      <div className="text-6xl mb-4 animate-badge-enter">🧚</div>
      <p className="text-muted-brown text-lg animate-text-pop">
        花园精灵正在赶来...
      </p>
    </div>
  )
}

/**
 * 孩子端底部导航栏
 */
function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0"
      style={{
        height: '64px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 50,
        borderTop: '1px solid rgba(58,46,44,0.08)',
      }}
    >
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-around h-full">
          {NAV_ITEMS.map((item) => {
            // 精确匹配首页，前缀匹配其他页面
            const isActive = item.href === '/child'
              ? pathname === '/child'
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => playNavigate()}
                className="flex flex-col items-center justify-center flex-1 touch-target"
              >
                <div className="mb-1">
                  {React.createElement(NAV_ICON_MAP[item.icon], { size: 26, active: isActive })}
                </div>
                <div
                  className="text-xs font-medium"
                  style={{ color: isActive ? '#3A2E2C' : '#8B7355' }}
                >
                  {item.label}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

/**
 * 孩子端布局
 * - 底部固定导航栏
 * - Suspense 加载状态
 * - 预留 ErrorBoundary (error.tsx)
 */
export default function ChildLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)
  const isChatPage = pathname.startsWith('/child/chat')

  // 页面切换时停止所有正在播放的语音
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      stopAllAudio()
      prevPathRef.current = pathname
    }
  }, [pathname])

  return (
    <div className={`watercolor-bg ${isChatPage ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      <Suspense fallback={<ChildLoading />}>
        <main
          className={isChatPage ? 'h-[calc(100dvh-64px)] overflow-hidden' : 'pb-16'}
        >
          {children}
        </main>
      </Suspense>
      <BottomNav />
    </div>
  )
}
