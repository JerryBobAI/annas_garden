'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { playNavigate } from '@/lib/sounds'

/**
 * 底部导航栏项目配置
 * Phase 1: 首页、学习(对话)、花园、成就
 */
const NAV_ITEMS = [
  { icon: '🏠', label: '首页', href: '/child' },
  { icon: '💬', label: '学习', href: '/child/chat' },
  { icon: '🌳', label: '花园', href: '/child/garden' },
  { icon: '⭐', label: '成就', href: '/child/achievements' },
]

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
                <div className="text-2xl mb-1">{item.icon}</div>
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
  return (
    <div className="min-h-screen watercolor-bg">
      <Suspense fallback={<ChildLoading />}>
        <main className="pb-20">
          {children}
        </main>
      </Suspense>
      <BottomNav />
    </div>
  )
}
