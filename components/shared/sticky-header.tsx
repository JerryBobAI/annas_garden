'use client'

import Link from 'next/link'

interface StickyHeaderProps {
  /** 返回链接，默认 /child */
  backHref?: string
  /** 小标题 */
  subtitle?: string
  /** 主标题 */
  title: string
  /** 右侧内容（字符串或 ReactNode） */
  right?: React.ReactNode
}

/**
 * 通用顶部固定导航栏
 * 干净的条形 bar，毛玻璃效果，滚动时固定在页面顶部
 */
export function StickyHeader({
  backHref = '/child',
  subtitle,
  title,
  right,
}: StickyHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 mb-4"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(58,46,44,0.08)',
      }}
    >
      <Link
        href={backHref}
        className="text-2xl touch-target flex items-center justify-center w-10"
        style={{ color: '#3A2E2C' }}
      >
        ←
      </Link>
      <div className="text-center flex-1">
        {subtitle && (
          <div className="text-xs" style={{ color: '#8B7355' }}>{subtitle}</div>
        )}
        <div className="text-lg font-semibold" style={{ color: '#3A2E2C' }}>
          {title}
        </div>
      </div>
      <div className="w-10 flex items-center justify-end">
        {right}
      </div>
    </header>
  )
}
